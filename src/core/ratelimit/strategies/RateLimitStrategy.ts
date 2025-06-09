/**
 * RateLimitStrategy - Base interface for rate limiting strategies
 * 
 * @package     @imajin/cli
 * @subpackage  core/ratelimit/strategies
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Core RateLimiter for strategy coordination
 * - Service providers for configuration
 * - Monitoring system for metrics collection
 */

import { RateLimitStatus } from '../RateLimiter';

/**
 * Base interface for all rate limiting strategies
 */
export interface RateLimitStrategy {
    /**
     * Strategy name for identification
     */
    readonly name: string;

    /**
     * Check if a request can be made for the given service
     * @param serviceId - The service identifier
     * @returns true if request is allowed, false otherwise
     */
    canMakeRequest(serviceId: string): boolean;

    /**
     * Record that a request was made for the given service
     * @param serviceId - The service identifier
     */
    recordRequest(serviceId: string): void;

    /**
     * Get the time to wait before the next request can be made
     * @param serviceId - The service identifier
     * @returns wait time in milliseconds, 0 if no wait required
     */
    getWaitTime(serviceId: string): number;

    /**
     * Get the current rate limit status for the service
     * @param serviceId - The service identifier
     * @returns current rate limit status
     */
    getStatus(serviceId: string): RateLimitStatus;

    /**
     * Reset the rate limit for the given service (optional)
     * @param serviceId - The service identifier
     */
    reset?(serviceId: string): void;
}

/**
 * Base configuration for rate limiting strategies
 */
export interface BaseRateLimitConfig {
    readonly limit: number;
    readonly windowMs: number;
}

/**
 * Request tracking information
 */
export interface RequestInfo {
    readonly timestamp: number;
    readonly count: number;
}

/**
 * Abstract base class for rate limiting strategies
 */
export abstract class BaseRateLimitStrategy implements RateLimitStrategy {
    protected readonly limit: number;
    protected readonly windowMs: number;
    protected readonly requests = new Map<string, RequestInfo[]>();

    constructor(limit: number, windowMs: number) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    public abstract readonly name: string;
    public abstract canMakeRequest(serviceId: string): boolean;
    public abstract recordRequest(serviceId: string): void;
    public abstract getWaitTime(serviceId: string): number;

    /**
     * Get current status for a service
     */
    public getStatus(serviceId: string): RateLimitStatus {
        const remaining = this.getRemainingRequests(serviceId);
        const resetTime = this.getResetTime(serviceId);

        return {
            serviceId,
            canMakeRequest: this.canMakeRequest(serviceId),
            remainingRequests: remaining,
            resetTime,
            waitTime: this.getWaitTime(serviceId),
            strategy: this.name
        };
    }

    /**
     * Reset rate limits for a service
     */
    public reset(serviceId: string): void {
        this.requests.delete(serviceId);
    }

    /**
     * Get remaining requests for a service
     */
    protected getRemainingRequests(serviceId: string): number {
        const requests = this.getActiveRequests(serviceId);
        return Math.max(0, this.limit - requests.length);
    }

    /**
 * Get when the rate limit will reset
 */
    protected getResetTime(serviceId: string): number {
        const requests = this.getActiveRequests(serviceId);
        if (requests.length === 0) {
            return Date.now();
        }

        const oldestRequest = requests[0];
        return oldestRequest ? oldestRequest.timestamp + this.windowMs : Date.now();
    }

    /**
     * Get active requests within the time window
     */
    protected getActiveRequests(serviceId: string): RequestInfo[] {
        const now = Date.now();
        const cutoff = now - this.windowMs;

        const requests = this.requests.get(serviceId) || [];
        return requests.filter(req => req.timestamp > cutoff);
    }

    /**
     * Clean up old requests outside the time window
     */
    protected cleanup(serviceId: string): void {
        const activeRequests = this.getActiveRequests(serviceId);
        if (activeRequests.length === 0) {
            this.requests.delete(serviceId);
        } else {
            this.requests.set(serviceId, activeRequests);
        }
    }
} 