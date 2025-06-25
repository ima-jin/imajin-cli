/**
 * ServiceRegistry - Central registry for service discovery and management
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
 * - Event system for service lifecycle events
 * - Logger for service registry operations
 * - Health monitoring and status reporting
 */

import type { EventEmitter } from 'events';
import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import {
    ServiceStatus,
    type IService,
    type IServiceRegistry,
    type ServiceHealth,
    type ServiceRegistrationOptions
} from './interfaces/ServiceInterface.js';

export class ServiceRegistry implements IServiceRegistry {
    private readonly services: Map<string, IService> = new Map();
    private readonly serviceOptions: Map<string, ServiceRegistrationOptions> = new Map();
    private readonly dependencyGraph: Map<string, string[]> = new Map();
    private readonly container: Container;
    private readonly logger: Logger;
    private readonly eventEmitter: EventEmitter;
    private isInitialized = false;
    private shutdownPromise?: Promise<void>;

    constructor(container: Container) {
        this.container = container;
        this.logger = container.resolve<Logger>('logger');
        this.eventEmitter = container.resolve<EventEmitter>('eventEmitter');

        // Set up cleanup on process termination
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    /**
     * Initialize the service registry
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.logger.info('Initializing service registry...');

        try {
            // Initialize services in dependency order
            const serviceNames = this.getSortedServiceNames();

            for (const serviceName of serviceNames) {
                const service = this.services.get(serviceName);
                if (service && service.getStatus() === ServiceStatus.INACTIVE) {
                    await this.initializeService(service);
                }
            }

            this.isInitialized = true;
            this.logger.info('Service registry initialized successfully');
            this.emit('registry:initialized', { servicesCount: this.services.size });
        } catch (error) {
            this.logger.error('Failed to initialize service registry', error as Error);
            throw error;
        }
    }

    /**
     * Register a service with the registry
     */
    public async register(
        service: IService,
        options: ServiceRegistrationOptions = {}
    ): Promise<void> {
        const serviceName = service.getName();

        if (this.services.has(serviceName)) {
            throw new Error(`Service '${serviceName}' is already registered`);
        }

        this.logger.info(`Registering service: ${serviceName}`);

        // Store service and options
        this.services.set(serviceName, service);
        this.serviceOptions.set(serviceName, options);

        // Build dependency graph
        if (options.dependencies) {
            this.dependencyGraph.set(serviceName, options.dependencies);
        }

        // Auto-start if specified and registry is initialized
        if (options.autoStart && this.isInitialized) {
            await this.initializeService(service);
        }

        this.emit('service:registered', {
            service: serviceName,
            options,
            timestamp: new Date()
        });

        this.logger.info(`Service registered: ${serviceName}`);
    }

    /**
     * Unregister a service from the registry
     */
    public async unregister(serviceName: string): Promise<void> {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service '${serviceName}' is not registered`);
        }

        this.logger.info(`Unregistering service: ${serviceName}`);

        // Check for dependent services
        const dependentServices = this.findDependentServices(serviceName);
        if (dependentServices.length > 0) {
            throw new Error(
                `Cannot unregister service '${serviceName}' - it has dependent services: ${dependentServices.join(', ')}`
            );
        }

        // Shutdown service if active
        if (service.getStatus() !== ServiceStatus.INACTIVE) {
            await service.shutdown();
        }

        // Remove from registry
        this.services.delete(serviceName);
        this.serviceOptions.delete(serviceName);
        this.dependencyGraph.delete(serviceName);

        this.emit('service:unregistered', {
            service: serviceName,
            timestamp: new Date()
        });

        this.logger.info(`Service unregistered: ${serviceName}`);
    }

    /**
     * Get a service by name
     */
    public get<T extends IService>(serviceName: string): T | undefined {
        return this.services.get(serviceName) as T | undefined;
    }

    /**
     * Get all registered services
     */
    public getAll(): IService[] {
        return Array.from(this.services.values());
    }

    /**
     * Get services by status
     */
    public getByStatus(status: ServiceStatus): IService[] {
        return this.getAll().filter(service => service.getStatus() === status);
    }

    /**
     * Check if a service exists
     */
    public exists(serviceName: string): boolean {
        return this.services.has(serviceName);
    }

    /**
     * Shutdown all services
     */
    public async shutdown(): Promise<void> {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        this.shutdownPromise = this.performShutdown();
        return this.shutdownPromise;
    }

    /**
     * Get health status of all services
     */
    public async getHealth(): Promise<Record<string, ServiceHealth>> {
        const health: Record<string, ServiceHealth> = {};

        const healthPromises = Array.from(this.services.entries()).map(
            async ([name, service]) => {
                try {
                    health[name] = await service.getHealth();
                } catch (error) {
                    health[name] = {
                        status: ServiceStatus.ERROR,
                        name: service.getName(),
                        version: service.getVersion(),
                        uptime: 0,
                        metrics: service.getMetrics(),
                        checks: [{
                            name: 'health-check',
                            healthy: false,
                            message: error instanceof Error ? error.message : 'Unknown error'
                        }]
                    };
                }
            }
        );

        await Promise.all(healthPromises);
        return health;
    }

    /**
     * Get service registry statistics
     */
    public getStatistics(): {
        total: number;
        byStatus: Record<ServiceStatus, number>;
        dependencies: Record<string, string[]>;
    } {
        const stats = {
            total: this.services.size,
            byStatus: {} as Record<ServiceStatus, number>,
            dependencies: Object.fromEntries(this.dependencyGraph)
        };

        // Initialize status counts
        Object.values(ServiceStatus).forEach(status => {
            stats.byStatus[status] = 0;
        });

        // Count services by status
        this.getAll().forEach(service => {
            const status = service.getStatus();
            stats.byStatus[status]++;
        });

        return stats;
    }

    /**
     * Find services that depend on the given service
     */
    private findDependentServices(serviceName: string): string[] {
        const dependents: string[] = [];

        for (const [service, dependencies] of this.dependencyGraph) {
            if (dependencies.includes(serviceName)) {
                dependents.push(service);
            }
        }

        return dependents;
    }

    /**
     * Get service names sorted by dependency order
     */
    private getSortedServiceNames(): string[] {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const sorted: string[] = [];

        const visit = (serviceName: string) => {
            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected involving service: ${serviceName}`);
            }

