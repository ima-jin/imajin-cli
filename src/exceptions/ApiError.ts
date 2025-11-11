/**
 * ApiError - Exception for external API failures
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
 * - Service provider API calls
 * - HTTP client error handling
 * - Rate limiting and retry logic
 */

import { BaseException, ErrorContext, RecoveryStrategy } from './BaseException.js';

export interface ApiErrorDetails {
    statusCode?: number;
    statusText?: string;
    endpoint?: string;
    method?: string;
    requestId?: string;
    responseBody?: any;
    headers?: Record<string, string>;
    retryAfter?: number;
}

/**
 * Exception thrown when external API calls fail
 */
export class ApiError extends BaseException {
    public readonly apiDetails: ApiErrorDetails;

    constructor(
        message: string,
        apiDetails: ApiErrorDetails = {},
        context: ErrorContext = {}
    ) {
        const recoveryStrategy = ApiError.determineRecoveryStrategy(apiDetails);
        const severity = ApiError.determineSeverity(apiDetails);

        super(
            message,
            'API_ERROR',
            severity,
            'api',
            ApiError.isRecoverable(apiDetails),
            ApiError.generateUserMessage(apiDetails),
            apiDetails,
            context,
            recoveryStrategy
        );

        this.apiDetails = apiDetails;
    }

    /**
     * Determine recovery strategy based on API response
     */
    private static determineRecoveryStrategy(details: ApiErrorDetails): RecoveryStrategy {
        const { statusCode, retryAfter } = details;

        // Rate limiting - retry with backoff
        if (statusCode === 429) {
            return {
                type: 'retry',
                maxAttempts: 3,
                backoffMs: retryAfter ? retryAfter * 1000 : 5000
            };
        }

        // Server errors - retry with exponential backoff
        if (statusCode && statusCode >= 500) {
            return {
                type: 'retry',
                maxAttempts: 3,
                backoffMs: 2000
            };
        }

        // Timeout errors - retry
        if (statusCode === 408 || statusCode === 504) {
            return {
                type: 'retry',
                maxAttempts: 2,
                backoffMs: 1000
            };
        }

        // Client errors - manual intervention required
        if (statusCode && statusCode >= 400 && statusCode < 500) {
            return {
                type: 'manual',
                manualSteps: ApiError.generateManualSteps(details)
            };
        }

        return { type: 'none' };
    }

    /**
     * Determine error severity based on status code
     */
    private static determineSeverity(details: ApiErrorDetails): 'low' | 'medium' | 'high' | 'critical' {
        const { statusCode } = details;

        if (!statusCode) {
return 'medium';
}

        if (statusCode >= 500) {
return 'high';
}
        if (statusCode === 429) {
return 'medium';
}
        if (statusCode === 401 || statusCode === 403) {
return 'high';
}
        if (statusCode >= 400) {
return 'medium';
}

        return 'low';
    }

    /**
     * Check if error is recoverable
     */
    private static isRecoverable(details: ApiErrorDetails): boolean {
        const { statusCode } = details;

        if (!statusCode) {
return false;
}

        // Retryable status codes
        return statusCode === 429 || statusCode >= 500 || statusCode === 408 || statusCode === 504;
    }

    /**
     * Generate user-friendly message
     */
    private static generateUserMessage(details: ApiErrorDetails): string {
        const { statusCode, endpoint, method } = details;

        if (statusCode === 401) {
            return 'Authentication failed. Please check your credentials.';
        }

        if (statusCode === 403) {
            return 'Access denied. You don\'t have permission for this operation.';
        }

        if (statusCode === 404) {
            return 'Resource not found. Please check the request details.';
        }

        if (statusCode === 429) {
            return 'Rate limit exceeded. Please wait before retrying.';
        }

        if (statusCode && statusCode >= 500) {
            return 'Service temporarily unavailable. Please try again later.';
        }

        if (endpoint && method) {
            return `API request failed: ${method} ${endpoint}`;
        }

        return 'API request failed';
    }

    /**
     * Generate manual recovery steps
     */
    private static generateManualSteps(details: ApiErrorDetails): string[] {
        const { statusCode, endpoint } = details;
        const steps: string[] = [];

        switch (statusCode) {
            case 401:
                steps.push(
                    'Check your API credentials',
                    'Verify your authentication token is valid',
                    'Run: imajin auth login'
                );
                break;

            case 403:
                steps.push(
                    'Verify your account has the required permissions',
                    'Contact your administrator if needed'
                );
                break;

            case 404:
                if (endpoint) {
                    steps.push(`Verify the resource exists: ${endpoint}`);
                }
                steps.push('Check the request parameters');
                break;

            case 422:
                steps.push(
                    'Review the request data for validation errors',
                    'Check the API documentation for required fields'
                );
                break;

            default:
                steps.push(
                    'Review the request parameters',
                    'Check the API documentation'
                );
                break;
        }

        return steps;
    }

    /**
     * Create ApiError from HTTP response
     */
    public static fromResponse(
        response: any,
        endpoint: string,
        method: string,
        context: ErrorContext = {}
    ): ApiError {
        const apiDetails: ApiErrorDetails = {
            statusCode: response.status,
            statusText: response.statusText,
            endpoint,
            method,
            requestId: response.headers?.['x-request-id'] || response.headers?.['request-id'],
            responseBody: response.data || response.body,
            headers: response.headers,
            ...(response.headers?.['retry-after'] && { retryAfter: Number.parseInt(response.headers['retry-after']) })
        };

        const message = `API request failed: ${method} ${endpoint} (${response.status})`;

        return new ApiError(message, apiDetails, context);
    }

    /**
     * Create ApiError for network issues
     */
    public static networkError(
        endpoint: string,
        method: string,
        error: Error,
        context: ErrorContext = {}
    ): ApiError {
        const apiDetails: ApiErrorDetails = {
            endpoint,
            method
        };

        const recoveryStrategy: RecoveryStrategy = {
            type: 'retry',
            maxAttempts: 3,
            backoffMs: 2000
        };

        const apiError = new ApiError(
            `Network error: ${error.message}`,
            apiDetails,
            { ...context, networkError: error }
        );

        // Override recovery strategy for network errors
        (apiError as any).recoveryStrategy = recoveryStrategy;

        return apiError;
    }

    /**
     * Create ApiError for timeout
     */
    public static timeout(
        endpoint: string,
        method: string,
        timeoutMs: number,
        context: ErrorContext = {}
    ): ApiError {
        const apiDetails: ApiErrorDetails = {
            statusCode: 408,
            endpoint,
            method
        };

        return new ApiError(
            `Request timeout after ${timeoutMs}ms: ${method} ${endpoint}`,
            apiDetails,
            context
        );
    }
} 