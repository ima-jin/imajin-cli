/**
 * ApiFormatter - Specialized formatting for API request/response logging
 * 
 * @package     @imajin/cli
 * @subpackage  logging/formatters
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
 */

import winston from 'winston';

export interface ApiLogContext {
    method: string;
    url: string;
    headers?: Record<string, string>;
    requestBody?: any;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
    duration?: number;
    error?: Error;
    rateLimitInfo?: {
        remaining: number;
        resetTime: Date;
        retryAfter?: number;
    };
    retryAttempt?: number;
    correlationId: string;
}

export class ApiFormatter {
    public static formatRequest(context: ApiLogContext): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format((info) => {
                const { timestamp, level, message, ...meta } = info;
                
                return {
                    timestamp,
                    level,
                    message,
                    type: 'api_request',
                    api: {
                        method: context.method,
                        url: this.sanitizeUrl(context.url),
                        headers: this.sanitizeHeaders(context.headers),
                        bodySize: context.requestBody ? JSON.stringify(context.requestBody).length : 0,
                        correlationId: context.correlationId,
                    },
                    ...meta,
                };
            })(),
            winston.format.json()
        );
    }

    public static formatResponse(context: ApiLogContext): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format((info) => {
                const { timestamp, level, message, ...meta } = info;
                
                return {
                    timestamp,
                    level,
                    message,
                    type: 'api_response',
                    api: {
                        method: context.method,
                        url: this.sanitizeUrl(context.url),
                        status: context.responseStatus,
                        duration: context.duration,
                        responseSize: context.responseBody ? JSON.stringify(context.responseBody).length : 0,
                        correlationId: context.correlationId,
                        rateLimitInfo: context.rateLimitInfo,
                    },
                    performance: {
                        duration: context.duration,
                        success: context.responseStatus ? context.responseStatus < 400 : false,
                    },
                    ...meta,
                };
            })(),
            winston.format.json()
        );
    }

    public static formatError(context: ApiLogContext): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format((info) => {
                const { timestamp, level, message, ...meta } = info;
                
                return {
                    timestamp,
                    level,
                    message,
                    type: 'api_error',
                    api: {
                        method: context.method,
                        url: this.sanitizeUrl(context.url),
                        status: context.responseStatus,
                        duration: context.duration,
                        correlationId: context.correlationId,
                        retryAttempt: context.retryAttempt,
                        rateLimitInfo: context.rateLimitInfo,
                    },
                    error: {
                        name: context.error?.name,
                        message: context.error?.message,
                        stack: context.error?.stack,
                        code: (context.error as any)?.code,
                        errno: (context.error as any)?.errno,
                        syscall: (context.error as any)?.syscall,
                    },
                    ...meta,
                };
            })(),
            winston.format.json()
        );
    }

    private static sanitizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            // Remove sensitive query parameters
            const sensitiveParams = ['api_key', 'token', 'secret', 'password', 'auth'];
            sensitiveParams.forEach(param => {
                if (urlObj.searchParams.has(param)) {
                    urlObj.searchParams.set(param, '[REDACTED]');
                }
            });
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    private static sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
        if (!headers) {
return {};
}
        
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
        
        sensitiveHeaders.forEach(header => {
            const key = Object.keys(sanitized).find(k => k.toLowerCase() === header);
            if (key) {
                sanitized[key] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }
} 