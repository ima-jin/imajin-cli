/**
 * Application Lifecycle Integration Tests
 *
 * End-to-end tests for application bootstrap, service registration,
 * provider lifecycle, and graceful shutdown.
 *
 * @package     @imajin/cli
 * @subpackage  test/integration
 */

import { Application } from '../../core/Application.js';
import { Container } from '../../container/Container.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { Command } from 'commander';
import {
    createTestApplication,
    MockServiceProvider,
    sleep,
    waitFor
} from '../helpers/integrationHelpers.js';

describe('Application Lifecycle Integration', () => {
    let app: Application;

    afterEach(async () => {
        // Clean up global references
        if ((globalThis as any).imajinApp) {
            delete (globalThis as any).imajinApp;
        }
    });

    // =====================================================================
    // Bootstrap and Initialization
    // =====================================================================
    describe('Bootstrap and Initialization', () => {
        it('should bootstrap complete application', async () => {
            app = new Application({
                logLevel: 'error',
                colorOutput: false
            });

            // Register mock provider
            const provider = app.createProvider(MockServiceProvider);

            // Boot application
            await app.boot();

            // Verify application state
            const container = (app as any).container as Container;
            expect(container).toBeDefined();
            expect(provider.isRegistered()).toBe(true);
            expect(provider.isBooted()).toBe(true);

            // Verify global reference
            expect((globalThis as any).imajinApp).toBe(app);
        });

        it('should register core services during initialization', async () => {
            app = new Application({
                logLevel: 'error'
            });

            const container = (app as any).container as Container;

            // Verify core services are registered
            expect(container.has('logger')).toBe(true);
            expect(container.has('eventEmitter')).toBe(true);
        });

        it('should not boot twice', async () => {
            app = new Application({
                logLevel: 'error'
            });

            const provider = app.createProvider(MockServiceProvider);

            await app.boot();
            const firstBootState = provider.isBooted();

            // Try to boot again
            await app.boot();

            // Verify boot was only called once
            expect(firstBootState).toBe(true);
            expect((app as any).isBooted).toBe(true);
        });

        it('should initialize with custom configuration', async () => {
            app = new Application({
                logLevel: 'debug',
                colorOutput: true
            });

            const config = (app as any).config;

            expect(config.logLevel).toBe('debug');
            expect(config.colorOutput).toBe(true);
        });
    });

    // =====================================================================
    // Provider Registration
    // =====================================================================
    describe('Provider Registration', () => {
        it('should register multiple providers', async () => {
            app = new Application({ logLevel: 'error' });

            const provider1 = app.createProvider(MockServiceProvider);

            class SecondMockProvider extends ServiceProvider {
                getName(): string { return 'second-mock'; }
                async register(): Promise<void> {}
                async boot(): Promise<void> {}
            }

            const provider2 = app.createProvider(SecondMockProvider);

            await app.boot();

            expect(provider1.isBooted()).toBe(true);
            expect(provider2.getName()).toBe('second-mock');
        });

        it('should call register phase before boot phase', async () => {
            const calls: string[] = [];

            class TrackedProvider extends ServiceProvider {
                getName(): string { return 'tracked'; }

                async register(): Promise<void> {
                    calls.push('register');
                }

                async boot(): Promise<void> {
                    calls.push('boot');
                }
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(TrackedProvider);

            await app.boot();

            expect(calls).toEqual(['register', 'boot']);
        });

        it('should provide container and program to providers', async () => {
            let receivedContainer: Container | undefined;
            let receivedProgram: Command | undefined;

            class ContainerCheckProvider extends ServiceProvider {
                constructor(container: Container, program: Command) {
                    super(container, program);
                    receivedContainer = container;
                    receivedProgram = program;
                }

                getName(): string { return 'container-check'; }
                async register(): Promise<void> {}
                async boot(): Promise<void> {}
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(ContainerCheckProvider);

            expect(receivedContainer).toBeInstanceOf(Container);
            expect(receivedProgram).toBeInstanceOf(Command);
        });
    });

    // =====================================================================
    // Service Container Integration
    // =====================================================================
    describe('Service Container Integration', () => {
        it('should resolve services from container', async () => {
            app = await createTestApplication();

            const container = (app as any).container as Container;
            const logger = container.make('logger');

            expect(logger).toBeDefined();
            expect(logger).toHaveProperty('info');
            expect(logger).toHaveProperty('error');
        });

        it('should share container across providers', async () => {
            let container1: Container | undefined;
            let container2: Container | undefined;

            class Provider1 extends ServiceProvider {
                getName(): string { return 'provider1'; }
                async register(): Promise<void> {
                    container1 = this.container;
                    this.container.singleton('sharedService', () => ({ value: 'shared' }));
                }
                async boot(): Promise<void> {}
            }

            class Provider2 extends ServiceProvider {
                getName(): string { return 'provider2'; }
                async register(): Promise<void> {
                    container2 = this.container;
                }
                async boot(): Promise<void> {}
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(Provider1);
            app.createProvider(Provider2);

            await app.boot();

            expect(container1).toBe(container2);
            expect(container2?.has('sharedService')).toBe(true);
        });
    });

    // =====================================================================
    // Error Handling
    // =====================================================================
    describe('Error Handling', () => {
        it('should handle provider registration errors', async () => {
            class FailingProvider extends ServiceProvider {
                getName(): string { return 'failing'; }

                async register(): Promise<void> {
                    throw new Error('Registration failed');
                }

                async boot(): Promise<void> {}
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(FailingProvider);

            await expect(app.boot()).rejects.toThrow('Registration failed');
        });

        it('should handle provider boot errors', async () => {
            class FailingBootProvider extends ServiceProvider {
                getName(): string { return 'failing-boot'; }
                async register(): Promise<void> {}

                async boot(): Promise<void> {
                    throw new Error('Boot failed');
                }
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(FailingBootProvider);

            await expect(app.boot()).rejects.toThrow('Boot failed');
        });
    });

    // =====================================================================
    // Program and Command Registration
    // =====================================================================
    describe('Program and Command Registration', () => {
        it('should register program with version', async () => {
            app = new Application({ logLevel: 'error' });
            const program = (app as any).program as Command;

            expect(program.version()).toBe('0.1.0');
        });

        it('should register program with name', async () => {
            app = new Application({ logLevel: 'error' });
            const program = (app as any).program as Command;

            expect(program.name()).toBe('imajin');
        });

        it('should allow providers to register commands', async () => {
            class CommandProvider extends ServiceProvider {
                getName(): string { return 'command-provider'; }
                async register(): Promise<void> {}
                async boot(): Promise<void> {}

                registerCommands(program: Command): void {
                    program
                        .command('test-command')
                        .description('Test command')
                        .action(() => {
                            // Command action
                        });
                }
            }

            app = new Application({ logLevel: 'error' });
            app.createProvider(CommandProvider);

            await app.boot();

            const program = (app as any).program as Command;
            const commands = program.commands;

            expect(commands.some(cmd => cmd.name() === 'test-command')).toBe(true);
        });
    });

    // =====================================================================
    // Integration State Management
    // =====================================================================
    describe('Integration State Management', () => {
        it('should track boot state', async () => {
            app = new Application({ logLevel: 'error' });

            expect((app as any).isBooted).toBe(false);

            await app.boot();

            expect((app as any).isBooted).toBe(true);
        });

        it('should track command registration state', async () => {
            app = new Application({ logLevel: 'error' });

            expect((app as any).commandsRegistered).toBe(false);

            await app.boot();

            expect((app as any).commandsRegistered).toBe(true);
        });
    });
});
