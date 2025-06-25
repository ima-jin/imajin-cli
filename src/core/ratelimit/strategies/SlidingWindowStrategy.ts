/**
 * SlidingWindowStrategy - Sliding window rate limiting implementation
 * 
 * @package     @imajin/cli
 * @subpackage  core/ratelimit/strategies
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-18
 *
 * Integration Points:
 * - RateLimitStrategy interface implementation
 * - Maintains sliding window of request timestamps
 * - Precise request counting with automatic cleanup
 */

import { RateLimitStatus } from '../RateLimiter';
import { BaseRateLimitStrategy, RequestInfo } from './RateLimitStrategy';

/**
 * Sliding window rate limiting strategy
 * Tracks all requests within a rolling time window for precise rate limiting
 */
export class SlidingWindowStrategy extends BaseRateLimitStrategy {
    public readonly name = 'sliding-window';

    constructor(limit: number, windowMs: number) {
        super(limit, windowMs);
    }

    /**
     * Check if a request can be made within the sliding window
     */
    public canMakeRequest(serviceId: string): boolean {
        this.cleanup(serviceId);
        const activeRequests = this.getActiveRequests(serviceId);
        return activeRequests.length < this.limit;
    }

    /**
     * Record a request in the sliding window
     */
    public recordRequest(serviceId: string): void {
        this.cleanup(serviceId);

        const now = Date.now();
        const requests = this.requests.get(serviceId) || [];

        // Add the new request
        requests.push({
            timestamp: now,
            count: 1
        });

        this.requests.set(serviceId, requests);
    }

    /**
     * Get wait time until the oldest request expires
     */
    public getWaitTime(serviceId: string): number {
        this.cleanup(serviceId);

        const activeRequests = this.getActiveRequests(serviceId);

        if (activeRequests.length < this.limit) {
            return 0;
        }

        // Find the oldest request that needs to expire
        const oldestRequest = activeRequests.reduce((oldest, current) =>
            current.timestamp < oldest.timestamp ? current : oldest
        );

        const expireTime = oldestRequest.timestamp + this.windowMs;
        return Math.max(0, expireTime - Date.now());
    }

    /**
     * Get detailed status including request distribution
     */
    public getStatus(serviceId: string): RateLimitStatus & { requestTimes?: number[] } {
        this.cleanup(serviceId);

        const activeRequests = this.getActiveRequests(serviceId);
        const remaining = Math.max(0, this.limit - activeRequests.length);
        const resetTime = this.getResetTime(serviceId);

        return {
            serviceId,
            canMakeRequest: activeRequests.length < this.limit,
            remainingRequests: remaining,
            resetTime,
            waitTime: this.getWaitTime(serviceId),
            strategy: this.name,
            requestTimes: activeRequests.map(r => r.timestamp)
        };
    }

    /**
     * Get the time when the next request slot becomes available
     */
    protected getResetTime(serviceId: string): number {
        const activeRequests = this.getActiveRequests(serviceId);

        if (activeRequests.length === 0) {
            return Date.now();
        }

        if (activeRequests.length < this.limit) {
            return Date.now(); // Slots available now
        }

        // Find when the oldest request will expire
        const oldestRequest = activeRequests.reduce((oldest, current) =>
            current.timestamp < oldest.timestamp ? current : oldest
        );

        return oldestRequest.timestamp + this.windowMs;
    }

    /**
     * Get requests within the current sliding window
     */
    protected getActiveRequests(serviceId: string): RequestInfo[] {
        const now = Date.now();
        const cutoff = now - this.windowMs;

        const requests = this.requests.get(serviceId) || [];
        return requests.filter(req => req.timestamp > cutoff);
    }

    /**
     * Get request distribution statistics
     */
    public getDistribution(serviceId: string): {
        total: number;
        buckets: Array<{ start: number; end: number; count: number }>;
    } {
        this.cleanup(serviceId);

        const activeRequests = this.getActiveRequests(serviceId);
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Create 10 buckets for the time window
        const bucketSize = this.windowMs / 10;
        const buckets = [];

        for (let i = 0; i < 10; i++) {
            const start = windowStart + (i * bucketSize);
            const end = start + bucketSize;

            const count = activeRequests.filter(req =>
                req.timestamp >= start && req.timestamp < end
            ).length;

            buckets.push({ start, end, count });
        }

        return {
            total: activeRequests.length,
            buckets
        };
    }

    /**
     * Check if the service is currently being rate limited
     */
    public isLimited(serviceId: string): boolean {
        this.cleanup(serviceId);
        const activeRequests = this.getActiveRequests(serviceId);
        return activeRequests.length >= this.limit;
    }

    /**
     * Get the percentage of rate limit capacity used
     */
    public getUsagePercentage(serviceId: string): number {
        this.cleanup(serviceId);
        const activeRequests = this.getActiveRequests(serviceId);
        return Math.min(100, (activeRequests.length / this.limit) * 100);
    }
} 