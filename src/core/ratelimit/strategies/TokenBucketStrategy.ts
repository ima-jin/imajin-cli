/**
 * TokenBucketStrategy - Token bucket rate limiting implementation
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
 * - RateLimitStrategy interface implementation
 * - Supports burst requests within configured limits
 * - Token refill based on time intervals
 */

import { RateLimitStatus } from '../RateLimiter';
import { RateLimitStrategy } from './RateLimitStrategy';

/**
 * Token bucket information for a service
 */
interface TokenBucket {
    tokens: number;
    lastRefill: number;
    capacity: number;
    refillRate: number; // tokens per millisecond
}

/**
 * Token bucket rate limiting strategy
 * Allows burst requests up to bucket capacity, with tokens refilling over time
 */
export class TokenBucketStrategy implements RateLimitStrategy {
    public readonly name = 'token-bucket';

    private readonly buckets = new Map<string, TokenBucket>();
    private readonly capacity: number;
    private readonly refillRate: number; // tokens per millisecond
    private readonly refillInterval: number;

    constructor(
        capacity: number,
        refillIntervalMs: number,
        burst?: number
    ) {
        this.capacity = burst || capacity;
        this.refillInterval = refillIntervalMs;
        this.refillRate = capacity / refillIntervalMs;
    }

    /**
     * Check if a request can be made (if tokens are available)
     */
    public canMakeRequest(serviceId: string): boolean {
        const bucket = this.getBucket(serviceId);
        this.refillTokens(bucket);

        return bucket.tokens >= 1;
    }

    /**
     * Record a request by consuming a token
     */
    public recordRequest(serviceId: string): void {
        const bucket = this.getBucket(serviceId);
        this.refillTokens(bucket);

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
        }
    }

    /**
     * Get wait time until next token is available
     */
    public getWaitTime(serviceId: string): number {
        const bucket = this.getBucket(serviceId);
        this.refillTokens(bucket);

        if (bucket.tokens >= 1) {
            return 0;
        }

        // Calculate time until next token
        const tokensNeeded = 1 - bucket.tokens;
        return Math.ceil(tokensNeeded / this.refillRate);
    }

    /**
     * Get current status for the service
     */
    public getStatus(serviceId: string): RateLimitStatus {
        const bucket = this.getBucket(serviceId);
        this.refillTokens(bucket);

        return {
            serviceId,
            canMakeRequest: bucket.tokens >= 1,
            remainingRequests: Math.floor(bucket.tokens),
            resetTime: this.getNextRefillTime(bucket),
            waitTime: this.getWaitTime(serviceId),
            strategy: this.name
        };
    }

    /**
     * Reset the token bucket for a service
     */
    public reset(serviceId: string): void {
        const bucket = this.getBucket(serviceId);
        bucket.tokens = bucket.capacity;
        bucket.lastRefill = Date.now();
    }

    /**
     * Get or create a token bucket for a service
     */
    private getBucket(serviceId: string): TokenBucket {
        let bucket = this.buckets.get(serviceId);

        if (!bucket) {
            bucket = {
                tokens: this.capacity,
                lastRefill: Date.now(),
                capacity: this.capacity,
                refillRate: this.refillRate
            };
            this.buckets.set(serviceId, bucket);
        }

        return bucket;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens(bucket: TokenBucket): void {
        const now = Date.now();
        const elapsed = now - bucket.lastRefill;

        if (elapsed > 0) {
            const tokensToAdd = elapsed * this.refillRate;
            bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
    }

    /**
     * Get the time when the next token will be available
     */
    private getNextRefillTime(bucket: TokenBucket): number {
        if (bucket.tokens >= bucket.capacity) {
            return Date.now();
        }

        const tokensToFull = bucket.capacity - bucket.tokens;
        const timeToFull = tokensToFull / this.refillRate;

        return bucket.lastRefill + timeToFull;
    }
} 