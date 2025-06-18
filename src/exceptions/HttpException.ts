/**
 * HttpException - HTTP-specific exception handling
 * 
 * @package     @imajin/cli
 * @subpackage  exceptions
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 *
 * Integration Points:
 * - Base exception system
 * - HTTP client error handling
 * - Structured error responses
 * - Logging system integration
 */

import { BaseException } from './BaseException.js';

export class HttpException extends BaseException {
    public readonly statusCode: number;
    public readonly url: string | undefined;
    public readonly method: string | undefined;
    public readonly response?: any;

    constructor(
        message: string,
        statusCode: number,
        context?: {
            url?: string;
            method?: string;
            duration?: number;
            retryCount?: number;
            response?: any;
        }
    ) {
        const severity = statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low';
        const recoverable = statusCode >= 500 || statusCode === 408 || statusCode === 429;

        super(
            message,
            'HTTP_ERROR',
            severity,
            'network',
            recoverable,
            `HTTP request failed: ${message}`,
            { statusCode, ...context },
            context || {}
        );

        this.statusCode = statusCode;
        this.url = context?.url || undefined;
        this.method = context?.method || undefined;
        this.response = context?.response;

        // Set the prototype explicitly
        Object.setPrototypeOf(this, HttpException.prototype);
    }

    /**
     * Check if this is a client error (4xx)
     */
    public isClientError(): boolean {
        return this.statusCode >= 400 && this.statusCode < 500;
    }

    /**
     * Check if this is a server error (5xx)
     */
    public isServerError(): boolean {
        return this.statusCode >= 500 && this.statusCode < 600;
    }

    /**
     * Check if this is a timeout error
     */
    public isTimeout(): boolean {
        return this.statusCode === 408 || this.message.toLowerCase().includes('timeout');
    }

    /**
     * Check if this is a rate limit error
     */
    public isRateLimit(): boolean {
        return this.statusCode === 429;
    }

    /**
     * Get HTTP status text
     */
    public getStatusText(): string {
        const statusTexts: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            408: 'Request Timeout',
            409: 'Conflict',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            501: 'Not Implemented',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout'
        };

        return statusTexts[this.statusCode] || 'Unknown Status';
    }

    /**
     * Convert to JSON representation
     */
    public toJSON(): Record<string, any> {
        return {
            ...super.toJSON(),
            statusCode: this.statusCode,
            statusText: this.getStatusText(),
            url: this.url,
            method: this.method,
            isClientError: this.isClientError(),
            isServerError: this.isServerError(),
            isTimeout: this.isTimeout(),
            isRateLimit: this.isRateLimit(),
            response: this.response
        };
    }
} 