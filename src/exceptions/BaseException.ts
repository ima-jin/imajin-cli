/**
 * BaseException - Foundation class for all imajin-cli exceptions
 * 
 * @package     @imajin/cli
 * @subpackage  exceptions
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Error handling system foundation
 * - LLM-friendly error structure
 * - User experience messaging
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'validation' | 'api' | 'auth' | 'system' | 'user' | 'network' | 'business';

export interface ErrorContext {
    [key: string]: any;
}

export interface RecoveryStrategy {
    type: 'retry' | 'fallback' | 'skip' | 'manual' | 'none';
    maxAttempts?: number;
    backoffMs?: number;
    fallbackAction?: string;
    manualSteps?: string[];
}

export interface ErrorMetadata {
    timestamp: Date;
    requestId?: string;
    userId?: string;
    command?: string;
    args?: any[];
    options?: any;
    stackTrace?: string;
    innerError?: Error;
}

/**
 * Base exception class for all imajin-cli errors
 * Provides structured error information for users, developers, and LLMs
 */
export abstract class BaseException extends Error {
    public readonly code: string;
    public readonly severity: ErrorSeverity;
    public readonly category: ErrorCategory;
    public readonly recoverable: boolean;
    public readonly userMessage: string;
    public readonly technicalDetails: any;
    public readonly context: ErrorContext;
    public readonly recoveryStrategy: RecoveryStrategy;
    public readonly metadata: ErrorMetadata;

    constructor(
        message: string,
        code: string,
        severity: ErrorSeverity,
        category: ErrorCategory,
        recoverable: boolean = false,
        userMessage?: string,
        technicalDetails?: any,
        context: ErrorContext = {},
        recoveryStrategy: RecoveryStrategy = { type: 'none' }
    ) {
        super(message);

        this.name = this.constructor.name;
        this.code = code;
        this.severity = severity;
        this.category = category;
        this.recoverable = recoverable;
        this.userMessage = userMessage || this.generateUserMessage();
        this.technicalDetails = technicalDetails;
        this.context = context;
        this.recoveryStrategy = recoveryStrategy;
        this.metadata = {
            timestamp: new Date(),
            ...(this.stack && { stackTrace: this.stack }),
            ...this.extractMetadataFromContext(context)
        };

        // Maintain proper prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Generate a user-friendly error message
     */
    protected generateUserMessage(): string {
        return `An error occurred: ${this.message}`;
    }

    /**
     * Extract metadata from context
     */
    private extractMetadataFromContext(context: ErrorContext): Partial<ErrorMetadata> {
        const metadata: Partial<ErrorMetadata> = {};

        if (context.requestId) metadata.requestId = context.requestId;
        if (context.userId) metadata.userId = context.userId;
        if (context.command) metadata.command = context.command;
        if (context.args) metadata.args = context.args;
        if (context.options) metadata.options = context.options;
        if (context.innerError) metadata.innerError = context.innerError;

        return metadata;
    }

    /**
     * Convert exception to JSON for LLM consumption
     */
    public toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            category: this.category,
            recoverable: this.recoverable,
            userMessage: this.userMessage,
            technicalDetails: this.technicalDetails,
            context: this.context,
            recoveryStrategy: this.recoveryStrategy,
            metadata: {
                ...this.metadata,
                timestamp: this.metadata.timestamp.toISOString()
            }
        };
    }

    /**
     * Get formatted error for console display
     */
    public getFormattedError(): string {
        const lines = [
            `❌ ${this.userMessage}`,
            `   Code: ${this.code}`,
            `   Severity: ${this.severity.toUpperCase()}`
        ];

        if (this.recoverable && this.recoveryStrategy.type !== 'none') {
            lines.push(`   Recovery: ${this.getRecoveryInstructions()}`);
        }

        if (this.technicalDetails) {
            lines.push(`   Details: ${JSON.stringify(this.technicalDetails, null, 2)}`);
        }

        return lines.join('\n');
    }

    /**
     * Get recovery instructions for users
     */
    public getRecoveryInstructions(): string {
        switch (this.recoveryStrategy.type) {
            case 'retry':
                return `Try again (max ${this.recoveryStrategy.maxAttempts || 3} attempts)`;
            case 'fallback':
                return `Using fallback: ${this.recoveryStrategy.fallbackAction}`;
            case 'manual':
                return `Manual steps: ${this.recoveryStrategy.manualSteps?.join(', ')}`;
            case 'skip':
                return 'Operation will be skipped';
            default:
                return 'No automatic recovery available';
        }
    }

    /**
     * Check if error should be retried
     */
    public shouldRetry(attemptCount: number = 0): boolean {
        return this.recoverable &&
            this.recoveryStrategy.type === 'retry' &&
            attemptCount < (this.recoveryStrategy.maxAttempts || 3);
    }

    /**
     * Get retry delay in milliseconds
     */
    public getRetryDelay(attemptCount: number): number {
        const baseDelay = this.recoveryStrategy.backoffMs || 1000;
        return baseDelay * Math.pow(2, attemptCount); // Exponential backoff
    }

    /**
     * Create a child exception with additional context
     */
    public withContext(additionalContext: ErrorContext): BaseException {
        const newContext = { ...this.context, ...additionalContext };
        return new (this.constructor as any)(
            this.message,
            this.code,
            this.severity,
            this.category,
            this.recoverable,
            this.userMessage,
            this.technicalDetails,
            newContext,
            this.recoveryStrategy
        );
    }

    /**
     * Create BaseException from any error type
     * Static factory method for backwards compatibility
     */
    public static from(error: any, context: ErrorContext = {}): BaseException {
        // Delegate to ExceptionUtils.normalize for consistent behavior
        const { ExceptionUtils } = require('./index.js');
        return ExceptionUtils.normalize(error, context);
    }
} 