/**
 * BaseCommand - Abstract base class for all commands
 * 
 * @package     @imajin/cli
 * @subpackage  core/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Command execution framework
 * - Error handling and logging
 * - Progress tracking and events
 * - Validation and type safety
 */

import type { Logger } from '../../logging/Logger.js';
import { randomBytes } from 'node:crypto';
import { SystemEventType } from '../events/Event.js';
import type { EventManager } from '../events/EventManager.js';
import type { ICommand } from './CommandManager.js';

export abstract class BaseCommand implements ICommand {
    protected logger: Logger | undefined;
    protected eventManager: EventManager | undefined;

    constructor(logger?: Logger, eventManager?: EventManager) {
        this.logger = logger;
        this.eventManager = eventManager;
    }

    /**
     * Command name (must be implemented by subclasses)
     */
    public abstract readonly name: string;

    /**
     * Command description (must be implemented by subclasses)
     */
    public abstract readonly description: string;

    /**
     * Execute the command (must be implemented by subclasses)
     */
    public abstract execute(args: any[], options: any): Promise<any>;

    /**
     * Execute command with event tracking
     */
    public async executeWithEvents(args: any[], options: any): Promise<any> {
        const _startTime = Date.now();

        try {
            // Emit command started event
            await this.emitCommandStarted(args, options);

            // Validate arguments
            this.validate(args, options);

            // Execute the command
            const result = await this.execute(args, options);

            // Emit command completed event
            const duration = Date.now() - _startTime;
            await this.emitCommandCompleted(args, options, result, duration);

            return result;
        } catch (error) {
            // Emit command failed event
            const duration = Date.now() - _startTime;
            await this.emitCommandFailed(args, options, error as Error, duration);
            throw error;
        }
    }

    /**
     * Validate command arguments and options
     */
    protected validate(_args: any[], _options: any): void {
        // Default implementation - can be overridden
    }

    /**
     * Emit progress update event
     */
    protected async emitProgress(
        step: string,
        current: number,
        total: number,
        message?: string,
        data?: any
    ): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.PROGRESS_UPDATED, {
                step,
                current,
                total,
                percent: Math.round((current / total) * 100),
                message,
                data
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Emit error event
     */
    protected async emitError(
        error: Error,
        context?: any,
        severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.ERROR_OCCURRED, {
                error,
                context,
                stack: error.stack,
                severity
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Emit warning event
     */
    protected async emitWarning(
        message: string,
        context?: any
    ): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.WARNING_OCCURRED, {
                message,
                context
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Log information
     */
    protected info(message: string, context?: any): void {
        if (this.logger) {
            this.logger.info(message, context);
        }
    }

    /**
     * Log error
     */
    protected error(message: string, error?: Error, context?: any): void {
        if (this.logger) {
            this.logger.error(message, error, context);
        }
    }

    /**
     * Log warning
     */
    protected warn(message: string, context?: any): void {
        if (this.logger) {
            this.logger.warn(message, context);
        }
    }

    /**
     * Emit command started event
     */
    private async emitCommandStarted(args: any[], options: any): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.COMMAND_STARTED, {
                commandName: this.name,
                args,
                options
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Emit command completed event
     */
    private async emitCommandCompleted(
        args: any[],
        options: any,
        result: any,
        duration: number
    ): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.COMMAND_COMPLETED, {
                commandName: this.name,
                args,
                options,
                result,
                duration
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Emit command failed event
     */
    private async emitCommandFailed(
        args: any[],
        options: any,
        error: Error,
        duration: number
    ): Promise<void> {
        if (this.eventManager) {
            await this.eventManager.emit(SystemEventType.COMMAND_FAILED, {
                commandName: this.name,
                args,
                options,
                error,
                duration
            }, {
                source: `command:${this.name}`,
                correlationId: this.getCorrelationId()
            });
        }
    }

    /**
     * Get correlation ID for event tracking
     */
    private getCorrelationId(): string {
        return `cmd_${this.name}_${Date.now()}_${(()=>{
const b = randomBytes(6); return b.toString("base64").replace(/[^a-z0-9]/gi,"").toLowerCase().substring(0,9);
})()}`;
    }
} 