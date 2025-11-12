/**
 * Exception System Exports
 * 
 * @package     @imajin/cli
 * @subpackage  exceptions
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

// Base exception and types
export {
    BaseException
} from './BaseException.js';
export type {
    ErrorCategory, ErrorContext, ErrorMetadata, ErrorSeverity, RecoveryStrategy
} from './BaseException.js';

// Specific exception classes
export { ApiError } from './ApiError.js';
export type { ApiErrorDetails } from './ApiError.js';
export { AuthenticationError } from './AuthenticationError.js';
export type { AuthErrorDetails, AuthErrorType } from './AuthenticationError.js';
export { SystemError } from './SystemError.js';
export type { SystemErrorDetails, SystemErrorType } from './SystemError.js';
export { ValidationError } from './ValidationError.js';
export type { ValidationErrorDetails } from './ValidationError.js';

// Import for utility class
import { BaseException } from './BaseException.js';
import type { ErrorCategory, ErrorContext, ErrorSeverity } from './BaseException.js';
import { SystemError } from './SystemError.js';

// Exception utilities and helpers
export class ExceptionUtils {
    /**
     * Check if error is an imajin exception
     */
    static isImajinException(error: any): error is BaseException {
        return error instanceof BaseException;
    }

    /**
     * Convert any error to BaseException
     */
    static normalize(error: any, context: ErrorContext = {}): BaseException {
        if (error instanceof BaseException) {
            return error.withContext(context);
        }

        if (error instanceof Error) {
            // Handle common Node.js errors
            if (error.message.includes('ENOENT')) {
                return SystemError.fileNotFound('unknown', { originalError: error, ...context });
            }

            if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
                return SystemError.permissionDenied('system resource', { originalError: error, ...context });
            }

            return new SystemError(
                error.message,
                { type: 'process_error' },
                { originalError: error, ...context }
            );
        }

        // Handle string errors
        if (typeof error === 'string') {
            return new SystemError(error, { type: 'process_error' }, context);
        }

        // Handle unknown errors
        return new SystemError(
            'Unknown error occurred',
            { type: 'process_error' },
            { originalError: error, ...context }
        );
    }

    /**
     * Get error severity number for sorting
     */
    static getSeverityLevel(severity: ErrorSeverity): number {
        switch (severity) {
            case 'low': return 1;
            case 'medium': return 2;
            case 'high': return 3;
            case 'critical': return 4;
            default: return 2;
        }
    }

    /**
     * Filter errors by severity
     */
    static filterBySeverity(
        errors: BaseException[],
        minSeverity: ErrorSeverity
    ): BaseException[] {
        const minLevel = this.getSeverityLevel(minSeverity);
        return errors.filter(error => this.getSeverityLevel(error.severity) >= minLevel);
    }

    /**
     * Group errors by category
     */
    static groupByCategory(errors: BaseException[]): Record<ErrorCategory, BaseException[]> {
        const groups: Partial<Record<ErrorCategory, BaseException[]>> = {};

        errors.forEach(error => {
            groups[error.category] ??= [];
            groups[error.category]!.push(error);
        });

        return groups as Record<ErrorCategory, BaseException[]>;
    }

    /**
     * Get recoverable errors
     */
    static getRecoverable(errors: BaseException[]): BaseException[] {
        return errors.filter(error => error.recoverable);
    }

    /**
     * Convert errors to JSON for LLM consumption
     */
    static toJsonArray(errors: BaseException[]): object[] {
        return errors.map(error => error.toJSON());
    }
} 