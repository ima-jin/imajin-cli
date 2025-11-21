/**
 * ErrorHandler - Global error handling system
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Application bootstrap error handling
 * - Command execution error handling
 * - Service provider error handling
 */

import { EventEmitter } from 'node:events';
import { BaseException } from '../exceptions/BaseException.js';
import { SystemError } from '../exceptions/SystemError.js';
import { ValidationError } from '../exceptions/ValidationError.js';
import { Logger } from '../logging/Logger.js';

export interface ErrorHandlerOptions {
    enableConsoleOutput: boolean;
    enableLogging: boolean;
    enableEventEmission: boolean;
    exitOnCritical: boolean;
    jsonOutput: boolean;
    verbose: boolean;
}

export interface ErrorReport {
    error: BaseException;
    handled: boolean;
    recoveryAttempted: boolean;
    timestamp: Date;
    context: any;
}

/**
 * Global error handler for the imajin-cli system
 * Provides centralized error processing, logging, and recovery
 */
export class ErrorHandler extends EventEmitter {
    private options: ErrorHandlerOptions;
    private errorHistory: ErrorReport[] = [];
    private readonly maxHistorySize = 100;
    private readonly logger: Logger;

    constructor(options: Partial<ErrorHandlerOptions> = {}) {
        super();

        this.options = {
            enableConsoleOutput: true,
            enableLogging: true,
            enableEventEmission: true,
            exitOnCritical: true,
            jsonOutput: false,
            verbose: false,
            ...options
        };

        this.logger = new Logger({ level: 'debug' });
    }

    /**
     * Handle any error and provide appropriate response
     */
    public async handleError(error: Error | BaseException, context: any = {}): Promise<ErrorReport> {
        // Convert regular errors to BaseException
        const imajinException = this.normalizeError(error, context);

        // Create error report
        const report: ErrorReport = {
            error: imajinException,
            handled: false,
            recoveryAttempted: false,
            timestamp: new Date(),
            context
        };

        try {
            // Log error if enabled (do this first, before any event emission)
            if (this.options.enableLogging) {
                await this.logError(imajinException, context);
            }

            // Display error to user if enabled
            if (this.options.enableConsoleOutput) {
                this.displayError(imajinException);
            }

            // Attempt recovery if possible
            if (imajinException.recoverable) {
                report.recoveryAttempted = await this.attemptRecovery(imajinException, context);
            }

            report.handled = true;

            // Store in history
            this.addToHistory(report);

            // Emit error event if enabled (renamed to avoid Node.js 'error' event special behavior)
            // Note: Using 'errorHandled' instead of 'error' to prevent unhandled error exceptions
            if (this.options.enableEventEmission) {
                this.emit('errorHandled', report);
            }

            // Exit on critical errors if configured
            if (this.options.exitOnCritical && imajinException.severity === 'critical') {
                this.handleCriticalError(imajinException);
            }

        } catch (handlerError) {
            // Meta-error: error in error handler
            // Only log to console to avoid potential infinite loops
            console.error('Error in error handler:', handlerError);
            report.handled = false;
        }

        return report;
    }

    /**
     * Convert regular Error to BaseException
     */
    private normalizeError(error: Error | BaseException, context: any): BaseException {
        if (error instanceof BaseException) {
            // Only create new exception with context if there's actually context to add
            if (context && Object.keys(context).length > 0) {
                return error.withContext(context);
            }
            return error;
        }

        // Convert common Node.js errors to appropriate exceptions
        if (error.message.includes('ENOENT')) {
            const path = this.extractPathFromError(error.message);
            return SystemError.fileNotFound(path, { originalError: error, ...context });
        }

        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
            const resource = error.message ?? 'system resource';
            return SystemError.permissionDenied(resource, { originalError: error, ...context });
        }

        if (error.name === 'ValidationError' || error.message.includes('validation')) {
            return new ValidationError(error.message, [], { originalError: error, ...context });
        }

