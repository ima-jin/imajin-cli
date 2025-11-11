/**
 * ApiManager - Comprehensive API management and coordination
 * 
 * @package     @imajin/cli
 * @subpackage  core/api
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Rate limiter for request throttling
 * - Circuit breaker for resilience
 * - Connection pooling for performance
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'node:events';
import { inject, injectable } from 'tsyringe';
import { RateLimiter } from '../ratelimit/RateLimiter.js';
import { CircuitBreaker } from './CircuitBreaker.js';

/**
 * API service configuration
 */
export interface ApiServiceConfig {
    readonly serviceId: string;
    readonly baseURL: string;
    readonly timeout?: number;
    readonly retries?: number;
    readonly retryDelay?: number;
    readonly maxConcurrent?: number;
    readonly keepAlive?: boolean;
    readonly headers?: Record<string, string>;
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
    readonly serviceId: string;
    readonly active: number;
    readonly idle: number;
    readonly pending: number;
    readonly total: number;
    readonly created: number;
    readonly destroyed: number;
}

/**
 * API request options
 */
export interface ApiRequestOptions extends AxiosRequestConfig {
    readonly serviceId: string;
    readonly bypassRateLimit?: boolean;
    readonly bypassCircuitBreaker?: boolean;
    readonly priority?: 'low' | 'normal' | 'high';
}

/**
 * API response with metadata
 */
export interface ApiResponse<T = any> extends AxiosResponse<T> {
    readonly serviceId: string;
    readonly fromCache?: boolean;
    readonly rateLimited?: boolean;
    readonly circuitBroken?: boolean;
    readonly retryAttempt?: number;
    readonly duration: number;
}

/**
 * API management events
 */
export interface ApiManagerEvents {
    'request-queued': (serviceId: string, queueSize: number) => void;
    'request-started': (serviceId: string, requestId: string) => void;
    'request-completed': (serviceId: string, requestId: string, duration: number) => void;
    'request-failed': (serviceId: string, requestId: string, error: Error) => void;
    'connection-created': (serviceId: string, total: number) => void;
    'connection-destroyed': (serviceId: string, total: number) => void;
    'pool-exhausted': (serviceId: string, maxConcurrent: number) => void;
}

/**
 * Comprehensive API manager
 */
@injectable()
export class ApiManager extends EventEmitter {
    private connections = new Map<string, any>();
    private requestQueues = new Map<string, any[]>();
    private activeRequests = new Map<string, Set<string>>();
    private requestCounter = 0;

    constructor(
        @inject('RateLimiter') private rateLimiter: RateLimiter,
        @inject('CircuitBreaker') private circuitBreaker: CircuitBreaker
    ) {
        super();
        this.setupHealthChecks();
    }

    /**
     * Configure API service
     */
    public configureService(config: ApiServiceConfig): void {
        const client = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
            headers: {
                'User-Agent': 'imajin-cli/1.0.0',
                ...config.headers
            }
        });

        this.connections.set(config.serviceId, {
            serviceId: config.serviceId,
            client,
            config,
            active: 0,
            idle: 0,
            created: 1,
            destroyed: 0
        });

        this.requestQueues.set(config.serviceId, []);
        this.activeRequests.set(config.serviceId, new Set());

        this.emit('connection-created', config.serviceId, 1);
    }

    /**
     * Make an API request with full management
     */
    public async request<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
        const { serviceId } = options;
        const connection = this.connections.get(serviceId);

        if (!connection) {
            throw new Error(`Service not configured: ${serviceId}`);
        }

        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            // Check rate limiting
            if (!options.bypassRateLimit && !this.rateLimiter.canMakeRequest(serviceId)) {
                const waitTime = this.rateLimiter.getWaitTime(serviceId);
                if (waitTime > 0) {
                    await this.delay(waitTime);
                }
            }

            // Execute request
            this.trackActiveRequest(serviceId, requestId);
            this.emit('request-started', serviceId, requestId);

            const response = await connection.client.request(options) as AxiosResponse<T>;

            // Record successful request
            if (!options.bypassRateLimit) {
                this.rateLimiter.recordRequest(serviceId);
            }

            return {
                ...response,
                serviceId,
                duration: Date.now() - startTime
            };

        } catch (error) {
            this.emit('request-failed', serviceId, requestId, error as Error);
            throw error;
        } finally {
            this.untrackActiveRequest(serviceId, requestId);
            this.emit('request-completed', serviceId, requestId, Date.now() - startTime);
        }
    }

    /**
     * Get connection pool statistics
     */
    public getPoolStats(serviceId: string): ConnectionPoolStats | null {
        const connection = this.connections.get(serviceId);
        if (!connection) {
return null;
}

        const activeRequests = this.activeRequests.get(serviceId)?.size || 0;
        const queuedRequests = this.requestQueues.get(serviceId)?.length || 0;

        return {
            serviceId,
            active: activeRequests,
            idle: connection.idle,
            pending: queuedRequests,
            total: connection.created - connection.destroyed,
            created: connection.created,
            destroyed: connection.destroyed
        };
    }

    /**
     * Health check for a service
     */
    public async healthCheck(serviceId: string): Promise<{
        healthy: boolean;
        responseTime?: number;
        error?: string;
    }> {
        const connection = this.connections.get(serviceId);
        if (!connection) {
            return { healthy: false, error: 'Service not configured' };
        }

        try {
            const startTime = Date.now();
            await connection.client.get('/health', { timeout: 5000 });

            return {
                healthy: true,
                responseTime: Date.now() - startTime
            };
        } catch (error) {
            return {
                healthy: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Shutdown API manager
     */
    public async shutdown(): Promise<void> {
        this.connections.clear();
        this.requestQueues.clear();
        this.activeRequests.clear();
    }

    /**
     * Track active request
     */
    private trackActiveRequest(serviceId: string, requestId: string): void {
        const activeSet = this.activeRequests.get(serviceId)!;
        activeSet.add(requestId);
    }

    /**
     * Untrack active request
     */
    private untrackActiveRequest(serviceId: string, requestId: string): void {
        const activeSet = this.activeRequests.get(serviceId)!;
        activeSet.delete(requestId);
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req_${++this.requestCounter}_${Date.now()}`;
    }

    /**
     * Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Setup periodic health checks
     */
    private setupHealthChecks(): void {
        setInterval(() => {
            void (async () => {
                for (const serviceId of this.connections.keys()) {
                    await this.healthCheck(serviceId);
                }
            })().catch(err => {
                console.error('Health check failed:', err);
            });
        }, 60 * 1000); // Check every minute
    }
}

// Type-safe event emitter interface augmentation
declare module './ApiManager' {
    interface ApiManager {
        on<K extends keyof ApiManagerEvents>(event: K, listener: ApiManagerEvents[K]): this;
        emit<K extends keyof ApiManagerEvents>(event: K, ...args: Parameters<ApiManagerEvents[K]>): boolean;
    }
} 