/**
 * ServiceRegistry Tests
 *
 * Comprehensive test suite for service registry covering registration,
 * discovery, lifecycle management, health monitoring, and dependency resolution.
 *
 * @package     @imajin/cli
 * @subpackage  services/__tests__
 */

import { EventEmitter } from 'node:events';
import { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';
import { ServiceRegistry } from '../ServiceRegistry.js';
import {
    IService,
    ServiceStatus,
    ServiceHealth,
    ServiceMetrics,
    ServiceConfig
} from '../interfaces/ServiceInterface.js';

// Mock Service Implementation
class MockService implements IService {
    private status: ServiceStatus = ServiceStatus.INACTIVE;
    private initCalls = 0;
    private shutdownCalls = 0;
    public shouldFailInit = false;
    public shouldFailShutdown = false;
    public shouldFailHealth = false;

    constructor(
        private readonly name: string,
        private readonly version: string = '1.0.0'
    ) {}

    getName(): string {
        return this.name;
    }

    getVersion(): string {
        return this.version;
    }

    getStatus(): ServiceStatus {
        return this.status;
    }

    getMetrics(): ServiceMetrics {
        return {
            operationsCount: 0,
            errorsCount: 0,
            averageResponseTime: 0,
            lastActivity: new Date(),
            startTime: new Date()
        };
    }

    getConfig(): ServiceConfig {
        return {
            name: this.name,
            enabled: true,
            timeout: 5000
        };
    }

    async initialize(): Promise<void> {
        this.initCalls++;
        if (this.shouldFailInit) {
            throw new Error('Init failed');
        }
        this.status = ServiceStatus.ACTIVE;
    }

    async shutdown(): Promise<void> {
        this.shutdownCalls++;
        if (this.shouldFailShutdown) {
            throw new Error('Shutdown failed');
        }
        this.status = ServiceStatus.INACTIVE;
    }

    async getHealth(): Promise<ServiceHealth> {
        if (this.shouldFailHealth) {
            throw new Error('Health check failed');
        }
        return {
            status: this.status,
            name: this.name,
            version: this.version,
            uptime: 100,
            metrics: this.getMetrics(),
            checks: []
        };
    }

    updateConfig(_config: Partial<ServiceConfig>): void {
        // No-op for tests
    }

    getInitCalls(): number {
        return this.initCalls;
    }

    getShutdownCalls(): number {
        return this.shutdownCalls;
    }
}

describe('ServiceRegistry', () => {
    let registry: ServiceRegistry;
    let container: Container;
    let logger: Logger;
    let eventEmitter: EventEmitter;

    beforeEach(() => {
        container = new Container();
        logger = new Logger({ level: 'error' });
        eventEmitter = new EventEmitter();

        container.instance('logger', logger);
        container.instance('eventEmitter', eventEmitter);

        registry = new ServiceRegistry(container);
    });

    afterEach(() => {
        // Clean up event listeners
        eventEmitter.removeAllListeners();
    });

    // =====================================================================
    // Registration
    // =====================================================================
    describe('Registration', () => {
        it('should register a service', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            expect(registry.exists('test-service')).toBe(true);
        });

        it('should register service with options', async () => {
            const service = new MockService('test-service');

            await registry.register(service, {
                autoStart: false,
                dependencies: []
            });

            expect(registry.exists('test-service')).toBe(true);
        });

        it('should throw error when registering duplicate service', async () => {
            const service1 = new MockService('duplicate');
            const service2 = new MockService('duplicate');

            await registry.register(service1);

            await expect(registry.register(service2)).rejects.toThrow(
                "Service 'duplicate' is already registered"
            );
        });

        it('should emit service:registered event', async () => {
            const service = new MockService('test-service');

            let eventData: any = null;
            eventEmitter.once('service:registered', (data) => {
                eventData = data;
            });

            await registry.register(service);

            expect(eventData).toMatchObject({
                service: 'test-service',
                options: {}
            });
        });

        it('should auto-start service when specified and registry is initialized', async () => {
            const service = new MockService('auto-start');

            await registry.initialize();
            await registry.register(service, { autoStart: true });

            expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
        });
    });

    // =====================================================================
    // Unregistration
    // =====================================================================
    describe('Unregistration', () => {
        it('should unregister an inactive service', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.unregister('test-service');

            expect(registry.exists('test-service')).toBe(false);
        });

        it('should shutdown active service before unregistering', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.initialize();
            await registry.unregister('test-service');

            expect(service.getShutdownCalls()).toBe(1);
            expect(registry.exists('test-service')).toBe(false);
        });

        it('should throw error when unregistering non-existent service', async () => {
            await expect(registry.unregister('nonexistent')).rejects.toThrow(
                "Service 'nonexistent' is not registered"
            );
        });

        it('should prevent unregistering service with dependents', async () => {
            const serviceA = new MockService('service-a');
            const serviceB = new MockService('service-b');

            await registry.register(serviceA);
            await registry.register(serviceB, { dependencies: ['service-a'] });

            await expect(registry.unregister('service-a')).rejects.toThrow(
                'Cannot unregister service'
            );
        });

        it('should emit service:unregistered event', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            let eventData: any = null;
            eventEmitter.once('service:unregistered', (data) => {
                eventData = data;
            });

            await registry.unregister('test-service');

            expect(eventData).toMatchObject({
                service: 'test-service'
            });
        });
    });

    // =====================================================================
    // Service Lookup
    // =====================================================================
    describe('Service Lookup', () => {
        it('should get registered service', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            const retrieved = registry.get('test-service');

            expect(retrieved).toBe(service);
        });

        it('should return undefined for non-existent service', () => {
            const retrieved = registry.get('nonexistent');

            expect(retrieved).toBeUndefined();
        });

        it('should check if service exists', async () => {
            const service = new MockService('test-service');

            expect(registry.exists('test-service')).toBe(false);

            await registry.register(service);

            expect(registry.exists('test-service')).toBe(true);
        });

        it('should get all services', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');

            await registry.register(service1);
            await registry.register(service2);

            const all = registry.getAll();

            expect(all).toHaveLength(2);
            expect(all).toContain(service1);
            expect(all).toContain(service2);
        });

        it('should get services by status', async () => {
            const activeService = new MockService('active');
            const inactiveService = new MockService('inactive');

            await registry.register(activeService);
            await registry.register(inactiveService);
            await registry.initialize();

            const activeServices = registry.getByStatus(ServiceStatus.ACTIVE);

            expect(activeServices).toContain(activeService);
            expect(activeServices).toContain(inactiveService);
        });
    });

    // =====================================================================
    // Initialization
    // =====================================================================
    describe('Initialization', () => {
        it('should initialize all services', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');

            await registry.register(service1);
            await registry.register(service2);

            await registry.initialize();

            expect(service1.getStatus()).toBe(ServiceStatus.ACTIVE);
            expect(service2.getStatus()).toBe(ServiceStatus.ACTIVE);
        });

        it('should initialize services in dependency order', async () => {
            const initOrder: string[] = [];

            class OrderTrackingService extends MockService {
                async initialize(): Promise<void> {
                    initOrder.push(this.getName());
                    await super.initialize();
                }
            }

            const serviceA = new OrderTrackingService('service-a');
            const serviceB = new OrderTrackingService('service-b');

            await registry.register(serviceA);
            await registry.register(serviceB, { dependencies: ['service-a'] });

            await registry.initialize();

            expect(initOrder).toEqual(['service-a', 'service-b']);
        });

        it('should emit registry:initialized event', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            let eventData: any = null;
            eventEmitter.once('registry:initialized', (data) => {
                eventData = data;
            });

            await registry.initialize();

            expect(eventData).toMatchObject({
                servicesCount: 1
            });
        });

        it('should not initialize twice', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            await registry.initialize();
            await registry.initialize();

            expect(service.getInitCalls()).toBe(1);
        });

        it('should throw error on circular dependencies', async () => {
            const serviceA = new MockService('service-a');
            const serviceB = new MockService('service-b');

            await registry.register(serviceA, { dependencies: ['service-b'] });
            await registry.register(serviceB, { dependencies: ['service-a'] });

            await expect(registry.initialize()).rejects.toThrow('Circular dependency');
        });

        it('should throw error on missing dependency', async () => {
            const service = new MockService('service-a');

            await registry.register(service, { dependencies: ['nonexistent'] });

            await expect(registry.initialize()).rejects.toThrow(
                'is not registered'
            );
        });

        it('should emit service:initialized event for each service', async () => {
            const service = new MockService('test-service');

            await registry.register(service);

            const events: string[] = [];
            eventEmitter.on('service:initialized', (data) => {
                events.push(data.service);
            });

            await registry.initialize();

            expect(events).toContain('test-service');
        });

        it('should handle initialization failure', async () => {
            const service = new MockService('failing-service');
            service.shouldFailInit = true;

            await registry.register(service);

            await expect(registry.initialize()).rejects.toThrow('Init failed');
        });
    });

    // =====================================================================
    // Shutdown
    // =====================================================================
    describe('Shutdown', () => {
        it('should shutdown all active services', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');

            await registry.register(service1);
            await registry.register(service2);
            await registry.initialize();

            await registry.shutdown();

            expect(service1.getShutdownCalls()).toBe(1);
            expect(service2.getShutdownCalls()).toBe(1);
        });

        it('should shutdown services in reverse dependency order', async () => {
            const shutdownOrder: string[] = [];

            class OrderTrackingService extends MockService {
                async shutdown(): Promise<void> {
                    shutdownOrder.push(this.getName());
                    await super.shutdown();
                }
            }

            const serviceA = new OrderTrackingService('service-a');
            const serviceB = new OrderTrackingService('service-b');

            await registry.register(serviceA);
            await registry.register(serviceB, { dependencies: ['service-a'] });
            await registry.initialize();

            await registry.shutdown();

            expect(shutdownOrder).toEqual(['service-b', 'service-a']);
        });

        it('should emit registry:shutdown event', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.initialize();

            let eventData: any = null;
            eventEmitter.once('registry:shutdown', (data) => {
                eventData = data;
            });

            await registry.shutdown();

            expect(eventData).toMatchObject({
                servicesCount: 1
            });
        });

        it('should handle shutdown idempotently', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.initialize();

            await registry.shutdown();
            await registry.shutdown();

            expect(service.getShutdownCalls()).toBe(1);
        });

        it('should continue shutdown even if service fails', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');
            service1.shouldFailShutdown = true;

            await registry.register(service1);
            await registry.register(service2);
            await registry.initialize();

            await registry.shutdown();

            // Service 2 should still be shut down
            expect(service2.getShutdownCalls()).toBe(1);
        });
    });

    // =====================================================================
    // Health Monitoring
    // =====================================================================
    describe('Health Monitoring', () => {
        it('should get health of all services', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');

            await registry.register(service1);
            await registry.register(service2);
            await registry.initialize();

            const health = await registry.getHealth();

            expect(health).toHaveProperty('service-1');
            expect(health).toHaveProperty('service-2');
        });

        it('should handle health check failures gracefully', async () => {
            const service = new MockService('failing-service');
            service.shouldFailHealth = true;

            await registry.register(service);
            await registry.initialize();

            const health = await registry.getHealth();

            expect(health['failing-service']).toMatchObject({
                status: ServiceStatus.ERROR
            });
        });

        it('should include service metrics in health status', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.initialize();

            const health = await registry.getHealth();

            expect(health['test-service']).toBeDefined();
            const serviceHealth = health['test-service'];
            expect(serviceHealth).toBeDefined();
            expect(serviceHealth?.metrics).toBeDefined();
        });
    });

    // =====================================================================
    // Statistics
    // =====================================================================
    describe('Statistics', () => {
        it('should return correct statistics', async () => {
            const service1 = new MockService('service-1');
            const service2 = new MockService('service-2');

            await registry.register(service1);
            await registry.register(service2);

            const stats = registry.getStatistics();

            expect(stats.total).toBe(2);
            expect(stats.byStatus[ServiceStatus.INACTIVE]).toBe(2);
        });

        it('should include dependency information', async () => {
            const serviceA = new MockService('service-a');
            const serviceB = new MockService('service-b');

            await registry.register(serviceA);
            await registry.register(serviceB, { dependencies: ['service-a'] });

            const stats = registry.getStatistics();

            expect(stats.dependencies).toHaveProperty('service-b');
            expect(stats.dependencies['service-b']).toContain('service-a');
        });

        it('should update statistics after state changes', async () => {
            const service = new MockService('test-service');

            await registry.register(service);
            await registry.initialize();

            const stats = registry.getStatistics();

            expect(stats.byStatus[ServiceStatus.ACTIVE]).toBeGreaterThan(0);
        });
    });
});
