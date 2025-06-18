/**
 * FixedWindowStrategy - Fixed window rate limiting implementation
 * 
 * @package     @imajin/cli
 * @subpackage  core/ratelimit/strategies
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-11
 *
 * Integration Points:
 * - RateLimitStrategy interface implementation
 * - Fixed time windows with request count tracking
 * - Automatic window reset at defined intervals
 */

import { RateLimitStatus } from '../RateLimiter';
import { RateLimitStrategy } from './RateLimitStrategy';

/**
 * Fixed window information for a service
 */
interface FixedWindow {
    windowStart: number;
    requestCount: number;
    limit: number;
}

/**
 * Fixed window rate limiting strategy
 * Resets request counts at fixed time intervals
 */
export class FixedWindowStrategy implements RateLimitStrategy {
    public readonly name = 'fixed-window';

    private readonly windows = new Map<string, FixedWindow>();
    private readonly limit: number;
    private readonly windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    /**
     * Check if a request can be made in the current window
     */
    public canMakeRequest(serviceId: string): boolean {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        return window.requestCount < window.limit;
    }

    /**
     * Record a request in the current window
     */
    public recordRequest(serviceId: string): void {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        if (window.requestCount < window.limit) {
            window.requestCount++;
        }
    }

    /**
     * Get wait time until the current window resets
     */
    public getWaitTime(serviceId: string): number {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        if (window.requestCount < window.limit) {
            return 0;
        }

        const windowEnd = window.windowStart + this.windowMs;
        return Math.max(0, windowEnd - Date.now());
    }

    /**
     * Get current status for the service
     */
    public getStatus(serviceId: string): RateLimitStatus {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        const remaining = Math.max(0, window.limit - window.requestCount);
        const resetTime = window.windowStart + this.windowMs;

        return {
            serviceId,
            canMakeRequest: window.requestCount < window.limit,
            remainingRequests: remaining,
            resetTime,
            waitTime: this.getWaitTime(serviceId),
            strategy: this.name
        };
    }

    /**
     * Reset the window for a service
     */
    public reset(serviceId: string): void {
        const window = this.getWindow(serviceId);
        window.windowStart = Date.now();
        window.requestCount = 0;
    }

    /**
     * Get or create a window for a service
     */
    private getWindow(serviceId: string): FixedWindow {
        let window = this.windows.get(serviceId);

        if (!window) {
            window = {
                windowStart: this.getWindowStart(),
                requestCount: 0,
                limit: this.limit
            };
            this.windows.set(serviceId, window);
        }

        return window;
    }

    /**
     * Update window if it has expired
     */
    private updateWindow(window: FixedWindow): void {
        const now = Date.now();
        const windowEnd = window.windowStart + this.windowMs;

        if (now >= windowEnd) {
            // Reset to new window
            window.windowStart = this.getWindowStart(now);
            window.requestCount = 0;
        }
    }

    /**
     * Get the start time for the current fixed window
     */
    private getWindowStart(timestamp?: number): number {
        const now = timestamp || Date.now();
        return Math.floor(now / this.windowMs) * this.windowMs;
    }

    /**
     * Get window information for all services
     */
    public getAllWindows(): Array<{
        serviceId: string;
        windowStart: number;
        windowEnd: number;
        requestCount: number;
        limit: number;
        usage: number;
    }> {
        const result = [];

        for (const [serviceId, window] of this.windows.entries()) {
            this.updateWindow(window);

            result.push({
                serviceId,
                windowStart: window.windowStart,
                windowEnd: window.windowStart + this.windowMs,
                requestCount: window.requestCount,
                limit: window.limit,
                usage: (window.requestCount / window.limit) * 100
            });
        }

        return result;
    }

    /**
     * Get the current window progress (0-1)
     */
    public getWindowProgress(serviceId: string): number {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        const now = Date.now();
        const elapsed = now - window.windowStart;
        return Math.min(1, elapsed / this.windowMs);
    }

    /**
     * Check if the service is currently being rate limited
     */
    public isLimited(serviceId: string): boolean {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        return window.requestCount >= window.limit;
    }

    /**
     * Get usage statistics for a service
     */
    public getUsageStats(serviceId: string): {
        current: number;
        limit: number;
        percentage: number;
        windowStart: number;
        windowEnd: number;
        windowProgress: number;
    } {
        const window = this.getWindow(serviceId);
        this.updateWindow(window);

        return {
            current: window.requestCount,
            limit: window.limit,
            percentage: (window.requestCount / window.limit) * 100,
            windowStart: window.windowStart,
            windowEnd: window.windowStart + this.windowMs,
            windowProgress: this.getWindowProgress(serviceId)
        };
    }

    /**
     * Bulk reset all windows
     */
    public resetAll(): void {
        const now = Date.now();
        const windowStart = this.getWindowStart(now);

        for (const window of this.windows.values()) {
            window.windowStart = windowStart;
            window.requestCount = 0;
        }
    }
} 