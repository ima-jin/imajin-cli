/**
 * BaseService - Abstract base class for business logic services
 * 
 * @package     @imajin/cli
 * @subpackage  services
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-18
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Container for dependency injection
 * - Event system for real-time coordination
 * - Exception system for error handling
 * - Logging system for observability
 */

import type { EventEmitter } from 'events';
import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import type { ServiceConfig, ServiceHealth, ServiceMetrics } from './interfaces/ServiceInterface.js';
import { ServiceStatus } from './interfaces/ServiceInterface.js';

export abstract class BaseService {
    protected container: Container;
    protected logger: Logger;
    protected config: ServiceConfig;
    protected status: ServiceStatus = ServiceStatus.INACTIVE;
    protected metrics: ServiceMetrics;
    protected eventEmitter: EventEmitter;

    constructor(
        container: Container,
        config: ServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        this.container = container;
        this.config = config;
        this.logger = container.resolve<Logger>('logger');
        this.eventEmitter = eventEmitter || container.resolve<EventEmitter>('eventEmitter');

        this.metrics = {
            operationsCount: 0,
            errorsCount: 0,
            averageResponseTime: 0,
            lastActivity: new Date(),
            startTime: new Date()
        };
    }

    /**
     * Get service name
     */
    public abstract getName(): string;

    /**
     * Get service version
     */
    public abstract getVersion(): string;

    /**
     * Initialize the service
     */
    public async initialize(): Promise<void> {
        this.status = ServiceStatus.INITIALIZING;
        this.logger.info(`Initializing service: ${this.getName()}`);

        try {
            await this.onInitialize();
            this.status = ServiceStatus.ACTIVE;
            this.logger.info(`Service initialized: ${this.getName()}`);
            this.emit('service:initialized', { service: this.getName() });
        } catch (error) {
            this.status = ServiceStatus.ERROR;
            this.logger.error(`Failed to initialize service: ${this.getName()}`, error as Error);
            this.emit('service:error', { service: this.getName(), error });
            throw error;
        }
    }

    /**
     * Shutdown the service
     */
    public async shutdown(): Promise<void> {
        this.status = ServiceStatus.SHUTTING_DOWN;
        this.logger.info(`Shutting down service: ${this.getName()}`);

        try {
            await this.onShutdown();
            this.status = ServiceStatus.INACTIVE;
            this.logger.info(`Service shut down: ${this.getName()}`);
            this.emit('service:shutdown', { service: this.getName() });
        } catch (error) {
            this.status = ServiceStatus.ERROR;
            this.logger.error(`Failed to shutdown service: ${this.getName()}`, error as Error);
            this.emit('service:error', { service: this.getName(), error });
            throw error;
        }
    }

    /**
     * Get service health status
     */
    public async getHealth(): Promise<ServiceHealth> {
        const health: ServiceHealth = {
            status: this.status,
            name: this.getName(),
            version: this.getVersion(),
            uptime: Date.now() - this.metrics.startTime.getTime(),
            metrics: { ...this.metrics },
            checks: []
        };

        try {
            const customChecks = await this.onHealthCheck();
            health.checks = customChecks;

            // Determine overall health based on checks
            const hasFailedChecks = customChecks.some(check => !check.healthy);
            if (hasFailedChecks && this.status === ServiceStatus.ACTIVE) {
                health.status = ServiceStatus.DEGRADED;
            }
        } catch (error) {
            health.status = ServiceStatus.ERROR;
            health.checks = [{
                name: 'health-check',
                healthy: false,
                message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }];
        }

        return health;
    }

    /**
     * Execute an operation with metrics tracking
     */
    protected async execute<T>(
        operationName: string,
        operation: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();
        this.metrics.operationsCount++;
        this.metrics.lastActivity = new Date();

        try {
            this.logger.debug(`Executing operation: ${operationName}`, {
                service: this.getName()
            });

            const result = await operation();

            const duration = Date.now() - startTime;
            this.updateAverageResponseTime(duration);

            this.logger.debug(`Operation completed: ${operationName}`, {
                service: this.getName(),
                duration
            });

            this.emit('service:operation', {
                service: this.getName(),
                operation: operationName,
                duration,
                success: true
            });

            return result;
        } catch (error) {
            this.metrics.errorsCount++;
            const duration = Date.now() - startTime;

            this.logger.error(`Operation failed: ${operationName} (service: ${this.getName()}, duration: ${duration}ms)`, error as Error);

            this.emit('service:operation', {
                service: this.getName(),
                operation: operationName,
                duration,
                success: false,
                error
            });

            throw error;
        }
    }

    /**
     * Emit event through the event system
     */
    protected emit(event: string, data: any): void {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, data);
        }
    }

    /**
     * Get current service status
     */
    public getStatus(): ServiceStatus {
        return this.status;
    }

    /**
     * Get service metrics
     */
    public getMetrics(): ServiceMetrics {
        return { ...this.metrics };
    }

    /**
     * Get service configuration
     */
    public getConfig(): ServiceConfig {
        return { ...this.config };
    }

    /**
     * Update service configuration
     */
    public updateConfig(newConfig: Partial<ServiceConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('service:config-updated', {
            service: this.getName(),
            config: this.config
        });
    }

    // Protected lifecycle methods to be overridden by implementations

    /**
     * Called during service initialization
     * Override this method to implement service-specific initialization logic
     */
    protected async onInitialize(): Promise<void> {
        // Default implementation - no-op
    }

    /**
     * Called during service shutdown
     * Override this method to implement service-specific cleanup logic
     */
    protected async onShutdown(): Promise<void> {
        // Default implementation - no-op
    }

    /**
     * Called during health checks
     * Override this method to implement service-specific health checks
     */
    protected async onHealthCheck(): Promise<Array<{ name: string; healthy: boolean; message?: string; }>> {
        return [
            {
                name: 'basic-status',
                healthy: this.status === ServiceStatus.ACTIVE,
                message: `Service status: ${this.status}`
            }
        ];
    }

    /**
     * Update average response time using exponential moving average
     */
    private updateAverageResponseTime(duration: number): void {
        const alpha = 0.1; // Smoothing factor
        this.metrics.averageResponseTime =
            this.metrics.averageResponseTime * (1 - alpha) + duration * alpha;
    }
} 