            if (visited.has(serviceName)) {
                return;
            }

            visiting.add(serviceName);

            const dependencies = this.dependencyGraph.get(serviceName) || [];
            for (const dependency of dependencies) {
                if (!this.services.has(dependency)) {
                    throw new Error(
                        `Service '${serviceName}' depends on '${dependency}' which is not registered`
                    );
                }
                visit(dependency);
            }

            visiting.delete(serviceName);
            visited.add(serviceName);
            sorted.push(serviceName);
        };

        for (const serviceName of this.services.keys()) {
            visit(serviceName);
        }

        return sorted;
    }

    /**
     * Initialize a single service
     */
    private async initializeService(service: IService): Promise<void> {
        const serviceName = service.getName();

        try {
            this.logger.debug(`Initializing service: ${serviceName}`);
            await service.initialize();

            this.emit('service:initialized', {
                service: serviceName,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Failed to initialize service: ${serviceName}`, error as Error);

            this.emit('service:initialization-failed', {
                service: serviceName,
                error,
                timestamp: new Date()
            });

            throw error;
        }
    }

    /**
     * Perform shutdown of all services
     */
    private async performShutdown(): Promise<void> {
        this.logger.info('Shutting down service registry...');

        // Get services in reverse dependency order for shutdown
        const serviceNames = this.getSortedServiceNames().reverse();
        const shutdownPromises: Promise<void>[] = [];

        for (const serviceName of serviceNames) {
            const service = this.services.get(serviceName);
            if (service && service.getStatus() !== ServiceStatus.INACTIVE) {
                shutdownPromises.push(this.shutdownService(service));
            }
        }

        try {
            await Promise.all(shutdownPromises);
            this.isInitialized = false;

            this.emit('registry:shutdown', {
                servicesCount: this.services.size,
                timestamp: new Date()
            });

            this.logger.info('Service registry shut down successfully');
        } catch (error) {
            this.logger.error('Failed to shutdown service registry', error as Error);
            throw error;
        }
    }

    /**
     * Shutdown a single service
     */
    private async shutdownService(service: IService): Promise<void> {
        const serviceName = service.getName();

        try {
            this.logger.debug(`Shutting down service: ${serviceName}`);
            await service.shutdown();

            this.emit('service:shutdown', {
                service: serviceName,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Failed to shutdown service: ${serviceName}`, error as Error);

            this.emit('service:shutdown-failed', {
                service: serviceName,
                error,
                timestamp: new Date()
            });

            // Continue with other services even if one fails
        }
    }

    /**
     * Graceful shutdown handler
     */
    private async gracefulShutdown(): Promise<void> {
        try {
            await this.shutdown();
        } catch (error) {
            this.logger.error('Error during graceful shutdown', error as Error);
        }
    }

    /**
     * Emit event through the event system
     */
    private emit(event: string, data: any): void {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, data);
        }
    }
} 