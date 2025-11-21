/**
 * ServiceProvider Tests - Comprehensive test suite for base service provider
 *
 * @package     @imajin/cli
 * @subpackage  providers/__tests__
 */

import { ServiceProvider } from '../ServiceProvider.js';
import { Container } from '../../container/Container.js';
import { Command } from 'commander';

// Test implementation of abstract ServiceProvider
class TestServiceProvider extends ServiceProvider {
    public registerCalled = false;
    public bootCalled = false;
    public commandsRegistered = false;
    public registerError: Error | null = null;
    public bootError: Error | null = null;

    public getName(): string {
        return 'test-service';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    public async register(): Promise<void> {
        if (this.registerError) {
            throw this.registerError;
        }
        this.registerCalled = true;
    }

    public async boot(): Promise<void> {
        if (this.bootError) {
            throw this.bootError;
        }
        this.bootCalled = true;
    }

    public registerCommands(): void {
        this.commandsRegistered = true;
    }

    public provides(service: string): boolean {
        return service === 'test-service';
    }

    public getServices(): string[] {
        return ['test-service', 'test-helper'];
    }
}

// Minimal implementation (no registerCommands)
class MinimalServiceProvider extends ServiceProvider {
    public getName(): string {
        return 'minimal-service';
    }

    public register(): void {
        // Minimal implementation
    }

    public boot(): void {
        // Minimal implementation
    }
}

// Synchronous implementation
class SyncServiceProvider extends ServiceProvider {
    public getName(): string {
        return 'sync-service';
    }

    public register(): void {
        // Sync register
    }

    public boot(): void {
        // Sync boot
    }
}

// Async implementation
class AsyncServiceProvider extends ServiceProvider {
    public getName(): string {
        return 'async-service';
    }

