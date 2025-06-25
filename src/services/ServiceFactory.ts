/**
 * ServiceFactory - Factory pattern implementation for service creation
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
 * - Service interfaces and contracts
 * - Configuration management
 * - Logging and error handling
 */

import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import {
    type IService,
    type IServiceFactory,
    type ServiceConfig
} from './interfaces/ServiceInterface.js';

export type ServiceFactoryFunction<T extends IService> = (
    config: ServiceConfig,
    container: Container
) => Promise<T>;

export interface ServiceDefinition<T extends IService> {
    name: string;
    factory: ServiceFactoryFunction<T>;
    dependencies?: string[];
    category?: string;
    description?: string;
}

export class ServiceFactory implements IServiceFactory {
    private readonly factories: Map<string, ServiceFactoryFunction<any>> = new Map();
    private readonly definitions: Map<string, ServiceDefinition<any>> = new Map();
    private readonly container: Container;
    private readonly logger: Logger;

    constructor(container: Container) {
        this.container = container;
        this.logger = container.resolve<Logger>('logger');
    }

    /**
     * Create a service instance
     */
    public async create<T extends IService>(
        serviceType: string,
        config: ServiceConfig,
        container?: Container
    ): Promise<T> {
        const factory = this.factories.get(serviceType);
        if (!factory) {
            throw new Error(`No factory registered for service type: ${serviceType}`);
        }

        const serviceContainer = container || this.container;

        this.logger.debug(`Creating service instance: ${serviceType}`, {
            config: config.name
        });

        try {
            const service = await factory(config, serviceContainer);

            this.logger.info(`Service instance created: ${serviceType}`, {
                serviceName: service.getName(),
                version: service.getVersion()
            });

            return service;
        } catch (error) {
            this.logger.error(`Failed to create service: ${serviceType}`, error as Error);
            throw error;
        }
    }

    /**
     * Register a service factory
     */
    public register<T extends IService>(
        serviceType: string,
        factory: ServiceFactoryFunction<T>,
        definition?: Partial<ServiceDefinition<T>>
    ): void {
        if (this.factories.has(serviceType)) {
            throw new Error(`Service factory already registered for type: ${serviceType}`);
        }

        this.factories.set(serviceType, factory);

        // Store service definition if provided
        if (definition) {
            this.definitions.set(serviceType, {
                name: serviceType,
                factory,
                ...definition
            });
        }

        this.logger.info(`Service factory registered: ${serviceType}`);
    }

    /**
     * Register multiple service factories
     */
    public registerBatch<T extends IService>(
        definitions: ServiceDefinition<T>[]
    ): void {
        for (const definition of definitions) {
            this.register(definition.name, definition.factory, definition);
        }
    }

    /**
     * Unregister a service factory
     */
    public unregister(serviceType: string): void {
        if (!this.factories.has(serviceType)) {
            throw new Error(`No factory registered for service type: ${serviceType}`);
        }

        this.factories.delete(serviceType);
        this.definitions.delete(serviceType);

        this.logger.info(`Service factory unregistered: ${serviceType}`);
    }

    /**
     * Get available service types
     */
    public getAvailableTypes(): string[] {
        return Array.from(this.factories.keys());
    }

    /**
     * Get service definitions
     */
    public getDefinitions(): ServiceDefinition<any>[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Get service definition by type
     */
    public getDefinition(serviceType: string): ServiceDefinition<any> | undefined {
        return this.definitions.get(serviceType);
    }

    /**
     * Check if a service type is registered
     */
    public isRegistered(serviceType: string): boolean {
        return this.factories.has(serviceType);
    }

    /**
     * Get service types by category
     */
    public getTypesByCategory(category: string): string[] {
        return Array.from(this.definitions.values())
            .filter(def => def.category === category)
            .map(def => def.name);
    }

    /**
     * Create multiple services from configurations
     */
    public async createBatch(
        serviceConfigs: Array<{ type: string; config: ServiceConfig }>,
        container?: Container
    ): Promise<IService[]> {
        const services: IService[] = [];
        const serviceContainer = container || this.container;

        for (const { type, config } of serviceConfigs) {
            try {
                const service = await this.create(type, config, serviceContainer);
                services.push(service);
            } catch (error) {
                this.logger.error(`Failed to create service in batch: ${type}`, error as Error);
                // Continue with other services
            }
        }

        return services;
    }

    /**
     * Validate service dependencies
     */
    public validateDependencies(serviceType: string): string[] {
        const definition = this.definitions.get(serviceType);
        if (!definition?.dependencies) {
            return [];
        }

        const missingDependencies: string[] = [];

        for (const dependency of definition.dependencies) {
            if (!this.isRegistered(dependency)) {
                missingDependencies.push(dependency);
            }
        }

        return missingDependencies;
    }

    /**
     * Get service creation order based on dependencies
     */
    public getCreationOrder(serviceTypes: string[]): string[] {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const ordered: string[] = [];

        const visit = (serviceType: string) => {
            if (visiting.has(serviceType)) {
                throw new Error(`Circular dependency detected for service: ${serviceType}`);
            }

            if (visited.has(serviceType)) {
                return;
            }

            visiting.add(serviceType);

            const definition = this.definitions.get(serviceType);
            if (definition?.dependencies) {
                for (const dependency of definition.dependencies) {
                    if (serviceTypes.includes(dependency)) {
                        visit(dependency);
                    }
                }
            }

            visiting.delete(serviceType);
            visited.add(serviceType);
            ordered.push(serviceType);
        };

        for (const serviceType of serviceTypes) {
            visit(serviceType);
        }

        return ordered;
    }

    /**
     * Get factory statistics
     */
    public getStatistics(): {
        totalFactories: number;
        byCategory: Record<string, number>;
        withDependencies: number;
    } {
        const stats = {
            totalFactories: this.factories.size,
            byCategory: {} as Record<string, number>,
            withDependencies: 0
        };

        for (const definition of this.definitions.values()) {
            // Count by category
            const category = definition.category ?? 'uncategorized';
            stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1;

            // Count services with dependencies
            if (definition.dependencies && definition.dependencies.length > 0) {
                stats.withDependencies++;
            }
        }

        return stats;
    }

    /**
     * Create service with dependency injection
     */
    public async createWithDependencies<T extends IService>(
        serviceType: string,
        config: ServiceConfig,
        container?: Container
    ): Promise<T> {
        const serviceContainer = container ?? this.container;

        // Check and resolve dependencies first
        const definition = this.definitions.get(serviceType);
        if (definition?.dependencies) {
            await this.ensureDependencies(definition.dependencies, serviceContainer);
        }

        return this.create<T>(serviceType, config, serviceContainer);
    }

    /**
     * Ensure dependencies are available in the container
     */
    private async ensureDependencies(
        dependencies: string[],
        container: Container
    ): Promise<void> {
        for (const dependency of dependencies) {
            try {
                // Try to resolve the dependency from the container
                container.resolve(dependency);
            } catch {
                // If dependency is not available, try to create it if it's a registered service type
                if (this.isRegistered(dependency)) {
                    this.logger.debug(`Auto-creating dependency: ${dependency}`);

                    const dependencyConfig: ServiceConfig = {
                        name: dependency,
                        enabled: true
                    };

                    const dependencyService = await this.create(dependency, dependencyConfig, container);
                    container.singleton(dependency, () => dependencyService);
                } else {
                    throw new Error(`Required dependency '${dependency}' is not available and cannot be auto-created`);
                }
            }
        }
    }
} 