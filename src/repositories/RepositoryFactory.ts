/**
 * RepositoryFactory - Factory for creating repository instances
 * 
 * @package     @imajin/cli
 * @subpackage  repositories
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Repository interface and implementations
 * - Container for dependency injection
 * - Logger for factory operations
 * - Event system for repository lifecycle
 */

import type { EventEmitter } from 'events';
import type { Container } from '../container/Container.js';
import { SystemError } from '../exceptions/index.js';
import type { Logger } from '../logging/Logger.js';
// Universal types removed - now using dynamic business context types
import type { RepositoryFactory as IRepositoryFactory, Repository, RepositoryOptions } from './Repository.js';
import { MemoryRepository } from './implementations/MemoryRepository.js';

/**
 * Repository factory configuration
 */
interface RepositoryFactoryConfig {
    defaultDataSource: 'memory' | 'file' | 'database' | 'api';
    caching: {
        enabled: boolean;
        defaultTtl: number;
        maxSize: number;
    };
    validation: {
        enabled: boolean;
        strict: boolean;
    };
}

/**
 * Repository factory for creating and managing repository instances
 */
export class RepositoryFactory implements IRepositoryFactory {
    private readonly container: Container;
    private readonly logger: Logger;
    private readonly eventEmitter: EventEmitter;
    private readonly config: RepositoryFactoryConfig;
    private readonly factories: Map<string, (options?: RepositoryOptions) => Repository<any, any>>;
    private readonly instances: Map<string, Repository<any, any>>;

    constructor(
        container: Container,
        config: Partial<RepositoryFactoryConfig> = {}
    ) {
        this.container = container;
        this.logger = container.resolve<Logger>('logger');
        this.eventEmitter = container.resolve<EventEmitter>('eventEmitter');

        this.config = {
            defaultDataSource: 'memory',
            caching: {
                enabled: true,
                defaultTtl: 300000, // 5 minutes
                maxSize: 1000
            },
            validation: {
                enabled: true,
                strict: false
            },
            ...config
        };

        this.factories = new Map();
        this.instances = new Map();

        this.registerDefaultRepositories();
    }

    /**
     * Create a repository instance for the specified entity type
     */
    create<T extends Record<string, any>, TKey = string>(
        entityType: string,
        options: RepositoryOptions = {}
    ): Repository<T, TKey> {
        const instanceKey = `${entityType}:${JSON.stringify(options)}`;

        // Return existing instance if available
        if (this.instances.has(instanceKey)) {
            return this.instances.get(instanceKey)!;
        }

        // Merge options with factory defaults
        const mergedOptions: RepositoryOptions = {
            dataSource: this.config.defaultDataSource,
            caching: {
                enabled: this.config.caching.enabled,
                ttl: this.config.caching.defaultTtl,
                maxSize: this.config.caching.maxSize
            },
            validation: {
                enabled: this.config.validation.enabled,
                strict: this.config.validation.strict
            },
            ...options
        };

        // Create repository based on data source
        const repository = this.createRepository<T, TKey>(entityType, mergedOptions);

        // Cache the instance
        this.instances.set(instanceKey, repository);

        // Emit factory event
        this.eventEmitter.emit('repository:created', {
            entityType,
            dataSource: mergedOptions.dataSource,
            options: mergedOptions
        });

        this.logger.info('Repository created', {
            entityType,
            dataSource: mergedOptions.dataSource,
            instanceKey
        });

        return repository;
    }

    /**
     * Register a custom repository factory
     */
    register<T extends Record<string, any>, TKey = string>(
        entityType: string,
        factory: (options?: RepositoryOptions) => Repository<T, TKey>
    ): void {
        this.factories.set(entityType, factory);

        this.logger.info('Repository factory registered', { entityType });

        this.eventEmitter.emit('repository:factory-registered', {
            entityType
        });
    }

    /**
     * Get all available repository types
     */
    getAvailableTypes(): string[] {
        return Array.from(this.factories.keys());
    }