    public async register(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    public async boot(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

describe('ServiceProvider', () => {
    let container: Container;
    let program: Command;
    let provider: TestServiceProvider;

    beforeEach(() => {
        container = new Container();
        program = new Command();
        provider = new TestServiceProvider(container, program);
    });

    describe('Construction', () => {
        it('should create service provider with container and program', () => {
            expect(provider).toBeInstanceOf(ServiceProvider);
            expect(provider).toBeInstanceOf(TestServiceProvider);
        });

        it('should store container reference', () => {
            expect(provider['container']).toBe(container);
        });

        it('should store program reference', () => {
            expect(provider['program']).toBe(program);
        });

        it('should accept any container instance', () => {
            const customContainer = new Container();
            const customProvider = new TestServiceProvider(customContainer, program);

            expect(customProvider['container']).toBe(customContainer);
        });

        it('should accept any command instance', () => {
            const customProgram = new Command();
            const customProvider = new TestServiceProvider(container, customProgram);

            expect(customProvider['program']).toBe(customProgram);
        });
    });

    describe('Abstract Methods Implementation', () => {
        it('should require getName implementation', () => {
            expect(provider.getName()).toBe('test-service');
        });

        it('should require register implementation', async () => {
            await provider.register();
            expect(provider.registerCalled).toBe(true);
        });

        it('should require boot implementation', async () => {
            await provider.boot();
            expect(provider.bootCalled).toBe(true);
        });

        it('should support synchronous register', () => {
            const syncProvider = new SyncServiceProvider(container, program);
            expect(() => syncProvider.register()).not.toThrow();
        });

        it('should support asynchronous register', async () => {
            const asyncProvider = new AsyncServiceProvider(container, program);
            await expect(asyncProvider.register()).resolves.not.toThrow();
        });

        it('should support synchronous boot', () => {
            const syncProvider = new SyncServiceProvider(container, program);
            expect(() => syncProvider.boot()).not.toThrow();
        });

        it('should support asynchronous boot', async () => {
            const asyncProvider = new AsyncServiceProvider(container, program);
            await expect(asyncProvider.boot()).resolves.not.toThrow();
        });
    });

    describe('Lifecycle Order', () => {
        it('should call register before boot', async () => {
            const order: string[] = [];

            class OrderTrackingProvider extends ServiceProvider {
                getName() {
                    return 'order-tracker';
                }

                getVersion() {
                    return '1.0.0';
                }

                async register() {
                    order.push('register');
                }

                async boot() {
                    order.push('boot');
                }

                registerCommands() {
                    order.push('commands');
                }
            }

            const tracker = new OrderTrackingProvider(container, program);

            await tracker.register();
            await tracker.boot();
            tracker.registerCommands?.();

            expect(order).toEqual(['register', 'boot', 'commands']);
        });

        it('should support multiple sequential boots', async () => {
            await provider.boot();
            await provider.boot();

            // Should not throw or cause issues
            expect(provider.bootCalled).toBe(true);
        });

        it('should support multiple sequential registers', async () => {
            await provider.register();
            await provider.register();

            // Should not throw or cause issues
            expect(provider.registerCalled).toBe(true);
        });
    });

    describe('Container Integration', () => {
        it('should have access to container', () => {
            expect(provider['container']).toBeDefined();
            expect(provider['container']).toBeInstanceOf(Container);
        });

        it('should register services in container', async () => {
            class ServiceRegisteringProvider extends TestServiceProvider {
                async register() {
                    this.container.singleton('testService', () => ({
                        name: 'Test Service',
                        version: '1.0.0',
                    }));
                }
            }

            const regProvider = new ServiceRegisteringProvider(container, program);
            await regProvider.register();

            expect(container.has('testService')).toBe(true);
            const service = container.resolve('testService');
            expect(service).toHaveProperty('name', 'Test Service');
        });

        it('should access other services from container', async () => {
            container.singleton('logger', () => ({
                log: jest.fn(),
            }));

            class DependentProvider extends ServiceProvider {
                getName() {
                    return 'dependent';
                }

                async register() {
                    const logger: any = this.container.resolve('logger');
                    logger.log('Provider registered');
                }

                boot() {}
            }

            const depProvider = new DependentProvider(container, program);

            await expect(depProvider.register()).resolves.not.toThrow();

            const logger: any = container.resolve('logger');
            expect(logger.log).toHaveBeenCalledWith('Provider registered');
        });

        it('should support dependency injection pattern', async () => {
            container.singleton('config', () => ({
                appName: 'TestApp',
            }));

            class ConfigAwareProvider extends ServiceProvider {
                private config: any;

                getName() {
                    return 'config-aware';
                }

                async register() {
                    this.config = this.container.resolve('config');
                }

                boot() {}

                getConfig() {
                    return this.config;
                }
            }

            const configProvider = new ConfigAwareProvider(container, program);
            await configProvider.register();

            expect(configProvider.getConfig()).toEqual({
                appName: 'TestApp',
            });
        });
    });

    describe('Command Registration', () => {
        it('should support optional registerCommands method', () => {
            const minimalProvider = new MinimalServiceProvider(container, program);

            // Should not have registerCommands method
            expect(minimalProvider.registerCommands).toBeUndefined();
        });

        it('should call registerCommands when implemented', () => {
            provider.registerCommands?.();
            expect(provider.commandsRegistered).toBe(true);
        });

        it('should pass program to registerCommands', () => {
            class CommandProvider extends ServiceProvider {
                public programReceived: Command | null = null;

                getName() {
                    return 'command-provider';
                }

                register() {}
                boot() {}

                registerCommands(prog: Command) {
                    this.programReceived = prog;
                }
            }

            const cmdProvider = new CommandProvider(container, program);
            cmdProvider.registerCommands?.(program);

            expect(cmdProvider.programReceived).toBe(program);
        });

        it('should register commands with commander', () => {
            class CliProvider extends ServiceProvider {
                getName() {
                    return 'cli-provider';
                }

                register() {}
                boot() {}

                registerCommands(prog: Command) {
                    prog.command('test').description('Test command');
                }
            }

            const cliProvider = new CliProvider(container, program);
            cliProvider.registerCommands?.(program);

            const commands = program.commands;
            expect(commands.some(cmd => cmd.name() === 'test')).toBe(true);
        });
    });

    describe('Service Provider Metadata', () => {
        it('should return provider name', () => {
            expect(provider.getName()).toBe('test-service');
        });

        it('should return default version', () => {
            const minimalProvider = new MinimalServiceProvider(container, program);
            expect(minimalProvider.getVersion()).toBe('0.1.0');
        });

        it('should support custom version', () => {
            expect(provider.getVersion()).toBe('1.0.0');
        });

        it('should check if provider provides service', () => {
            expect(provider.provides('test-service')).toBe(true);
            expect(provider.provides('other-service')).toBe(false);
        });

        it('should return false for provides by default', () => {
            const minimalProvider = new MinimalServiceProvider(container, program);
            expect(minimalProvider.provides('any-service')).toBe(false);
        });

        it('should list provided services', () => {
            const services = provider.getServices();
            expect(services).toEqual(['test-service', 'test-helper']);
        });

        it('should return empty services list by default', () => {
            const minimalProvider = new MinimalServiceProvider(container, program);
            expect(minimalProvider.getServices()).toEqual([]);
        });
    });

    describe('Error Handling', () => {
        it('should propagate register errors', async () => {
            provider.registerError = new Error('Register failed');

            await expect(provider.register()).rejects.toThrow('Register failed');
        });

        it('should propagate boot errors', async () => {
            provider.bootError = new Error('Boot failed');

            await expect(provider.boot()).rejects.toThrow('Boot failed');
        });

        it('should handle container resolution errors', async () => {
            class ErrorProneProvider extends ServiceProvider {
                getName() {
                    return 'error-prone';
                }

                async register() {
                    this.container.resolve('non-existent-service');
                }

                boot() {}
            }

            const errorProvider = new ErrorProneProvider(container, program);

            await expect(errorProvider.register()).rejects.toThrow();
        });

        it('should not catch register errors silently', async () => {
            class ThrowingProvider extends ServiceProvider {
                getName() {
                    return 'throwing';
                }

                async register() {
                    throw new Error('Intentional error');
                }

                boot() {}
            }

            const throwingProvider = new ThrowingProvider(container, program);

            await expect(throwingProvider.register()).rejects.toThrow('Intentional error');
        });

        it('should not catch boot errors silently', async () => {
            class ThrowingProvider extends ServiceProvider {
                getName() {
                    return 'throwing';
                }

                register() {}

                async boot() {
                    throw new Error('Boot error');
                }
            }

            const throwingProvider = new ThrowingProvider(container, program);

            await expect(throwingProvider.boot()).rejects.toThrow('Boot error');
        });
    });

    describe('Multiple Providers', () => {
        it('should support multiple provider instances', () => {
            const provider1 = new TestServiceProvider(container, program);
            const provider2 = new TestServiceProvider(container, program);

            expect(provider1).not.toBe(provider2);
        });

        it('should maintain separate state per instance', async () => {
            const provider1 = new TestServiceProvider(container, program);
            const provider2 = new TestServiceProvider(container, program);

            await provider1.register();

            expect(provider1.registerCalled).toBe(true);
            expect(provider2.registerCalled).toBe(false);
        });

        it('should share container between providers', () => {
            const provider1 = new TestServiceProvider(container, program);
            const provider2 = new TestServiceProvider(container, program);

            expect(provider1['container']).toBe(provider2['container']);
        });

        it('should allow different provider types', () => {
            const testProvider = new TestServiceProvider(container, program);
            const minimalProvider = new MinimalServiceProvider(container, program);

            expect(testProvider.getName()).toBe('test-service');
            expect(minimalProvider.getName()).toBe('minimal-service');
        });
    });

    describe('Inheritance', () => {
        it('should support provider inheritance', () => {
            class ExtendedProvider extends TestServiceProvider {
                public extraMethod() {
                    return 'extra';
                }
            }

            const extended = new ExtendedProvider(container, program);

            expect(extended).toBeInstanceOf(TestServiceProvider);
            expect(extended).toBeInstanceOf(ServiceProvider);
            expect(extended.extraMethod()).toBe('extra');
        });

        it('should allow method overriding', async () => {
            class OverridingProvider extends TestServiceProvider {
                async register() {
                    await super.register();
                    this.container.singleton('extra', () => ({}));
                }
            }

            const overriding = new OverridingProvider(container, program);
            await overriding.register();

            expect(overriding.registerCalled).toBe(true);
            expect(container.has('extra')).toBe(true);
        });

        it('should support deep inheritance chains', () => {
            class Level1 extends ServiceProvider {
                getName() {
                    return 'level1';
                }
                register() {}
                boot() {}
            }

            class Level2 extends Level1 {
                getName() {
                    return 'level2';
                }
            }

            class Level3 extends Level2 {
                getName() {
                    return 'level3';
                }
            }

            const level3 = new Level3(container, program);

            expect(level3).toBeInstanceOf(Level1);
            expect(level3).toBeInstanceOf(Level2);
            expect(level3).toBeInstanceOf(ServiceProvider);
            expect(level3.getName()).toBe('level3');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty getName', () => {
            class EmptyNameProvider extends ServiceProvider {
                getName() {
                    return '';
                }
                register() {}
                boot() {}
            }

            const emptyProvider = new EmptyNameProvider(container, program);
            expect(emptyProvider.getName()).toBe('');
        });

        it('should handle special characters in name', () => {
            class SpecialNameProvider extends ServiceProvider {
                getName() {
                    return 'service@#$%^&*()';
                }
                register() {}
                boot() {}
            }

            const specialProvider = new SpecialNameProvider(container, program);
            expect(specialProvider.getName()).toBe('service@#$%^&*()');
        });

        it('should handle very long service names', () => {
            class LongNameProvider extends ServiceProvider {
                getName() {
                    return 'a'.repeat(1000);
                }
                register() {}
                boot() {}
            }

            const longProvider = new LongNameProvider(container, program);
            expect(longProvider.getName().length).toBe(1000);
        });

        it('should handle rapid successive lifecycle calls', async () => {
            const promises = [
                provider.register(),
                provider.boot(),
            ];

            await expect(Promise.all(promises)).resolves.not.toThrow();
        });

        it('should handle null in service list', () => {
            class NullServiceProvider extends ServiceProvider {
                getName() {
                    return 'null-service';
                }
                register() {}
                boot() {}

                getServices() {
                    return ['service1', null as any, 'service2'];
                }
            }

            const nullProvider = new NullServiceProvider(container, program);
            expect(nullProvider.getServices()).toContain(null);
        });
    });

    describe('Integration Patterns', () => {
        it('should support factory pattern in container', async () => {
            class FactoryProvider extends ServiceProvider {
                getName() {
                    return 'factory';
                }

                async register() {
                    this.container.bind('factory-service', () => ({
                        create: (name: string) => ({ name }),
                    }));
                }

                boot() {}
            }

            const factoryProvider = new FactoryProvider(container, program);
            await factoryProvider.register();

            const factory = container.resolve('factory-service') as any;
            const instance = factory.create('test');

            expect(instance).toEqual({ name: 'test' });
        });

        it('should support singleton pattern in container', async () => {
            class SingletonProvider extends ServiceProvider {
                getName() {
                    return 'singleton';
                }

                async register() {
                    let count = 0;
                    this.container.singleton('counter', () => ({
                        increment: () => ++count,
                        getCount: () => count,
                    }));
                }

                boot() {}
            }

            const singletonProvider = new SingletonProvider(container, program);
            await singletonProvider.register();

            const counter1 = container.resolve('counter') as any;
            const counter2 = container.resolve('counter') as any;

            counter1.increment();
            expect(counter2.getCount()).toBe(1); // Same instance
        });
    });
});
