/**
 * Logger - Centralized logging service with multiple transports
 * 
 * @package     @imajin/cli
 * @subpackage  logging
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/logging.md
 * 
 * Integration Points:
 * - Winston logger configuration
 * - Console and file transports
 * - JSON structured logging for debugging
 * - Real-time log streaming for development
 */

import winston from 'winston';

export interface LogContext {
    service?: string;
    command?: string;
    correlationId?: string;
    [key: string]: any;
}

export class Logger {
    private logger: winston.Logger;

    constructor(level: string = 'info', enableColors: boolean = true) {
        this.logger = winston.createLogger({
            level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                // Console transport with custom formatting
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize({ all: enableColors }),
                        winston.format.simple(),
                        winston.format.printf(({ level, message, timestamp, ...meta }) => {
                            let output = `${timestamp} [${level}]: ${message}`;

                            if (Object.keys(meta).length > 0) {
                                output += ` ${JSON.stringify(meta)}`;
                            }

                            return output;
                        })
                    ),
                }),

                // File transport for persistent logging
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                }),
                new winston.transports.File({
                    filename: 'logs/combined.log',
                }),
            ],
        });
    }

    public debug(message: string, context?: LogContext): void {
        this.logger.debug(message, context);
    }

    public info(message: string, context?: LogContext): void {
        this.logger.info(message, context);
    }

    public warn(message: string, context?: LogContext): void {
        this.logger.warn(message, context);
    }

    public error(message: string, error?: Error, context?: LogContext): void {
        this.logger.error(message, {
            error: error?.message,
            stack: error?.stack,
            ...context
        });
    }

    public log(level: string, message: string, context?: LogContext): void {
        this.logger.log(level, message, context);
    }

    /**
     * Create a child logger with persistent context
     */
    public child(context: LogContext): Logger {
        const child = new Logger();
        child.logger = this.logger.child(context);
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
     * Get the underlying Winston logger instance
     */
    public getWinstonLogger(): winston.Logger {
        return this.logger;
    }
} 