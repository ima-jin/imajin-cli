/**
 * RateLimiter - Core rate limiting management system
 * 
 * @package     @imajin/cli
 * @subpackage  core/ratelimit
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Service providers for rate limit configuration
 * - Event system for rate limit notifications
 * - API manager for request coordination
 */

import { EventEmitter } from 'node:events';
import { injectable } from 'tsyringe';
import { FixedWindowStrategy } from './strategies/FixedWindowStrategy.js';
import { RateLimitStrategy } from './strategies/RateLimitStrategy.js';
import { SlidingWindowStrategy } from './strategies/SlidingWindowStrategy.js';
import { TokenBucketStrategy } from './strategies/TokenBucketStrategy.js';

/**
 * Rate limit configuration for a service
 */
export interface RateLimitConfig {
    readonly serviceId: string;
    readonly strategy: 'token-bucket' | 'sliding-window' | 'fixed-window';
    readonly limit: number;
    readonly window: number; // Time window in milliseconds
    readonly burst?: number; // For token bucket strategy
    readonly enabled: boolean;
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
    readonly serviceId: string;
    readonly canMakeRequest: boolean;
    readonly remainingRequests: number;
    readonly resetTime: number;
    readonly waitTime: number;
    readonly strategy: string;
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolation {
    readonly serviceId: string;
    readonly requestCount: number;
    readonly limit: number;
    readonly window: number;
    readonly timestamp: number;
}

/**
 * Rate limiting events
 */
export interface RateLimiterEvents {
    'rate-limit-exceeded': (violation: RateLimitViolation) => void;
    'rate-limit-warning': (serviceId: string, remaining: number) => void;
    'rate-limit-reset': (serviceId: string) => void;
    'strategy-changed': (serviceId: string, strategy: string) => void;
}

/**
 * Core rate limiter that coordinates multiple strategies
 */
@injectable()
export class RateLimiter extends EventEmitter {
    private readonly strategies = new Map<string, RateLimitStrategy>();
    private readonly configs = new Map<string, RateLimitConfig>();
    private readonly violations = new Map<string, RateLimitViolation[]>();

    constructor() {
        super();
        this.setupCleanupTimer();
    }

    /**
     * Configure rate limiting for a service
     */
    public configure(config: RateLimitConfig): void {
        this.configs.set(config.serviceId, config);

        if (config.enabled) {
            const strategy = this.createStrategy(config);
            this.strategies.set(config.serviceId, strategy);

            this.emit('strategy-changed', config.serviceId, config.strategy);
        } else {
            this.strategies.delete(config.serviceId);
        }
    }

    /**
     * Check if a request can be made to a service
     */
    public canMakeRequest(serviceId: string): boolean {
        const strategy = this.strategies.get(serviceId);
        if (!strategy) {
            return true; // No rate limiting configured
        }

        const canRequest = strategy.canMakeRequest(serviceId);

        if (!canRequest) {
            this.recordViolation(serviceId);
        }

        return canRequest;
    }

    /**
     * Record a request being made to a service
     */
    public recordRequest(serviceId: string): void {
        const strategy = this.strategies.get(serviceId);
        if (strategy) {
            strategy.recordRequest(serviceId);

            // Check if we're approaching the limit
            const status = strategy.getStatus(serviceId);
            if (status.remainingRequests <= 5 && status.remainingRequests > 0) {
                this.emit('rate-limit-warning', serviceId, status.remainingRequests);
            }
        }
    }

    /**
     * Get the wait time before the next request can be made
     */
    public getWaitTime(serviceId: string): number {
        const strategy = this.strategies.get(serviceId);
        return strategy ? strategy.getWaitTime(serviceId) : 0;
    }

    /**
     * Get the current rate limit status for a service
     */
    public getStatus(serviceId: string): RateLimitStatus {
        const strategy = this.strategies.get(serviceId);
        const config = this.configs.get(serviceId);

        if (!strategy || !config) {
            return {
                serviceId,
                canMakeRequest: true,
                remainingRequests: Infinity,
                resetTime: 0,
                waitTime: 0,
                strategy: 'none'
            };
        }

        return strategy.getStatus(serviceId);
    }

    /**
     * Get all configured services and their status
     */
    public getAllStatus(): RateLimitStatus[] {
        return Array.from(this.configs.keys()).map(serviceId =>
            this.getStatus(serviceId)
        );
    }

    /**
     * Reset rate limits for a service
     */
    public reset(serviceId: string): void {
        const strategy = this.strategies.get(serviceId);
        if (strategy && 'reset' in strategy) {
            (strategy as any).reset(serviceId);
            this.emit('rate-limit-reset', serviceId);
        }
    }

    /**
     * Reset all rate limits
     */
    public resetAll(): void {
        for (const serviceId of this.strategies.keys()) {
            this.reset(serviceId);
        }
    }

    /**
     * Get violation history for a service
     */
    public getViolations(serviceId: string): RateLimitViolation[] {
        return this.violations.get(serviceId) || [];
    }

    /**
     * Get all violations across all services
     */
    public getAllViolations(): RateLimitViolation[] {
        const all: RateLimitViolation[] = [];
        for (const violations of this.violations.values()) {
            all.push(...violations);
        }
        return all.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Create a rate limiting strategy based on configuration
     */
    private createStrategy(config: RateLimitConfig): RateLimitStrategy {
        switch (config.strategy) {
            case 'token-bucket':
                return new TokenBucketStrategy(config.limit, config.window, config.burst);

            case 'sliding-window':
                return new SlidingWindowStrategy(config.limit, config.window);

            case 'fixed-window':
                return new FixedWindowStrategy(config.limit, config.window);

            default:
                throw new Error(`Unknown rate limiting strategy: ${config.strategy}`);
        }
    }

    /**
     * Record a rate limit violation
     */
    private recordViolation(serviceId: string): void {
        const config = this.configs.get(serviceId);
        if (!config) {
return;
}

        const violation: RateLimitViolation = {
            serviceId,
            requestCount: config.limit + 1,
            limit: config.limit,
            window: config.window,
            timestamp: Date.now()
        };

        let violations = this.violations.get(serviceId) || [];
        violations.push(violation);

        // Keep only last 100 violations per service
        if (violations.length > 100) {
            violations = violations.slice(-100);
        }

        this.violations.set(serviceId, violations);
        this.emit('rate-limit-exceeded', violation);
    }

    /**
     * Setup cleanup timer for old violations
     */
    private setupCleanupTimer(): void {
        setInterval(() => {
            const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

            for (const [serviceId, violations] of this.violations.entries()) {
                const filtered = violations.filter(v => v.timestamp > cutoff);
                if (filtered.length !== violations.length) {
                    this.violations.set(serviceId, filtered);
                }
            }
        }, 60 * 60 * 1000); // Run every hour
    }
}

// Type-safe event emitter interface augmentation
declare module './RateLimiter' {
    interface RateLimiter {
        on<K extends keyof RateLimiterEvents>(event: K, listener: RateLimiterEvents[K]): this;
        emit<K extends keyof RateLimiterEvents>(event: K, ...args: Parameters<RateLimiterEvents[K]>): boolean;
    }
} 