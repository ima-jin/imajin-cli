/**
 * ValidationError - Exception for input validation failures
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
 * - Command argument validation
 * - Configuration validation
 * - Schema validation (Zod integration)
 */

import { BaseException, ErrorContext, RecoveryStrategy } from './BaseException.js';

export interface ValidationErrorDetails {
    field: string;
    value: any;
    expectedType?: string;
    constraints?: string[];
    allowedValues?: any[];
}

/**
 * Exception thrown when input validation fails
 */
export class ValidationError extends BaseException {
    public readonly validationDetails: ValidationErrorDetails[];

    constructor(
        message: string,
        validationDetails: ValidationErrorDetails[] = [],
        context: ErrorContext = {}
    ) {
        const recoveryStrategy: RecoveryStrategy = {
            type: 'manual',
            manualSteps: ValidationError.generateManualSteps(validationDetails)
        };

        super(
            message,
            'VALIDATION_ERROR',
            'medium',
            'validation',
            false, // Not automatically recoverable
            ValidationError.generateUserMessage(validationDetails),
            { validationDetails },
            context,
            recoveryStrategy
        );

        this.validationDetails = validationDetails;
    }

    /**
     * Generate user-friendly message from validation details
     */
    private static generateUserMessage(details: ValidationErrorDetails[]): string {
        if (!Array.isArray(details) || details.length === 0) {
            return 'Input validation failed';
        }

        if (details.length === 1) {
            const detail = details[0];
            if (!detail) return 'Input validation failed';

            let message = `Invalid value for '${detail.field}'`;

            if (detail.expectedType) {
                message += ` (expected ${detail.expectedType})`;
            }

            if (detail.allowedValues && detail.allowedValues.length > 0) {
                message += `. Allowed values: ${detail.allowedValues.join(', ')}`;
            }

            return message;
        }

        return `Validation failed for ${details.length} fields: ${details.map(d => d?.field || 'unknown').join(', ')}`;
    }

    /**
     * Generate manual recovery steps
     */
    private static generateManualSteps(details: ValidationErrorDetails[]): string[] {
        const steps: string[] = [];

        if (!Array.isArray(details)) {
            return ['Check input validation requirements'];
        }

        details.forEach(detail => {
            if (detail.allowedValues && detail.allowedValues.length > 0) {
                steps.push(`Set '${detail.field}' to one of: ${detail.allowedValues.join(', ')}`);
            } else if (detail.expectedType) {
                steps.push(`Ensure '${detail.field}' is of type ${detail.expectedType}`);
            } else if (detail.constraints && detail.constraints.length > 0) {
                steps.push(`Fix '${detail.field}': ${detail.constraints.join(', ')}`);
            } else {
                steps.push(`Check the value for '${detail.field}'`);
            }
        });

        return steps;
    }

    /**
     * Create ValidationError from Zod error
     */
    public static fromZodError(zodError: any, context: ErrorContext = {}): ValidationError {
        const validationDetails: ValidationErrorDetails[] = zodError.errors?.map((error: any) => ({
            field: error.path?.join('.') || 'unknown',
            value: error.received,
            expectedType: error.expected,
            constraints: [error.message]
        })) || [];

        return new ValidationError(
            `Validation failed: ${zodError.message}`,
            validationDetails,
            { ...context, zodError }
        );
    }

    /**
     * Create ValidationError for missing required field
     */
    public static missingRequired(field: string, context: ErrorContext = {}): ValidationError {
        return new ValidationError(
            `Missing required field: ${field}`,
            [{
                field,
                value: undefined,
                constraints: ['Field is required']
            }],
            context
        );
    }

    /**
     * Create ValidationError for invalid value
     */
    public static invalidValue(
        field: string,
        value: any,
        allowedValues?: any[],
        context: ErrorContext = {}
    ): ValidationError {
        return new ValidationError(
            `Invalid value for field: ${field}`,
            [{
                field,
                value,
                ...(allowedValues && { allowedValues }),
                constraints: allowedValues ? [`Must be one of: ${allowedValues.join(', ')}`] : ['Invalid value']
            }],
            context
        );
    }

    /**
     * Create ValidationError for type mismatch
     */
    public static typeMismatch(
        field: string,
        value: any,
        expectedType: string,
        context: ErrorContext = {}
    ): ValidationError {
        return new ValidationError(
            `Type mismatch for field: ${field}`,
            [{
                field,
                value,
                expectedType,
                constraints: [`Expected ${expectedType}, got ${typeof value}`]
            }],
            context
        );
    }
} 