    /**
     * Get repository statistics
     */
    getStats(): {
        totalFactories: number;
        totalInstances: number;
        instancesByType: Record<string, number>;
        instancesByDataSource: Record<string, number>;
    } {
        const instancesByType: Record<string, number> = {};
        const instancesByDataSource: Record<string, number> = {};

        for (const [key] of this.instances) {
            const [entityType] = key.split(':');
            if (entityType) {
                instancesByType[entityType] = (instancesByType[entityType] ?? 0) + 1;
            }

            // Extract data source from repository (this is a simplified approach)
            const dataSource = 'memory'; // Default, would need proper extraction
            instancesByDataSource[dataSource] = (instancesByDataSource[dataSource] ?? 0) + 1;
        }

        return {
            totalFactories: this.factories.size,
            totalInstances: this.instances.size,
            instancesByType,
            instancesByDataSource
        };
    }

    /**
     * Clear all cached repository instances
     */
    clearInstances(): void {
        this.instances.clear();
        this.logger.info('Repository instances cleared');

        this.eventEmitter.emit('repository:instances-cleared', {
            timestamp: new Date()
        });
    }

    /**
     * Get repository instance by entity type and options
     */
    getInstance<T extends Record<string, any>, TKey = string>(
        entityType: string,
        options: RepositoryOptions = {}
    ): Repository<T, TKey> | undefined {
        const instanceKey = `${entityType}:${JSON.stringify(options)}`;
        return this.instances.get(instanceKey);
    }

    /**
     * Check if a repository factory is registered for the entity type
     */
    hasFactory(entityType: string): boolean {
        return this.factories.has(entityType);
    }

    /**
     * Remove a repository factory
     */
    unregister(entityType: string): boolean {
        const removed = this.factories.delete(entityType);

        if (removed) {
            this.logger.info('Repository factory unregistered', { entityType });

            this.eventEmitter.emit('repository:factory-unregistered', {
                entityType
            });
        }

        return removed;
    }

    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================

    private createRepository<T extends Record<string, any>, TKey = string>(
        entityType: string,
        options: RepositoryOptions
    ): Repository<T, TKey> {
        // Check for custom factory first
        if (this.factories.has(entityType)) {
            const factory = this.factories.get(entityType)!;
            return factory(options);
        }

        // Create repository based on data source
        switch (options.dataSource) {
            case 'memory':
                return new MemoryRepository<T, TKey>(
                    `${entityType}Repository`,
                    this.logger,
                    this.eventEmitter,
                    options
                );

            case 'file':
                throw SystemError.dependencyMissing('File repository implementation', {
                    entityType,
                    dataSource: options.dataSource
                });

            case 'database':
                throw SystemError.dependencyMissing('Database repository implementation', {
                    entityType,
                    dataSource: options.dataSource
                });

            case 'api':
                throw SystemError.dependencyMissing('API repository implementation', {
                    entityType,
                    dataSource: options.dataSource
                });

            default:
                throw SystemError.configError(`Unknown data source: ${options.dataSource}`, {
                    entityType,
                    dataSource: options.dataSource
                });
        }
    }

    private registerDefaultRepositories(): void {
        // Register universal element repositories
        this.register('UniversalCustomer', (options) =>
            new MemoryRepository(
                'UniversalCustomerRepository',
                this.logger,
                this.eventEmitter,
                options
            )
        );

        this.register('UniversalPayment', (options) =>
            new MemoryRepository(
                'UniversalPaymentRepository',
                this.logger,
                this.eventEmitter,
                options
            )
        );

        this.logger.info('Default repository factories registered');
    }
}

/**
 * Repository provider for service container integration
 */
export class RepositoryProvider {
    private readonly factory: RepositoryFactory;

    constructor(container: Container) {
        this.factory = new RepositoryFactory(container);
    }

    /**
     * Get repository for entity type
     */
    getRepository<T extends Record<string, any>, TKey = string>(
        entityType: string,
        options?: RepositoryOptions
    ): Repository<T, TKey> {
        return this.factory.create<T, TKey>(entityType, options);
    }

    /**
     * Get repository factory
     */
    getFactory(): RepositoryFactory {
        return this.factory;
    }

    /**
     * Register custom repository
     */
    register<T extends Record<string, any>, TKey = string>(
        entityType: string,
        factory: (options?: RepositoryOptions) => Repository<T, TKey>
    ): void {
        this.factory.register(entityType, factory);
    }
} 