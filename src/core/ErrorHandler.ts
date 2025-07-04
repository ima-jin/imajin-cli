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
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Application bootstrap error handling
 * - Command execution error handling
 * - Service provider error handling
 */

import { EventEmitter } from 'events';
import { BaseException } from '../exceptions/BaseException';
import { SystemError } from '../exceptions/SystemError';
import { ValidationError } from '../exceptions/ValidationError';

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
            // Emit error event if enabled
            if (this.options.enableEventEmission) {
                this.emit('error', imajinException, context);
            }

            // Log error if enabled
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

            // Exit on critical errors if configured
            if (this.options.exitOnCritical && imajinException.severity === 'critical') {
                this.handleCriticalError(imajinException);
            }

        } catch (handlerError) {
            // Meta-error: error in error handler
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
            return error.withContext(context);
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
        const match = message.match(/ENOENT: no such file or directory, open '([^']+)'/);
        return match?.[1] ?? 'unknown file';
    }

    /**
     * Display error to user
     */
    private displayError(error: BaseException): void {
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
        // Import logger dynamically to avoid circular dependencies
        const { Logger } = await import('../logging/Logger');
        const logger = new Logger();

        const logLevel = this.severityToLogLevel(error.severity) as any;
        
        logger.log(logLevel, `Error handled: ${error.message}`, {
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
            correlationId: error.metadata.requestId || logger.getCorrelationId(),
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
                console.log('⚠️  Skipping failed operation and continuing...');
                return true;

            case 'manual':
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
            console.log(`🔄 Retrying operation (attempt ${attempt}/${maxAttempts})...`);

            // Wait for backoff delay
            const delay = error.getRetryDelay(attempt - 1);
            await this.sleep(delay);

            try {
                await originalOperation();
                console.log('✅ Operation succeeded on retry');
                return true;
            } catch (retryError) {
                if (attempt === maxAttempts) {
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
            console.log('⚠️  No fallback available');
            return false;
        }

        try {
            console.log('🔄 Attempting fallback operation...');
            fallbackOperation();
            console.log('✅ Fallback operation succeeded');
            return true;
        } catch (fallbackError) {
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
        error.recoveryStrategy.manualSteps.forEach((step, index) => {
            console.log(`   ${index + 1}. ${step}`);
        });
        console.log('');
    }

    /**
     * Handle critical errors
     */
    private handleCriticalError(error: BaseException): void {
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