/**
 * ErrorRecovery - Automated error recovery system
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Error handler recovery coordination
 * - Service provider error recovery
 * - Command execution recovery
 */

import { EventEmitter } from 'events';
import { ApiError } from '../exceptions/ApiError.js';
import { AuthenticationError } from '../exceptions/AuthenticationError.js';
import { BaseException } from '../exceptions/BaseException.js';
import { SystemError } from '../exceptions/SystemError.js';
import { Logger } from '../logging/Logger.js';

export interface RecoveryContext {
    originalOperation?: () => Promise<any>;
    fallbackOperation?: () => Promise<any>;
    retryCount?: number;
    maxRetries?: number;
    lastError?: BaseException;
    userData?: any;
}

export interface RecoveryResult {
    success: boolean;
    method: 'retry' | 'fallback' | 'manual' | 'skip' | 'none';
    attempts: number;
    finalError?: BaseException;
    message: string;
}

/**
 * Error recovery system that attempts to automatically recover from failures
 */
export class ErrorRecovery extends EventEmitter {
    private recoveryHistory: Map<string, RecoveryResult[]> = new Map();
    private readonly maxHistoryPerError = 10;
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger({ level: 'debug' });
    }

    /**
     * Attempt to recover from an error
     */
    public async attemptRecovery(
        error: BaseException,
        context: RecoveryContext = {}
    ): Promise<RecoveryResult> {
        const result: RecoveryResult = {
            success: false,
            method: 'none',
            attempts: 0,
            message: 'No recovery attempted'
        };

        try {
            this.emit('recovery-start', error, context);

            // Determine recovery method based on error type and strategy
            const strategy = error.recoveryStrategy;
            result.method = strategy.type as any;

            switch (strategy.type) {
                case 'retry':
                    Object.assign(result, await this.attemptRetryRecovery(error, context));
                    break;

                case 'fallback':
                    Object.assign(result, await this.attemptFallbackRecovery(error, context));
                    break;

                case 'skip':
                    result.success = true;
                    result.message = 'Operation skipped';
                    break;

                case 'manual':
                    result.message = 'Manual intervention required';
                    this.displayManualInstructions(error);
                    break;

                default:
                    result.message = 'No automatic recovery available';
                    break;
            }

            // Store recovery history
            this.recordRecovery(error.code, result);

            this.emit('recovery-complete', error, result);

        } catch (recoveryError) {
            result.finalError = recoveryError instanceof BaseException
                ? recoveryError
                : new SystemError('Recovery system failed', { type: 'process_error' });
            result.message = `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`;

            this.emit('recovery-error', error, recoveryError);
        }

        return result;
    }

    /**
     * Attempt retry-based recovery
     */
    private async attemptRetryRecovery(
        error: BaseException,
        context: RecoveryContext
    ): Promise<Partial<RecoveryResult>> {
        const maxAttempts = context.maxRetries || error.recoveryStrategy.maxAttempts || 3;
        const operation = context.originalOperation;

        if (!operation) {
            return {
                success: false,
                message: 'No operation provided for retry',
                attempts: 0
            };
        }

        let attempt = 1;
        let lastError: BaseException = error;

        while (attempt <= maxAttempts) {
            this.emit('retry-attempt', attempt, maxAttempts, error);

            // Calculate delay with exponential backoff
            const delay = this.calculateRetryDelay(error, attempt);
            if (delay > 0) {
                await this.sleep(delay);
            }

            try {
                await operation();

                this.emit('retry-success', attempt, error);
                return {
                    success: true,
                    message: `Operation succeeded on attempt ${attempt}`,
                    attempts: attempt
                };

            } catch (retryError) {
                lastError = retryError instanceof BaseException
                    ? retryError
                    : new SystemError('Retry operation failed', { type: 'process_error' });

                this.emit('retry-failed', attempt, lastError);

                // Check if we should continue retrying
                if (!this.shouldContinueRetry(lastError, attempt, maxAttempts)) {
                    break;
                }

                attempt++;
            }
        }

        return {
            success: false,
            message: `All ${maxAttempts} retry attempts failed`,
            attempts: attempt - 1,
            finalError: lastError
        };
    }

    /**
     * Attempt fallback recovery
     */
    private async attemptFallbackRecovery(
        error: BaseException,
        context: RecoveryContext
    ): Promise<Partial<RecoveryResult>> {
        const fallbackOperation = context.fallbackOperation;

        if (!fallbackOperation) {
            return {
                success: false,
                message: 'No fallback operation provided',
                attempts: 1
            };
        }

        try {
            this.emit('fallback-attempt', error);

            await fallbackOperation();

            this.emit('fallback-success', error);
            return {
                success: true,
                message: 'Fallback operation succeeded',
                attempts: 1
            };

        } catch (fallbackError) {
            const finalError = fallbackError instanceof BaseException
                ? fallbackError
                : new SystemError('Fallback operation failed', { type: 'process_error' });

            this.emit('fallback-failed', error, finalError);

            return {
                success: false,
                message: 'Fallback operation failed',
                attempts: 1,
                finalError
            };
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay(error: BaseException, attempt: number): number {
        const baseDelay = error.recoveryStrategy.backoffMs || 1000;

        // For API errors, respect rate limiting headers
        if (error instanceof ApiError && error.apiDetails.retryAfter) {
            return error.apiDetails.retryAfter * 1000;
        }

        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter

        return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    }

    /**
     * Determine if retry should continue
     */
    private shouldContinueRetry(
        error: BaseException,
        currentAttempt: number,
        maxAttempts: number
    ): boolean {
        // Don't retry if we've reached max attempts
        if (currentAttempt >= maxAttempts) {
            return false;
        }

        // Don't retry non-recoverable errors
        if (!error.recoverable) {
            return false;
        }

        // Special handling for specific error types
        if (error instanceof ApiError) {
            // Don't retry 4xx errors (except 429)
            const statusCode = error.apiDetails.statusCode;
            if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
                return false;
            }
        }

        if (error instanceof AuthenticationError) {
            // Don't retry auth errors that need manual intervention
            if (['invalid_credentials', 'insufficient_permissions'].includes(error.authDetails.type)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Display manual recovery instructions
     */
    private displayManualInstructions(error: BaseException): void {
        const steps = error.recoveryStrategy.manualSteps;

        if (!steps || steps.length === 0) {
            this.logger.info('Manual intervention required (no specific steps available)', { errorCode: error.code });
            return;
        }

        this.logger.info('Displaying manual recovery instructions', {
            errorCode: error.code,
            stepCount: steps.length
        });

        // Add error-specific additional guidance
        if (error instanceof AuthenticationError) {
            const instructions = error.getLoginInstructions();
            this.logger.info('Authentication help provided', {
                errorCode: error.code,
                instructionCount: instructions.length
            });
        }

        if (error instanceof SystemError) {
            if (error.systemDetails.type === 'dependency_missing') {
                this.logger.info('System dependency help provided', { errorCode: error.code });
            }
        }
    }

    /**
     * Record recovery attempt in history
     */
    private recordRecovery(errorCode: string, result: RecoveryResult): void {
        if (!this.recoveryHistory.has(errorCode)) {
            this.recoveryHistory.set(errorCode, []);
        }

        const history = this.recoveryHistory.get(errorCode)!;
        history.push(result);

        // Keep history size manageable
        if (history.length > this.maxHistoryPerError) {
            history.shift();
        }
    }

    /**
     * Get recovery history for error code
     */
    public getRecoveryHistory(errorCode: string): RecoveryResult[] {
        return this.recoveryHistory.get(errorCode) || [];
    }

    /**
     * Get success rate for error code
     */
    public getSuccessRate(errorCode: string): number {
        const history = this.getRecoveryHistory(errorCode);
        if (history.length === 0) {
return 0;
}

        const successCount = history.filter(r => r.success).length;
        return successCount / history.length;
    }

    /**
     * Check if error type has been successfully recovered before
     */
    public hasSuccessfulRecovery(errorCode: string): boolean {
        const history = this.getRecoveryHistory(errorCode);
        return history.some(r => r.success);
    }

    /**
     * Clear recovery history
     */
    public clearHistory(errorCode?: string): void {
        if (errorCode) {
            this.recoveryHistory.delete(errorCode);
        } else {
            this.recoveryHistory.clear();
        }
    }

    /**
     * Get all recovery statistics
     */
    public getStatistics(): Record<string, any> {
        const stats: Record<string, any> = {};

        this.recoveryHistory.forEach((history, errorCode) => {
            const total = history.length;
            const successful = history.filter(r => r.success).length;
            const methods = [...new Set(history.map(r => r.method))];

            stats[errorCode] = {
                total,
                successful,
                successRate: total > 0 ? successful / total : 0,
                methods,
                lastAttempt: history[history.length - 1]?.message
            };
        });

        return stats;
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
 * Create recovery context with operation functions
 */
    public static createContext(
        originalOperation?: () => Promise<any>,
        fallbackOperation?: () => Promise<any>,
        userData?: any
    ): RecoveryContext {
        return {
            ...(originalOperation && { originalOperation }),
            ...(fallbackOperation && { fallbackOperation }),
            userData,
            retryCount: 0
        };
    }
} 