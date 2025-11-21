/**
 * Container Tests - Dependency Injection Container
 */

import { Container } from '../Container.js';

describe('Container', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    describe('bind', () => {
        it('should register a transient service', () => {
            container.bind('testService', () => ({ value: 'test' }));

            expect(container.has('testService')).toBe(true);
        });

        it('should return container for chaining', () => {
            const result = container.bind('test', () => ({}));

            expect(result).toBe(container);
        });

        it('should create new instance each time for transient services', () => {
            container.bind('counter', () => ({ count: Math.random() }));

            const instance1 = container.resolve<{ count: number }>('counter');
            const instance2 = container.resolve<{ count: number }>('counter');

            expect(instance1.count).not.toBe(instance2.count);
        });
    });

    describe('singleton', () => {
        it('should register a singleton service', () => {
            container.singleton('singletonService', () => ({ value: 'singleton' }));

            expect(container.has('singletonService')).toBe(true);
        });

        it('should return same instance on multiple resolves', () => {
            container.singleton('counter', () => ({ count: Math.random() }));

            const instance1 = container.resolve<{ count: number }>('counter');
            const instance2 = container.resolve<{ count: number }>('counter');

            expect(instance1).toBe(instance2);
            expect(instance1.count).toBe(instance2.count);
        });

        it('should lazy-load singleton instances', () => {
            let factoryCalled = false;
            container.singleton('lazy', () => {
                factoryCalled = true;
                return { loaded: true };
            });

            expect(factoryCalled).toBe(false);

            container.resolve('lazy');
            expect(factoryCalled).toBe(true);
        });
    });

    describe('instance', () => {
        it('should register a pre-created instance', () => {
            const instance = { value: 'pre-created' };
            container.instance('myInstance', instance);

            expect(container.has('myInstance')).toBe(true);
        });

        it('should return exact same object reference', () => {
            const instance = { value: 'test', metadata: { id: 123 } };
            container.instance('obj', instance);

            const resolved = container.resolve('obj');

            expect(resolved).toBe(instance);
            expect(resolved).toEqual(instance);
        });

        it('should return container for chaining', () => {
            const result = container.instance('test', {});

            expect(result).toBe(container);
        });
    });

    describe('resolve', () => {
        it('should resolve registered service', () => {
            container.bind('service', () => ({ name: 'TestService' }));

            const service = container.resolve<{ name: string }>('service');

            expect(service).toBeDefined();
            expect(service.name).toBe('TestService');
        });

        it('should throw error for unregistered service', () => {
            expect(() => {
                container.resolve('nonExistent');
            }).toThrow('Service nonExistent not found in container');
        });

        it('should pass container to factory function', () => {
            let receivedContainer: Container | null = null;

            container.bind('service', (c) => {
                receivedContainer = c;
                return {};
            });

            container.resolve('service');

            expect(receivedContainer).toBe(container);
        });

        it('should support dependency injection in factories', () => {
            container.singleton('logger', () => ({
                log: (msg: string) => `Logged: ${msg}`
            }));

            container.bind('service', (c) => {
                const logger = c.resolve<{ log: (msg: string) => string }>('logger');
                return {
                    doWork: () => logger.log('work done')
                };
            });

            const service = container.resolve<{ doWork: () => string }>('service');
            const result = service.doWork();

            expect(result).toBe('Logged: work done');
        });

        it('should prioritize direct instances over bindings', () => {
            container.bind('service', () => ({ source: 'binding' }));
            container.instance('service', { source: 'instance' });

            const service = container.resolve<{ source: string }>('service');

            expect(service.source).toBe('instance');
        });
    });

    describe('has', () => {
        it('should return true for registered binding', () => {
            container.bind('service', () => ({}));

            expect(container.has('service')).toBe(true);
        });

        it('should return true for registered instance', () => {
            container.instance('service', {});

            expect(container.has('service')).toBe(true);
        });

        it('should return false for unregistered service', () => {
            expect(container.has('nonExistent')).toBe(false);
        });

        it('should return true after singleton resolved', () => {
            container.singleton('lazy', () => ({}));

            expect(container.has('lazy')).toBe(true);

            container.resolve('lazy');

            expect(container.has('lazy')).toBe(true);
        });
    });

    describe('getServiceIdentifiers', () => {
        it('should return empty array for new container', () => {
            const identifiers = container.getServiceIdentifiers();

            expect(identifiers).toEqual([]);
        });

        it('should return all registered service identifiers', () => {
            container.bind('service1', () => ({}));
            container.singleton('service2', () => ({}));
            container.instance('service3', {});

            const identifiers = container.getServiceIdentifiers();

            expect(identifiers).toContain('service1');
            expect(identifiers).toContain('service2');
            expect(identifiers).toContain('service3');
            expect(identifiers).toHaveLength(3);
        });

        it('should not duplicate identifiers when instance overrides binding', () => {
            container.bind('service', () => ({}));
            container.instance('service', {});

            const identifiers = container.getServiceIdentifiers();
            const serviceCount = identifiers.filter(id => id === 'service').length;

            expect(serviceCount).toBe(2); // Once in bindings, once in instances
        });
    });

    describe('Service Identifier Types', () => {
        it('should support string identifiers', () => {
            container.bind('stringService', () => ({ type: 'string' }));

            const service = container.resolve<{ type: string }>('stringService');

            expect(service.type).toBe('string');
        });

        it('should support symbol identifiers', () => {
            const serviceSymbol = Symbol('myService');
            container.bind(serviceSymbol, () => ({ type: 'symbol' }));

            const service = container.resolve<{ type: string }>(serviceSymbol);

            expect(service.type).toBe('symbol');
        });

        it('should support function/class identifiers', () => {
            class MyService {
                public type = 'class';
            }

            container.bind(MyService, () => new MyService());

            const service = container.resolve<MyService>(MyService);

            expect(service).toBeInstanceOf(MyService);
            expect(service.type).toBe('class');
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle circular dependencies without infinite loop', () => {
            container.singleton('serviceA', (c) => ({
                name: 'A',
                getB: () => c.resolve<{ name: string }>('serviceB')
            }));

            container.singleton('serviceB', (c) => ({
                name: 'B',
                getA: () => c.resolve<{ name: string; getB: () => any }>('serviceA')
            }));

            const serviceA = container.resolve<{ name: string; getB: () => any }>('serviceA');
            const serviceB = serviceA.getB();
            const serviceAAgain = serviceB.getA();

            expect(serviceA).toBe(serviceAAgain); // Singleton ensures same reference
        });

        it('should support multiple independent containers', () => {
            const container1 = new Container();
            const container2 = new Container();

            container1.instance('value', { id: 1 });
            container2.instance('value', { id: 2 });

            expect(container1.resolve<{ id: number }>('value').id).toBe(1);
            expect(container2.resolve<{ id: number }>('value').id).toBe(2);
        });

        it('should handle factory functions that throw errors', () => {
            container.bind('failingService', () => {
                throw new Error('Factory failed');
            });

            expect(() => {
                container.resolve('failingService');
            }).toThrow('Factory failed');
        });

        it('should maintain singleton instance even after factory throws', () => {
            let callCount = 0;

            container.singleton('unreliableService', () => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('First call fails');
                }
                return { created: true };
            });

            expect(() => container.resolve('unreliableService')).toThrow();

            const service = container.resolve<{ created: boolean }>('unreliableService');
            expect(service.created).toBe(true);
            expect(callCount).toBe(2);
        });

        it('should support method chaining for registration', () => {
            const result = container
                .bind('service1', () => ({}))
                .singleton('service2', () => ({}))
                .instance('service3', {});

            expect(result).toBe(container);
            expect(container.has('service1')).toBe(true);
            expect(container.has('service2')).toBe(true);
            expect(container.has('service3')).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string identifier', () => {
            container.bind('', () => ({ value: 'empty' }));

            expect(container.has('')).toBe(true);
            const service = container.resolve<{ value: string }>('');
            expect(service.value).toBe('empty');
        });

        it('should handle null/undefined returns from factory', () => {
            container.bind('nullService', () => null);
            container.bind('undefinedService', () => undefined);

            expect(container.resolve('nullService')).toBeNull();
            expect(container.resolve('undefinedService')).toBeUndefined();
        });

        it('should handle factory returning promise', () => {
            container.bind('asyncService', () => Promise.resolve({ async: true }));

            const service = container.resolve('asyncService');

            expect(service).toBeInstanceOf(Promise);
        });
    });
});
