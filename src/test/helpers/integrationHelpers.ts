/**
 * Integration Test Helpers
 *
 * Reusable utilities and helpers for integration testing across the application.
 * Provides factories for creating test applications, containers, and executing commands.
 *
 * @package     @imajin/cli
 * @subpackage  test/helpers
 */

import { EventEmitter } from 'node:events';
import { Application } from '../../core/Application.js';
import { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';
import { Command } from 'commander';
import { ServiceProvider } from '../../providers/ServiceProvider.js';

/**
 * Create a test application instance with minimal configuration
 */
export async function createTestApplication(options?: {
    logLevel?: string;
    colorOutput?: boolean;
    providers?: Array<new (container: Container, program: Command) => ServiceProvider>;
}): Promise<Application> {
    const app = new Application({
        logLevel: options?.logLevel || 'error',
        colorOutput: options?.colorOutput ?? false
    });

    // Register test providers if provided
    if (options?.providers) {
        for (const ProviderClass of options.providers) {
            app.createProvider(ProviderClass);
        }
    }

    await app.boot();

    return app;
}

/**
 * Create a mock service container with common test dependencies
 */
export function createMockServiceContainer(): Container {
    const container = new Container();

    // Register common mocks
    container.singleton('logger', () => createMockLogger());
    container.singleton('eventEmitter', () => new EventEmitter());

    return container;
}

/**
 * Create a mock logger for testing
 */
export function createMockLogger(): Logger {
    return new Logger({
        level: 'error',
        enableColors: false
    });
}

/**
 * Execute a command through the application
 */
export async function executeCommand(
    app: Application,
    command: string,
    args: Record<string, any> = {}
): Promise<any> {
    const program = (app as any).program as Command;
    const commandArgs = command.split(' ');
    const argsArray = toCommandArgs(args);

    return program.parseAsync([...commandArgs, ...argsArray], { from: 'user' });
}

/**
 * Convert object arguments to command line argument array
 */
function toCommandArgs(args: Record<string, any>): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(args)) {
        if (value === true) {
            result.push(`--${key}`);
        } else if (value !== false && value !== undefined && value !== null) {
            result.push(`--${key}`, String(value));
        }
    }

    return result;
}

/**
 * Wait for a specified duration (for testing async operations)
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a mock service provider for testing
 */
export class MockServiceProvider extends ServiceProvider {
    private registerCalled = false;
    private bootCalled = false;

    getName(): string {
        return 'mock-service-provider';
    }

    async register(): Promise<void> {
        this.registerCalled = true;
        this.container.singleton('mockService', () => ({
            getName: () => 'mock-service',
            initialized: true
        }));
    }

    async boot(): Promise<void> {
        this.bootCalled = true;
    }

    isRegistered(): boolean {
        return this.registerCalled;
    }

    isBooted(): boolean {
        return this.bootCalled;
    }
}

/**
 * Capture console output for testing
 */
export class ConsoleCapture {
    private originalLog: typeof console.log;
    private originalError: typeof console.error;
    private originalWarn: typeof console.warn;
    private logs: string[] = [];
    private errors: string[] = [];
    private warnings: string[] = [];

    constructor() {
        this.originalLog = console.log;
        this.originalError = console.error;
        this.originalWarn = console.warn;
    }

    start(): void {
        this.logs = [];
        this.errors = [];
        this.warnings = [];

        console.log = (...args: any[]) => {
            this.logs.push(args.map(String).join(' '));
        };

        console.error = (...args: any[]) => {
            this.errors.push(args.map(String).join(' '));
        };

        console.warn = (...args: any[]) => {
            this.warnings.push(args.map(String).join(' '));
        };
    }

    stop(): void {
        console.log = this.originalLog;
        console.error = this.originalError;
        console.warn = this.originalWarn;
    }

    getLogs(): string[] {
        return [...this.logs];
    }

    getErrors(): string[] {
        return [...this.errors];
    }

    getWarnings(): string[] {
        return [...this.warnings];
    }

    clear(): void {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
    }
}

/**
 * Create a test event emitter with tracking
 */
export function createTrackedEventEmitter(): EventEmitter & {
    getEmittedEvents: () => Array<{ event: string; data: any }>;
    clearEvents: () => void;
} {
    const emitter = new EventEmitter();
    const emittedEvents: Array<{ event: string; data: any }> = [];

    const originalEmit = emitter.emit.bind(emitter);
    emitter.emit = function(event: string | symbol, ...args: any[]): boolean {
        emittedEvents.push({ event: String(event), data: args });
        return originalEmit(event, ...args);
    };

    return Object.assign(emitter, {
        getEmittedEvents: () => [...emittedEvents],
        clearEvents: () => {
            emittedEvents.length = 0;
        }
    });
}
