/**
 * Application Tests - Core bootstrap and lifecycle
 *
 * Focus: Critical paths for pragmatic 50-60% coverage
 */

import { Application } from '../Application.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { Container } from '../../container/Container.js';
import { Command } from 'commander';

// Mock provider for testing
class MockServiceProvider extends ServiceProvider {
    public registerCalled = false;
    public bootCalled = false;
    public commandsRegistered = false;

    constructor(container: Container, program: Command) {
        super(container, program);
    }

    public getName(): string {
        return 'mock-service';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    public async register(): Promise<void> {
        this.registerCalled = true;
    }

    public async boot(): Promise<void> {
        this.bootCalled = true;
    }

    public registerCommands(): void {
        this.commandsRegistered = true;
    }
}

describe('Application', () => {
    let app: Application;

    beforeEach(() => {
        // Create fresh application instance
        app = new Application({
            logLevel: 'error', // Suppress logs in tests
            colorOutput: false
        });
    });

    describe('Constructor & Initialization', () => {
        it('should create application instance', () => {
            expect(app).toBeInstanceOf(Application);
        });

        it('should have version', () => {
            expect(Application.VERSION).toBeDefined();
            expect(typeof Application.VERSION).toBe('string');
        });

        it('should have name', () => {
            expect(Application.NAME).toBe('Imajin CLI');
        });

        it('should initialize with default config', () => {
            const defaultApp = new Application();
            expect(defaultApp).toBeInstanceOf(Application);
        });

        it('should accept partial config', () => {
            const appWithConfig = new Application({
                logLevel: 'debug',
                colorOutput: true
            });
            expect(appWithConfig).toBeInstanceOf(Application);
        });

        it('should handle JSON mode', () => {
            // Save original argv
            const originalArgv = process.argv;

            // Mock JSON flag
            process.argv = [...process.argv, '--json'];

            const jsonApp = new Application();
            expect(jsonApp).toBeInstanceOf(Application);

            // Restore argv
            process.argv = originalArgv;
        });
    });

    describe('Provider Registration', () => {
        it('should register a service provider', () => {
            const mockProvider = app.createProvider(MockServiceProvider);

            const result = app.registerProvider(mockProvider);

            expect(result).toBe(app); // Should return app for chaining
        });

        it('should support method chaining for provider registration', () => {
            const provider1 = app.createProvider(MockServiceProvider);
            const provider2 = app.createProvider(MockServiceProvider);

            const result = app
                .registerProvider(provider1)
                .registerProvider(provider2);

            expect(result).toBe(app);
        });

        it('should create provider with createProvider', () => {
            const provider = app.createProvider(MockServiceProvider);

            expect(provider).toBeInstanceOf(MockServiceProvider);
            expect(provider).toBeInstanceOf(ServiceProvider);
        });
    });

    describe('Boot Lifecycle', () => {
        it('should boot application successfully', async () => {
            await expect(app.boot()).resolves.not.toThrow();
        });

        it('should call register on providers during boot', async () => {
            const mockProvider = app.createProvider(MockServiceProvider);
            app.registerProvider(mockProvider);

            await app.boot();

            expect(mockProvider.registerCalled).toBe(true);
        });

        it('should call boot on providers during boot', async () => {
            const mockProvider = app.createProvider(MockServiceProvider);
            app.registerProvider(mockProvider);

            await app.boot();

            expect(mockProvider.bootCalled).toBe(true);
        });

        it('should register provider commands during boot', async () => {
            const mockProvider = app.createProvider(MockServiceProvider);
            app.registerProvider(mockProvider);

            await app.boot();

            expect(mockProvider.commandsRegistered).toBe(true);
        });

        it('should call providers in correct order: register -> boot -> commands', async () => {
            const callOrder: string[] = [];

            class OrderTrackingProvider extends ServiceProvider {
                public getName(): string {
                    return 'order-tracker';
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    callOrder.push('register');
                }

                public async boot(): Promise<void> {
                    callOrder.push('boot');
                }

                public registerCommands(): void {
                    callOrder.push('commands');
                }
            }

            const provider = app.createProvider(OrderTrackingProvider);
            app.registerProvider(provider);

            await app.boot();

            expect(callOrder).toEqual(['register', 'boot', 'commands']);
        });

        it('should only boot once', async () => {
            let bootCount = 0;

            class CountingProvider extends ServiceProvider {
                public getName(): string {
                    return 'counter';
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    bootCount++;
                }

                public async boot(): Promise<void> {
                    // No-op
                }

                public registerCommands(): void {
                    // No-op
                }
            }

            const provider = app.createProvider(CountingProvider);
            app.registerProvider(provider);

            await app.boot();
            await app.boot(); // Second boot should be no-op

            expect(bootCount).toBe(1); // Only registered once
        });

        it('should handle provider registration errors', async () => {
            class FailingProvider extends ServiceProvider {
                public getName(): string {
                    return 'failing';
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    throw new Error('Registration failed');
                }

                public async boot(): Promise<void> {
                    // No-op
                }

                public registerCommands(): void {
                    // No-op
                }
            }

            const provider = app.createProvider(FailingProvider);
            app.registerProvider(provider);

            // Should handle error gracefully (logs but doesn't throw)
            await expect(app.boot()).resolves.not.toThrow();
        });
    });

    describe('Core Services', () => {
        it('should register logger in container', async () => {
            await app.boot();

            // Access container through reflection (testing internal behavior)
            const container = (app as any).container as Container;

            expect(container.has('logger')).toBe(true);
        });

        it('should register config in container', async () => {
            await app.boot();

            const container = (app as any).container as Container;

            expect(container.has('config')).toBe(true);
        });

        it('should register container in itself', async () => {
            await app.boot();

            const container = (app as any).container as Container;

            expect(container.has('container')).toBe(true);
        });

        it('should register error handler', async () => {
            await app.boot();

            const container = (app as any).container as Container;

            expect(container.has('errorHandler')).toBe(true);
        });

        it('should register event emitter', async () => {
            await app.boot();

            const container = (app as any).container as Container;

            expect(container.has('eventEmitter')).toBe(true);
        });
    });

    describe('Multiple Providers', () => {
        it('should handle multiple providers', async () => {
            const provider1 = app.createProvider(MockServiceProvider);
            const provider2 = app.createProvider(MockServiceProvider);
            const provider3 = app.createProvider(MockServiceProvider);

            app
                .registerProvider(provider1)
                .registerProvider(provider2)
                .registerProvider(provider3);

            await app.boot();

            expect(provider1.registerCalled).toBe(true);
            expect(provider2.registerCalled).toBe(true);
            expect(provider3.registerCalled).toBe(true);
        });

        it('should boot all providers in registration order', async () => {
            const bootOrder: number[] = [];

            class OrderedProvider extends ServiceProvider {
                constructor(container: Container, program: Command, private id: number) {
                    super(container, program);
                }

                public getName(): string {
                    return `provider-${this.id}`;
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    // No-op
                }

                public async boot(): Promise<void> {
                    bootOrder.push(this.id);
                }

                public registerCommands(): void {
                    // No-op
                }
            }

            // Register providers in specific order
            for (let i = 1; i <= 5; i++) {
                const container = (app as any).container as Container;
                const program = (app as any).program as Command;
                const provider = new OrderedProvider(container, program, i);
                app.registerProvider(provider);
            }

            await app.boot();

            expect(bootOrder).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('Configuration', () => {
        it('should respect log level configuration', () => {
            const quietApp = new Application({ logLevel: 'error' });
            expect(quietApp).toBeInstanceOf(Application);

            const verboseApp = new Application({ logLevel: 'debug' });
            expect(verboseApp).toBeInstanceOf(Application);
        });

        it('should respect color output configuration', () => {
            const noColorApp = new Application({ colorOutput: false });
            expect(noColorApp).toBeInstanceOf(Application);

            const colorApp = new Application({ colorOutput: true });
            expect(colorApp).toBeInstanceOf(Application);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty provider list', async () => {
            // No providers registered
            await expect(app.boot()).resolves.not.toThrow();
        });

        it('should handle provider with no commands', async () => {
            class NoCommandsProvider extends ServiceProvider {
                public getName(): string {
                    return 'no-commands';
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    // No-op
                }

                public async boot(): Promise<void> {
                    // No-op
                }

                // registerCommands not implemented
            }

            const provider = app.createProvider(NoCommandsProvider);
            app.registerProvider(provider);

            await expect(app.boot()).resolves.not.toThrow();
        });

        it('should handle provider boot errors gracefully', async () => {
            class BootErrorProvider extends ServiceProvider {
                public getName(): string {
                    return 'boot-error';
                }

                public getVersion(): string {
                    return '1.0.0';
                }

                public async register(): Promise<void> {
                    // Success
                }

                public async boot(): Promise<void> {
                    throw new Error('Boot failed');
                }

                public registerCommands(): void {
                    // No-op
                }
            }

            const provider = app.createProvider(BootErrorProvider);
            app.registerProvider(provider);

            // Should log error but not throw
            await expect(app.boot()).resolves.not.toThrow();
        });
    });
});
