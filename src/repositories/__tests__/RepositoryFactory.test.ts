/**
 * RepositoryFactory Tests
 *
 * Comprehensive test suite for repository factory pattern covering
 * instance creation, caching, custom factory registration, business
 * context integration, and configuration management.
 *
 * @package     @imajin/cli
 * @subpackage  repositories/__tests__
 */

import { EventEmitter } from 'node:events';
import { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';
import { RepositoryFactory, RepositoryProvider } from '../RepositoryFactory.js';
import type { Repository, RepositoryOptions } from '../Repository.js';
import { MemoryRepository } from '../implementations/MemoryRepository.js';

describe('RepositoryFactory', () => {
    let container: Container;
    let logger: Logger;
    let eventEmitter: EventEmitter;
    let factory: RepositoryFactory;

    beforeEach(() => {
        container = new Container();
        logger = new Logger({ level: 'error' });
        eventEmitter = new EventEmitter();

        container.instance('logger', logger);
        container.instance('eventEmitter', eventEmitter);
    });

    // =====================================================================
    // Constructor & Initialization
    // =====================================================================
    describe('Constructor & Initialization', () => {
        it('should initialize with default configuration', () => {
            factory = new RepositoryFactory(container);

            const stats = factory.getStats();
            expect(stats.totalFactories).toBeGreaterThanOrEqual(0);
            expect(stats.totalInstances).toBe(0);
        });

        it('should initialize with custom configuration', () => {
            factory = new RepositoryFactory(container, {
                defaultDataSource: 'memory',
                caching: {
                    enabled: false,
                    defaultTtl: 60000,
                    maxSize: 500
                },
                validation: {
                    enabled: false,
                    strict: true
                }
            });

            // Factory should be initialized
            expect(factory).toBeDefined();
        });

        it('should merge partial config with defaults', () => {
            factory = new RepositoryFactory(container, {
                caching: {
                    enabled: false,
                    defaultTtl: 120000,
                    maxSize: 2000
                }
            });

            // Should use custom caching but default validation
            expect(factory).toBeDefined();
            const stats = factory.getStats();
            expect(stats).toBeDefined();
        });
    });

    // =====================================================================
    // create() Method
    // =====================================================================
    describe('create() Method', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should create memory repository by default', () => {
            const repository = factory.create('TestEntity');

            expect(repository).toBeDefined();
            expect(repository).toBeInstanceOf(MemoryRepository);
        });

        it('should merge options with factory defaults', () => {
            const repository = factory.create('TestEntity', {
                caching: {
                    enabled: false,
                    ttl: 10000,
                    maxSize: 100
                }
            });

            expect(repository).toBeDefined();
        });

        it('should return cached instance on subsequent calls', () => {
            const repo1 = factory.create('TestEntity');
            const repo2 = factory.create('TestEntity');

            // Should be the same instance
            expect(repo1).toBe(repo2);
        });

        it('should create different instances for different options', () => {
            const repo1 = factory.create('TestEntity', { dataSource: 'memory' });
            const repo2 = factory.create('TestEntity', { dataSource: 'memory', caching: { enabled: false, ttl: 5000, maxSize: 100 } });

            // Should be different instances due to different options
            expect(repo1).not.toBe(repo2);
        });

        it('should emit repository:created event', (done) => {
            eventEmitter.once('repository:created', (data) => {
                expect(data.entityType).toBe('TestEntity');
                expect(data.dataSource).toBe('memory');
                done();
            });

            factory.create('TestEntity');
        });
    });

    // =====================================================================
    // register() Method
    // =====================================================================
    describe('register() Method', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should register custom factory', () => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('CustomEntity', customFactory);

            expect(factory.hasFactory('CustomEntity')).toBe(true);
        });

        it('should use custom factory when creating repository', () => {
            let customFactoryCalled = false;

            const customFactory = (options?: RepositoryOptions) => {
                customFactoryCalled = true;
                return new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);
            };

            factory.register('CustomEntity', customFactory);
            const repository = factory.create('CustomEntity');

            expect(customFactoryCalled).toBe(true);
            expect(repository).toBeDefined();
        });

        it('should emit factory-registered event', (done) => {
            eventEmitter.once('repository:factory-registered', (data) => {
                expect(data.entityType).toBe('CustomEntity');
                done();
            });

            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('CustomEntity', customFactory);
        });
    });

    // =====================================================================
    // getAvailableTypes()
    // =====================================================================
    describe('getAvailableTypes()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should return empty array initially (or business types if registered)', () => {
            const types = factory.getAvailableTypes();

            expect(Array.isArray(types)).toBe(true);
            // May have business types from default registration
        });

        it('should return registered factory types', () => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('Entity1', customFactory);
            factory.register('Entity2', customFactory);
            factory.register('Entity3', customFactory);

            const types = factory.getAvailableTypes();

            expect(types).toContain('Entity1');
            expect(types).toContain('Entity2');
            expect(types).toContain('Entity3');
        });
    });

    // =====================================================================
    // getStats()
    // =====================================================================
    describe('getStats()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should return correct statistics', () => {
            factory.create('Entity1');
            factory.create('Entity2');
            factory.create('Entity1', { caching: { enabled: false, ttl: 1000, maxSize: 10 } });

            const stats = factory.getStats();

            expect(stats.totalInstances).toBe(3);
            expect(stats.instancesByType['Entity1']).toBe(2);
            expect(stats.instancesByType['Entity2']).toBe(1);
        });

        it('should track instances by data source', () => {
            factory.create('Entity1', { dataSource: 'memory' });
            factory.create('Entity2', { dataSource: 'memory' });

            const stats = factory.getStats();

            expect(stats.instancesByDataSource['memory']).toBeGreaterThanOrEqual(2);
        });
    });

    // =====================================================================
    // clearInstances()
    // =====================================================================
    describe('clearInstances()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should clear all cached instances', () => {
            factory.create('Entity1');
            factory.create('Entity2');
            factory.create('Entity3');

            let statsBefore = factory.getStats();
            expect(statsBefore.totalInstances).toBe(3);

            factory.clearInstances();

            let statsAfter = factory.getStats();
            expect(statsAfter.totalInstances).toBe(0);
        });

        it('should emit instances-cleared event', (done) => {
            eventEmitter.once('repository:instances-cleared', (data) => {
                expect(data.timestamp).toBeInstanceOf(Date);
                done();
            });

            factory.clearInstances();
        });
    });

    // =====================================================================
    // getInstance()
    // =====================================================================
    describe('getInstance()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should return existing instance', () => {
            const created = factory.create('TestEntity');
            const retrieved = factory.getInstance('TestEntity');

            expect(retrieved).toBeDefined();
            expect(retrieved).toBe(created);
        });

        it('should return undefined for non-existent instance', () => {
            const retrieved = factory.getInstance('NonExistentEntity');

            expect(retrieved).toBeUndefined();
        });
    });

    // =====================================================================
    // hasFactory()
    // =====================================================================
    describe('hasFactory()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should return true for registered factory', () => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('CustomEntity', customFactory);

            expect(factory.hasFactory('CustomEntity')).toBe(true);
        });

        it('should return false for non-registered factory', () => {
            expect(factory.hasFactory('NonExistentEntity')).toBe(false);
        });
    });

    // =====================================================================
    // unregister()
    // =====================================================================
    describe('unregister()', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should remove factory and return true', () => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('CustomEntity', customFactory);
            expect(factory.hasFactory('CustomEntity')).toBe(true);

            const removed = factory.unregister('CustomEntity');

            expect(removed).toBe(true);
            expect(factory.hasFactory('CustomEntity')).toBe(false);
        });

        it('should return false for non-existent factory', () => {
            const removed = factory.unregister('NonExistentEntity');

            expect(removed).toBe(false);
        });

        it('should emit factory-unregistered event', (done) => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            factory.register('CustomEntity', customFactory);

            eventEmitter.once('repository:factory-unregistered', (data) => {
                expect(data.entityType).toBe('CustomEntity');
                done();
            });

            factory.unregister('CustomEntity');
        });
    });

    // =====================================================================
    // Data Source Handling
    // =====================================================================
    describe('Data Source Handling', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should throw error for file data source', () => {
            expect(() => {
                factory.create('TestEntity', { dataSource: 'file' });
            }).toThrow();
        });

        it('should throw error for database data source', () => {
            expect(() => {
                factory.create('TestEntity', { dataSource: 'database' });
            }).toThrow();
        });

        it('should throw error for api data source', () => {
            expect(() => {
                factory.create('TestEntity', { dataSource: 'api' });
            }).toThrow();
        });
    });

    // =====================================================================
    // Business Context Methods
    // =====================================================================
    describe('Business Context Methods', () => {
        beforeEach(() => {
            factory = new RepositoryFactory(container);
        });

        it('should initialize with business context', async () => {
            await factory.initializeWithBusinessContext();

            // Should complete without errors
            expect(factory).toBeDefined();
        });

        it('should return registered business types', () => {
            const types = factory.getRegisteredBusinessTypes();

            expect(Array.isArray(types)).toBe(true);
            // May be empty if no business context loaded
        });
    });

    // =====================================================================
    // RepositoryProvider
    // =====================================================================
    describe('RepositoryProvider', () => {
        let provider: RepositoryProvider;

        beforeEach(() => {
            provider = new RepositoryProvider(container);
        });

        it('should get repository through provider', () => {
            const repository = provider.getRepository('TestEntity');

            expect(repository).toBeDefined();
        });

        it('should get factory from provider', () => {
            const factoryInstance = provider.getFactory();

            expect(factoryInstance).toBeDefined();
            expect(factoryInstance).toBeInstanceOf(RepositoryFactory);
        });

        it('should register custom factory through provider', () => {
            const customFactory = (options?: RepositoryOptions) =>
                new MemoryRepository<any, string>('CustomRepo', logger, eventEmitter, options);

            provider.register('CustomEntity', customFactory);

            const factoryInstance = provider.getFactory();
            expect(factoryInstance.hasFactory('CustomEntity')).toBe(true);
        });
    });
});
