/**
 * Logger - Centralized logging service with multiple transports
 * 
 * @package     @imajin/cli
 * @subpackage  logging
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 * @updated      2025-07-03
 *
 * @see        docs/logging.md
 * 
 * Integration Points:
 * - Winston logger configuration
 * - Console and file transports
 * - JSON structured logging for debugging
 * - Real-time log streaming for development
 * - Monitoring integration
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { LoggerConfig, LogLevel, defaultConfig } from './LoggerConfig.js';
import { JsonFormatter } from './formatters/JsonFormatter.js';
import { MonitoringTransport } from './transports/MonitoringTransport.js';

export interface LogContext {
    service?: string;
    command?: string;
    correlationId?: string;
    [key: string]: any;
}

export class Logger {
    private logger!: winston.Logger; // Using definite assignment assertion
    private readonly config: LoggerConfig;
    private correlationId: string;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
        this.correlationId = uuidv4();
        this.initializeLogger();
    }

    private initializeLogger(): void {
        const transports: winston.transport[] = [];

        // Add configured transports
        for (const transportConfig of this.config.transports) {
            switch (transportConfig.type) {
                case 'console':
                    transports.push(new winston.transports.Console({
                        level: transportConfig.level || this.config.level,
                        format: winston.format.combine(
                            winston.format.colorize({ all: this.config.enableColors }),
                            winston.format.simple(),
                            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                                let output = `${timestamp} [${level}]: ${message}`;
                                if (Object.keys(meta).length > 0) {
                                    output += ` ${JSON.stringify(meta)}`;
                                }
                                return output;
                            })
                        ),
                    }));
                    break;

                case 'file':
                    if (transportConfig.options?.filename) {
                        transports.push(new winston.transports.File({
                            level: transportConfig.level || this.config.level,
                            filename: transportConfig.options.filename,
                            format: JsonFormatter.format(),
                        }));
                    }
                    break;

                case 'stream':
                    if (transportConfig.options?.stream) {
                        transports.push(new winston.transports.Stream({
                            level: transportConfig.level || this.config.level,
                            stream: transportConfig.options.stream,
                            format: JsonFormatter.format(),
                        }));
                    }
                    break;
            }
        }

        // Add monitoring transport if enabled
        if (this.config.monitoring?.enabled) {
            transports.push(new MonitoringTransport(this.config));
        }

        this.logger = winston.createLogger({
            level: this.config.level,
            format: JsonFormatter.format(),
            defaultMeta: {
                correlationId: this.correlationId,
                ...this.config.defaultContext,
            },
            transports,
        });
    }

    public debug(message: string, context?: LogContext): void {
        this.logger.debug(message, { ...context, correlationId: this.correlationId });
    }

    public info(message: string, context?: LogContext): void {
        this.logger.info(message, { ...context, correlationId: this.correlationId });
    }

    public warn(message: string, context?: LogContext): void {
        this.logger.warn(message, { ...context, correlationId: this.correlationId });
    }

    public error(message: string, error?: Error, context?: LogContext): void {
        this.logger.error(message, {
            error: error?.message,
            stack: error?.stack,
            ...context,
            correlationId: this.correlationId,
        });
    }

    public log(level: LogLevel, message: string, context?: LogContext): void {
        this.logger.log(level, message, { ...context, correlationId: this.correlationId });
    }

    /**
     * Create a child logger with persistent context
     */
    public child(context: LogContext): Logger {
        const child = new Logger(this.config);
        child.logger = this.logger.child({
            ...context,
            correlationId: this.correlationId,
        });
        return child;
    }

    /**
     * Log command execution start
     */
    public commandStart(command: string, args: any[], context?: LogContext): void {
        this.info(`Command started: ${command}`, {
            command,
            arguments: args,
            ...context,
        });
    }

    /**
     * Log command execution completion
     */
    public commandComplete(command: string, duration: number, context?: LogContext): void {
        this.info(`Command completed: ${command} (${duration}ms)`, {
            command,
            duration,
            ...context,
        });
    }

    /**
     * Log command execution error
     */
    public commandError(command: string, error: Error, context?: LogContext): void {
        this.error(`Command failed: ${command}`, error, {
            command,
            ...context,
        });
    }

    /**
     * Get the current correlation ID
     */
    public getCorrelationId(): string {
        return this.correlationId;
    }

    /**
     * Set a new correlation ID
     */
    public setCorrelationId(id: string): void {
        this.correlationId = id;
    }

    /**
     * Get the underlying Winston logger instance
     */
    public getWinstonLogger(): winston.Logger {
        return this.logger;
    }
} 