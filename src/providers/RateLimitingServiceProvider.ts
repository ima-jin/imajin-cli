/**
 * RateLimitingServiceProvider - Service provider for rate limiting and API management
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Rate limiter registration
 * - Circuit breaker registration
 * - API manager registration
 * - Default configurations for enterprise patterns
 */

import type { Command } from 'commander';
import type { Container } from '../container/Container.js';
import { ApiManager } from '../core/api/ApiManager';
import { CircuitBreaker } from '../core/api/CircuitBreaker';
import { RateLimiter } from '../core/ratelimit/RateLimiter';
import { ServiceProvider } from './ServiceProvider.js';

/**
 * Rate limiting and API management service provider
 */
export class RateLimitingServiceProvider extends ServiceProvider {

    constructor(container: Container, program: Command) {
        super(container, program);
    }

    /**
     * Get the service provider name
     */
    public getName(): string {
        return 'RateLimitingServiceProvider';
    }

    /**
     * Register rate limiting and API management services
     */
    public register(): void {
        // Register core components as singletons
        this.container.singleton('RateLimiter', () => new RateLimiter());
        this.container.singleton('CircuitBreaker', () => new CircuitBreaker());
        this.container.singleton('ApiManager', (container) => {
            const rateLimiter = container.resolve<RateLimiter>('RateLimiter');
            const circuitBreaker = container.resolve<CircuitBreaker>('CircuitBreaker');
            return new ApiManager(rateLimiter, circuitBreaker);
        });
    }

    /**
     * Bootstrap rate limiting and API management services
     */
    public async boot(): Promise<void> {
        const rateLimiter = this.container.resolve<RateLimiter>('RateLimiter');
        const circuitBreaker = this.container.resolve<CircuitBreaker>('CircuitBreaker');
        const apiManager = this.container.resolve<ApiManager>('ApiManager');

        // Configure default rate limiting for common services
        this.configureDefaultRateLimits(rateLimiter);
        this.configureDefaultCircuitBreakers(circuitBreaker);

        // Add shutdown handlers
        this.setupShutdownHandlers(apiManager);

        console.log('✓ Rate limiting and API management services initialized');
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(service: string): boolean {
        return ['RateLimiter', 'CircuitBreaker', 'ApiManager'].includes(service);
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return ['RateLimiter', 'CircuitBreaker', 'ApiManager'];
    }

    /**
     * Configure default rate limits for common services
     */
    private configureDefaultRateLimits(rateLimiter: RateLimiter): void {
        // Stripe API rate limits
        rateLimiter.configure({
            serviceId: 'stripe',
            strategy: 'token-bucket',
            limit: 100,
            window: 1000, // 1 second
            burst: 120,
            enabled: true
        });

        // Notion API rate limits
        rateLimiter.configure({
            serviceId: 'notion',
            strategy: 'sliding-window',
            limit: 3,
            window: 1000, // 1 second
            enabled: true
        });

        // GitHub API rate limits
        rateLimiter.configure({
            serviceId: 'github',
            strategy: 'fixed-window',
            limit: 5000,
            window: 60 * 60 * 1000, // 1 hour
            enabled: true
        });

        // Generic API service defaults
        rateLimiter.configure({
            serviceId: 'default',
            strategy: 'sliding-window',
            limit: 10,
            window: 1000, // 1 second
            enabled: true
        });
    }

    /**
     * Configure default circuit breakers
     */
    private configureDefaultCircuitBreakers(circuitBreaker: CircuitBreaker): void {
        // High availability services
        const highAvailabilityConfig = {
            failureThreshold: 5,
            recoveryTimeout: 30 * 1000, // 30 seconds
            successThreshold: 3,
            monitoringWindow: 60 * 1000, // 1 minute
            enabled: true
        };

        // Stripe circuit breaker
        circuitBreaker.configure({
            serviceId: 'stripe',
            ...highAvailabilityConfig
        });

        // Notion circuit breaker
        circuitBreaker.configure({
            serviceId: 'notion',
            ...highAvailabilityConfig,
            failureThreshold: 3 // More sensitive for content APIs
        });

        // GitHub circuit breaker
        circuitBreaker.configure({
            serviceId: 'github',
            ...highAvailabilityConfig,
            recoveryTimeout: 60 * 1000 // Longer recovery for code hosting
        });

        // Default circuit breaker
        circuitBreaker.configure({
            serviceId: 'default',
            ...highAvailabilityConfig
        });

        // Set up default fallbacks
        this.setupDefaultFallbacks(circuitBreaker);
    }

    /**
     * Setup default fallback functions
     */
    private setupDefaultFallbacks(circuitBreaker: CircuitBreaker): void {
        // Stripe fallback - use cached data or queue operation
        circuitBreaker.setFallback('stripe', async (error, serviceId) => {
            return {
                success: false,
                error: `Stripe service temporarily unavailable: ${error.message}`,
                fallback: true,
                serviceId
            };
        });

        // Notion fallback - return cached content
        circuitBreaker.setFallback('notion', async (error, serviceId) => {
            return {
                success: false,
                error: `Notion service temporarily unavailable: ${error.message}`,
                fallback: true,
                serviceId
            };
        });

        // GitHub fallback - use local git operations
        circuitBreaker.setFallback('github', async (error, serviceId) => {
            return {
                success: false,
                error: `GitHub service temporarily unavailable: ${error.message}`,
                fallback: true,
                serviceId
            };
        });
    }

    /**
     * Setup shutdown handlers for graceful termination
     */
    private setupShutdownHandlers(apiManager: ApiManager): void {
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);

            try {
                await apiManager.shutdown();
                console.log('✓ API manager shut down gracefully');
                process.exit(0);
            } catch (error) {
                console.error('✗ Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
} 