        // Default system error for unknown errors
        return new SystemError(
            error.message,
            { type: 'process_error' },
            { originalError: error, ...context }
        );
    }

    /**
 * Extract file path from error message
 */
    private extractPathFromError(message: string): string {
        const match = /ENOENT: no such file or directory, open '([^']+)'/.exec(message);
        return match?.[1] ?? 'unknown file';
    }

    /**
     * Display error to user
     */
    private displayError(error: BaseException): void {
        // Log for tracking
        this.logger.error('Displaying error to user', error, {
            severity: error.severity,
            code: error.code,
            recoverable: error.recoverable
        });

        if (this.options.jsonOutput) {
            console.error(JSON.stringify(error.toJSON(), null, 2));
            return;
        }

        console.error(error.getFormattedError());

        if (this.options.verbose) {
            console.error('\nTechnical Details:');
            console.error(JSON.stringify(error.technicalDetails, null, 2));

            if (error.metadata.stackTrace) {
                console.error('\nStack Trace:');
                console.error(error.metadata.stackTrace);
            }
        }
    }

    /**
     * Log error with integrated logging system
     */
    private async logError(error: BaseException, context: any): Promise<void> {
        const logLevel = this.severityToLogLevel(error.severity) as any;

        this.logger.log(logLevel, `Error handled: ${error.message}`, {
            type: 'error_handled',
            error: {
                name: error.name,
                message: error.message,
                severity: error.severity,
                code: error.code,
                category: error.category,
                technicalDetails: error.technicalDetails,
                userMessage: error.userMessage,
                recoveryStrategy: error.recoveryStrategy,
                metadata: error.metadata,
            },
            context,
            correlationId: error.metadata.requestId || this.logger.getCorrelationId(),
        });

        // Also emit event for backward compatibility
        this.emit('log', {
            level: this.severityToLogLevel(error.severity),
            message: error.message,
            error: error.toJSON(),
            context
        });
    }

    /**
     * Convert error severity to log level
     */
    private severityToLogLevel(severity: string): string {
        switch (severity) {
            case 'critical': return 'fatal';
            case 'high': return 'error';
            case 'medium': return 'warn';
            case 'low': return 'info';
            default: return 'error';
        }
    }

    /**
     * Attempt error recovery
     */
    private async attemptRecovery(error: BaseException, context: any): Promise<boolean> {
        const { recoveryStrategy } = error;

        switch (recoveryStrategy.type) {
            case 'retry':
                return await this.attemptRetry(error, context);

            case 'fallback':
                return this.attemptFallback(error, context);

            case 'skip':
                this.logger.info('Skipping failed operation', { errorCode: error.code });
                console.log('⚠️  Skipping failed operation and continuing...');
                return true;

            case 'manual':
                this.logger.info('Manual recovery required', { errorCode: error.code });
                this.displayManualRecoveryInstructions(error);
                return false;

            default:
                return false;
        }
    }

    /**
     * Attempt retry recovery
     */
    private async attemptRetry(error: BaseException, context: any): Promise<boolean> {
        const { originalOperation } = context;

        if (!originalOperation || typeof originalOperation !== 'function') {
            return false;
        }

        const maxAttempts = error.recoveryStrategy.maxAttempts || 3;
        let attempt = 1;

        while (attempt <= maxAttempts) {
            this.logger.info('Retrying operation', { attempt, maxAttempts, errorCode: error.code });
            console.log(`🔄 Retrying operation (attempt ${attempt}/${maxAttempts})...`);

            // Wait for backoff delay
            const delay = error.getRetryDelay(attempt - 1);
            await this.sleep(delay);

            try {
                await originalOperation();
                this.logger.info('Operation succeeded on retry', { attempt, errorCode: error.code });
                console.log('✅ Operation succeeded on retry');
                return true;
            } catch (retryError) {
                // Retry attempt failed - log and continue if attempts remain
                this.logger.warn('Retry attempt failed', {
                    attempt,
                    maxAttempts,
                    errorCode: error.code,
                    retryError: retryError instanceof Error ? retryError.message : String(retryError)
                });
                if (attempt === maxAttempts) {
                    this.logger.error('All retry attempts failed', error);
                    console.log('❌ All retry attempts failed');
                    return false;
                }
                attempt++;
            }
        }

        return false;
    }

    /**
     * Attempt fallback recovery
     */
    private attemptFallback(error: BaseException, context: any): boolean {
        const { fallbackOperation } = context;

        if (!fallbackOperation || typeof fallbackOperation !== 'function') {
            this.logger.warn('No fallback available', { errorCode: error.code });
            console.log('⚠️  No fallback available');
            return false;
        }

        try {
            this.logger.info('Attempting fallback operation', { errorCode: error.code });
            console.log('🔄 Attempting fallback operation...');
            fallbackOperation();
            this.logger.info('Fallback operation succeeded', { errorCode: error.code });
            console.log('✅ Fallback operation succeeded');
            return true;
        } catch (fallbackError) {
            this.logger.error('Fallback operation failed', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
            console.log('❌ Fallback operation failed');
            return false;
        }
    }

    /**
     * Display manual recovery instructions
     */
    private displayManualRecoveryInstructions(error: BaseException): void {
        if (!error.recoveryStrategy.manualSteps || error.recoveryStrategy.manualSteps.length === 0) {
            return;
        }

        console.log('\n💡 To fix this issue:');
        for (const [index, step] of error.recoveryStrategy.manualSteps.entries()) {
            console.log(`   ${index + 1}. ${step}`);
        }
        console.log('');
    }

    /**
     * Handle critical errors
     */
    private handleCriticalError(error: BaseException): void {
        this.logger.error('Critical error - Application will exit', error);
        console.error('\n🚨 CRITICAL ERROR - Application will exit');
        console.error(error.getFormattedError());

        this.emit('critical-error', error);

        // Allow some time for cleanup
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }

    /**
     * Add error to history
     */
    private addToHistory(report: ErrorReport): void {
        this.errorHistory.push(report);

        // Keep history size manageable
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * Get error history
     */
    public getErrorHistory(): ErrorReport[] {
        return [...this.errorHistory];
    }

    /**
     * Get recent errors
     */
    public getRecentErrors(count: number = 10): ErrorReport[] {
        return this.errorHistory.slice(-count);
    }

    /**
     * Clear error history
     */
    public clearHistory(): void {
        this.errorHistory = [];
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set error handler options
     */
    public setOptions(options: Partial<ErrorHandlerOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get current options
     */
    public getOptions(): ErrorHandlerOptions {
        return { ...this.options };
    }
} 