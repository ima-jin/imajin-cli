/**
 * ApiLogger - Specialized logger for API interactions and remote service calls
 * 
 * @package     @imajin/cli
 * @subpackage  logging
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - HTTP client interceptors
 * - Rate limiting system
 * - Error handling system
 * - Performance monitoring
 * - Retry mechanisms
 */

import { Logger } from './Logger.js';
import { LoggerConfig } from './LoggerConfig.js';

export interface ApiMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    rateLimitHits: number;
    retryAttempts: number;
}

export class ApiLogger extends Logger {
    private apiMetrics: ApiMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        rateLimitHits: 0,
        retryAttempts: 0,
    };

    private responseTimes: number[] = [];

    constructor(config: Partial<LoggerConfig> = {}) {
        super(config);
    }

    /**
     * Log API request start
     */
    public apiRequestStart(method: string, url: string, options: {
        headers?: Record<string, string>;
        body?: any;
        timeout?: number;
        retryAttempt?: number;
    } = {}): void {
        this.apiMetrics.totalRequests++;
        
        if (options.retryAttempt && options.retryAttempt > 0) {
            this.apiMetrics.retryAttempts++;
        }

        this.info(`API Request: ${method} ${url}`, {
            type: 'api_request_start',
            api: {
                method,
                url: this.sanitizeUrl(url),
                headers: this.sanitizeHeaders(options.headers),
                bodySize: options.body ? JSON.stringify(options.body).length : 0,
                timeout: options.timeout,
                retryAttempt: options.retryAttempt,
                correlationId: this.getCorrelationId(),
            },
        });
    }

    /**
     * Log API response
     */
    public apiResponse(method: string, url: string, options: {
        status: number;
        headers?: Record<string, string>;
        body?: any;
        duration: number;
        rateLimitInfo?: {
            remaining: number;
            resetTime: Date;
            retryAfter?: number;
        };
    }): void {
        const isSuccess = options.status < 400;
        
        if (isSuccess) {
            this.apiMetrics.successfulRequests++;
        } else {
            this.apiMetrics.failedRequests++;
        }

        // Track response times
        this.responseTimes.push(options.duration);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift(); // Keep only last 100 response times
        }
        this.apiMetrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

        // Check for rate limiting
        if (options.rateLimitInfo?.remaining === 0) {
            this.apiMetrics.rateLimitHits++;
            this.warn(`Rate limit hit for ${method} ${url}`, {
                type: 'rate_limit_hit',
                api: {
                    method,
                    url: this.sanitizeUrl(url),
                    rateLimitInfo: options.rateLimitInfo,
                    correlationId: this.getCorrelationId(),
                },
            });
        }

        const logLevel = isSuccess ? 'info' : 'error';
        const message = `API Response: ${method} ${url} - ${options.status} (${options.duration}ms)`;

        this.log(logLevel, message, {
            type: 'api_response',
            api: {
                method,
                url: this.sanitizeUrl(url),
                status: options.status,
                duration: options.duration,
                responseSize: options.body ? JSON.stringify(options.body).length : 0,
                correlationId: this.getCorrelationId(),
                rateLimitInfo: options.rateLimitInfo,
            },
            performance: {
                duration: options.duration,
                success: isSuccess,
            },
        });
    }

    /**
     * Log API error
     */
    public apiError(method: string, url: string, error: Error, options: {
        duration?: number;
        retryAttempt?: number;
        willRetry?: boolean;
        rateLimitInfo?: {
            remaining: number;
            resetTime: Date;
            retryAfter?: number;
        };
    } = {}): void {
        this.apiMetrics.failedRequests++;

        if (options.retryAttempt && options.retryAttempt > 0) {
            this.apiMetrics.retryAttempts++;
        }

        const message = options.willRetry 
            ? `API Error (will retry): ${method} ${url} - ${error.message}`
            : `API Error: ${method} ${url} - ${error.message}`;

        this.error(message, error, {
            type: 'api_error',
            api: {
                method,
                url: this.sanitizeUrl(url),
                duration: options.duration,
                correlationId: this.getCorrelationId(),
                retryAttempt: options.retryAttempt,
                willRetry: options.willRetry,
                rateLimitInfo: options.rateLimitInfo,
            },
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: (error as any)?.code,
                errno: (error as any)?.errno,
                syscall: (error as any)?.syscall,
            },
        });
    }

    /**
     * Log rate limiting event
     */
    public rateLimitEvent(service: string, options: {
        remaining: number;
        resetTime: Date;
        retryAfter?: number;
        action: 'hit' | 'approaching' | 'reset';
    }): void {
        const message = `Rate limit ${options.action} for ${service}`;
        const logLevel = options.action === 'hit' ? 'warn' : 'info';

        this.log(logLevel, message, {
            type: 'rate_limit_event',
            service,
            rateLimitInfo: options,
            correlationId: this.getCorrelationId(),
        });
    }

    /**
     * Log network connectivity issues
     */
    public networkError(error: Error, context: {
        operation: string;
        endpoint?: string;
        timeout?: number;
        retryAttempt?: number;
    }): void {
        this.error(`Network error during ${context.operation}`, error, {
            type: 'network_error',
            network: {
                operation: context.operation,
                endpoint: context.endpoint,
                timeout: context.timeout,
                retryAttempt: context.retryAttempt,
                correlationId: this.getCorrelationId(),
            },
            error: {
                name: error.name,
                message: error.message,
                code: (error as any)?.code,
                errno: (error as any)?.errno,
                syscall: (error as any)?.syscall,
            },
        });
    }

    /**
     * Log performance metrics
     */
    public performanceMetrics(operation: string, metrics: {
        duration: number;
        memoryUsage?: NodeJS.MemoryUsage;
        cpuUsage?: NodeJS.CpuUsage;
        itemsProcessed?: number;
    }): void {
        this.info(`Performance metrics for ${operation}`, {
            type: 'performance_metrics',
            operation,
            performance: {
                duration: metrics.duration,
                itemsProcessed: metrics.itemsProcessed,
                throughput: metrics.itemsProcessed ? metrics.itemsProcessed / (metrics.duration / 1000) : undefined,
                memoryUsage: metrics.memoryUsage,
                cpuUsage: metrics.cpuUsage,
            },
            correlationId: this.getCorrelationId(),
        });
    }

    /**
     * Get current API metrics
     */
    public getApiMetrics(): ApiMetrics {
        return { ...this.apiMetrics };
    }

    /**
     * Reset API metrics
     */
    public resetApiMetrics(): void {
        this.apiMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            rateLimitHits: 0,
            retryAttempts: 0,
        };
        this.responseTimes = [];
    }

    /**
     * Log API metrics summary
     */
    public logApiMetricsSummary(): void {
        const successRate = this.apiMetrics.totalRequests > 0 
            ? (this.apiMetrics.successfulRequests / this.apiMetrics.totalRequests) * 100 
            : 0;

        this.info('API Metrics Summary', {
            type: 'api_metrics_summary',
            metrics: {
                ...this.apiMetrics,
                successRate: Math.round(successRate * 100) / 100,
            },
            correlationId: this.getCorrelationId(),
        });
    }

    private sanitizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            // Remove sensitive query parameters
            const sensitiveParams = ['api_key', 'token', 'secret', 'password', 'auth'];
            for (const param of sensitiveParams) {
                if (urlObj.searchParams.has(param)) {
                    urlObj.searchParams.set(param, '[REDACTED]');
                }
            }
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
        if (!headers) {
return {};
}
        
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

        for (const header of sensitiveHeaders) {
            const key = Object.keys(sanitized).find(k => k.toLowerCase() === header);
            if (key) {
                sanitized[key] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
} 