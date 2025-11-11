/**
 * ServiceTestBase - Abstract base class for service testing
 *
 * @package     @imajin/cli
 * @subpackage  test/framework
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 * @updated      2025-07-03
 *
 * Integration Points:
 * - BaseService lifecycle testing
 * - Container dependency management
 * - Event-driven system mocking
 */

import { EventEmitter } from 'node:events';
import { Container } from '../../container/Container.js';
import { BaseService } from '../../services/BaseService.js';
import { ServiceStatus, ServiceConfig } from '../../services/interfaces/ServiceInterface.js';
import { Logger } from '../../logging/Logger.js';

// Re-export ServiceConfig for convenience
export { ServiceConfig } from '../../services/interfaces/ServiceInterface.js';

export interface MockEventEmitter extends jest.Mocked<EventEmitter> {
    mockClear(): void;
    mockReset(): void;
}

/**
 * Abstract base class for service testing
 * Provides common setup, teardown, and testing utilities
 */
export abstract class ServiceTestBase<T extends BaseService> {
    protected service!: T;
    protected container!: Container;
    protected mockEventEmitter!: MockEventEmitter;
    protected mockLogger!: jest.Mocked<Logger>;
    protected testConfig!: ServiceConfig;

    /**
     * Create service instance for testing
     * Must be implemented by concrete test classes
     */
    abstract createService(): T;

    /**
     * Get mock configuration for service
     * Must be implemented by concrete test classes
     */
    abstract getMockConfig(): ServiceConfig;

    /**
     * Setup test environment before each test
     */
    async setupTest(): Promise<void> {
        // Reset container state
        this.container = new Container();
        
        // Create mock logger
        this.mockLogger = this.createMockLogger();
        this.container.singleton('logger', () => this.mockLogger);

        // Create mock event emitter
        this.mockEventEmitter = this.createMockEventEmitter();
        this.container.singleton('eventEmitter', () => this.mockEventEmitter);

        // Get test configuration
        this.testConfig = this.getMockConfig();

        // Create service instance
        this.service = this.createService();

        // Additional setup hook
        await this.beforeServiceSetup();
    }

    /**
     * Cleanup test environment after each test
     */
    async teardownTest(): Promise<void> {
        try {
            // Shutdown service if active
            if (this.service && this.service.getStatus() === ServiceStatus.ACTIVE) {
                await this.service.shutdown();
            }

            // Additional cleanup hook
            await this.afterServiceTeardown();

            // Clear mocks
            if (this.mockEventEmitter) {
                this.mockEventEmitter.mockClear();
            }
            if (this.mockLogger) {
                jest.clearAllMocks();
            }

            // Enhanced container cleanup - clear all registered services
            this.clearContainerState();
        } catch (error) {
            console.error('Error during test teardown:', error);
        }
    }

    /**
     * Hook for additional setup before service creation
     */
    protected async beforeServiceSetup(): Promise<void> {
        // Override in subclasses if needed
    }

    /**
     * Hook for additional cleanup after service shutdown
     */
    protected async afterServiceTeardown(): Promise<void> {
        // Override in subclasses if needed
    }

    /**
     * Create mock logger with common methods
     */
    protected createMockLogger(): jest.Mocked<Logger> {
        return {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            child: jest.fn().mockReturnThis(),
            level: 'info',
            isLevelEnabled: jest.fn().mockReturnValue(true)
        } as any;
    }

    /**
     * Create mock event emitter with tracking
     */
    protected createMockEventEmitter(): MockEventEmitter {
        const mockEmitter = new EventEmitter() as any;
        
        // Mock the methods we need to track
        mockEmitter.emit = jest.fn(EventEmitter.prototype.emit.bind(mockEmitter));
        mockEmitter.on = jest.fn(EventEmitter.prototype.on.bind(mockEmitter));
        mockEmitter.once = jest.fn(EventEmitter.prototype.once.bind(mockEmitter));
        mockEmitter.removeListener = jest.fn(EventEmitter.prototype.removeListener.bind(mockEmitter));
        mockEmitter.removeAllListeners = jest.fn(EventEmitter.prototype.removeAllListeners.bind(mockEmitter));

        // Add mock control methods
        mockEmitter.mockClear = () => {
            jest.clearAllMocks();
        };

        mockEmitter.mockReset = () => {
            jest.resetAllMocks();
            mockEmitter.removeAllListeners();
        };

        return mockEmitter;
    }

    /**
     * Wait for service to reach specific status
     */
    protected async waitForServiceStatus(
        expectedStatus: ServiceStatus, 
        timeoutMs: number = 5000
    ): Promise<void> {
        const startTime = Date.now();
        
        while (this.service.getStatus() !== expectedStatus) {
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(
                    `Service did not reach status ${expectedStatus} within ${timeoutMs}ms. Current status: ${this.service.getStatus()}`
                );
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Assert that event was emitted with expected data
     */
    public assertEventEmitted(eventName: string, expectedData?: any): void {
        expect(this.mockEventEmitter.emit).toHaveBeenCalledWith(
            eventName,
            expectedData ? expect.objectContaining(expectedData) : expect.anything()
        );
    }

    /**
     * Assert that logger was called with expected level and message
     */
    public assertLoggerCalled(level: keyof Logger, message?: string): void {
        if (message) {
            expect(this.mockLogger[level]).toHaveBeenCalledWith(
                expect.stringContaining(message)
            );
        } else {
            expect(this.mockLogger[level]).toHaveBeenCalled();
        }
    }

    /**
     * Get number of times event was emitted
     */
    public getEventEmitCount(eventName: string): number {
        const calls = (this.mockEventEmitter.emit as jest.Mock).mock.calls;
        return calls.filter(call => call[0] === eventName).length;
    }

    /**
     * Reset all mocks for clean test state
     */
    protected resetMocks(): void {
        this.mockEventEmitter.mockReset();
        jest.clearAllMocks();
    }

    /**
     * Wait for service to reach healthy status
     */
    public async waitForHealthyService(timeoutMs: number = 5000): Promise<void> {
        const startTime = Date.now();
        
        while (true) {
            const health = await this.service.getHealth();
            if (health.status === ServiceStatus.ACTIVE && health.checks.every(check => check.healthy)) {
                return;
            }
            
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(
                    `Service did not reach healthy status within ${timeoutMs}ms. Current status: ${health.status}`
                );
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Assert that service event was emitted with expected data
     */
    public assertServiceEvent(eventName: string, expectedData?: any): void {
        const emitCalls = (this.mockEventEmitter.emit as jest.Mock).mock.calls;
        const matchingCall = emitCalls.find(call => call[0] === eventName);
        
        if (!matchingCall) {
            throw new Error(`Expected service event '${eventName}' was not emitted`);
        }
        
        if (expectedData) {
            expect(matchingCall[1]).toEqual(expect.objectContaining(expectedData));
        }
    }

    /**
     * Clear container state for better test isolation
     */
    protected clearContainerState(): void {
        // Clear singleton registrations to prevent test interference
        // Note: This is a workaround until Container.reset() is implemented
        if (this.container && typeof (this.container as any).clear === 'function') {
            (this.container as any).clear();
        }
    }

    /**
     * Get the service instance for testing (public accessor)
     */
    public getService(): T {
        return this.service;
    }

    /**
     * Get the mock event emitter for testing (public accessor)
     */
    public getMockEventEmitter(): MockEventEmitter {
        return this.mockEventEmitter;
    }
} 