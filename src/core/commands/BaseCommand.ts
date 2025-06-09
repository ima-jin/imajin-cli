/**
 * BaseCommand - Abstract base class for all commands
 * 
 * @package     @imajin/cli
 * @subpackage  core/commands
 * @author      VETEZE
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
import type { ICommand } from './CommandManager.js';

export abstract class BaseCommand implements ICommand {
    protected logger: Logger | undefined;

    constructor(logger?: Logger) {
        this.logger = logger;
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
     * Validate command arguments and options
     */
    protected validate(args: any[], options: any): void {
        // Default implementation - can be overridden
    }

    /**
     * Log information
     */
    protected info(message: string, context?: any): void {
        if (this.logger) {
            this.logger.info(message, context);
        } else {
            console.log(message);
        }
    }

    /**
     * Log error
     */
    protected error(message: string, error?: Error, context?: any): void {
        if (this.logger) {
            this.logger.error(message, error, context);
        } else {
            console.error(message, error);
        }
    }

    /**
     * Log warning
     */
    protected warn(message: string, context?: any): void {
        if (this.logger) {
            this.logger.warn(message, context);
        } else {
            console.warn(message);
        }
    }
} 