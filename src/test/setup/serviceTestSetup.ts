/**
 * Service Test Setup - Global test environment configuration
 *
 * @package     @imajin/cli
 * @subpackage  test/setup
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Jest test environment setup
 * - Global mock configuration
 * - Container and dependency injection setup
 */

import { Container } from '../../container/Container.js';
import { EventEmitter } from 'node:events';

// Global test timeout for async operations
jest.setTimeout(30000);

// Global container instance for testing
let globalContainer: Container | undefined;
let httpMockManager: any;

/**
 * Setup function called before each test
 */
beforeEach(() => {
    // Reset container state for better isolation
    globalContainer = new Container();
    
    // Setup mock logger
    const mockLogger = createMockLogger();
    globalContainer.singleton('logger', () => mockLogger);
    
    // Setup mock event emitter
    const mockEventEmitter = createMockEventEmitter();
    globalContainer.singleton('eventEmitter', () => mockEventEmitter);
    
    // Setup mock configuration
    const mockConfig = createMockConfig();
    globalContainer.singleton('config', () => mockConfig);
    
    // Clear all mocks
    jest.clearAllMocks();

    // Store references for cleanup
    (globalThis as any).testContainer = globalContainer;
    (globalThis as any).mockLogger = mockLogger;
    (globalThis as any).mockEventEmitter = mockEventEmitter;
});

/**
 * Cleanup function called after each test
 */
afterEach(async () => {
    // Clean up any hanging promises or timers
    await flushPromises();
    
    // Enhanced cleanup for HTTP mocks
    if (httpMockManager) {
        httpMockManager.destroy();
        httpMockManager = null;
    }
    
    // Clear all timers
    jest.clearAllTimers();
    
    // Restore all mocks
    jest.restoreAllMocks();

    // Clear global references
    (globalThis as any).testContainer = null;
    (globalThis as any).mockLogger = null;
    (globalThis as any).mockEventEmitter = null;
});

/**
 * Global cleanup after all tests
 */
afterAll(async () => {
    // Final cleanup
    await flushPromises();
});

/**
 * Create mock logger for testing
 */
function createMockLogger() {
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
    };
}

/**
 * Create mock event emitter for testing
 */
function createMockEventEmitter() {
    const emitter = new EventEmitter();
    
    // Track all events for testing
    const originalEmit = emitter.emit.bind(emitter);
    emitter.emit = jest.fn(originalEmit);
    
    const originalOn = emitter.on.bind(emitter);
    emitter.on = jest.fn(originalOn);
    
    const originalOnce = emitter.once.bind(emitter);
    emitter.once = jest.fn(originalOnce);
    
    return emitter;
}

/**
 * Create mock configuration for testing
 */
function createMockConfig() {
    return {
        database: {
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            username: 'test_user',
            password: 'test_pass'
        },
        services: {
            stripe: {
                apiKey: 'sk_test_123',
                webhookSecret: 'whsec_test_123'
            },
            contentful: {
                spaceId: 'test_space_123',
                accessToken: 'test_token_123',
                environment: 'master'
            },
            cloudinary: {
                cloudName: 'test_cloud',
                apiKey: 'test_api_key',
                apiSecret: 'test_api_secret'
            }
        },
        logging: {
            level: 'debug',
            format: 'json'
        },
        testing: true
    };
}

/**
 * Flush all pending promises
 */
async function flushPromises(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * Global test utilities
 */
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidService(): R;
            toHaveEmittedEvent(eventName: string): R;
            toBeHealthyService(): Promise<R>;
            toHaveBeenCalledWithServiceConfig(): R;
        }
    }
    
    var testContainer: Container;
    var mockLogger: any;
    var mockEventEmitter: EventEmitter;
    var flushPromises: () => Promise<void>;
}

// Make utilities available globally
if (globalContainer) {
    (globalThis as any).testContainer = globalContainer;
}
(globalThis as any).flushPromises = flushPromises;

/**
 * Enhanced custom Jest matchers for service testing
 */
expect.extend({
    /**
     * Check if object is a valid service instance
     */
    toBeValidService(received: any) {
        const pass = received &&
            typeof received.getName === 'function' &&
            typeof received.getVersion === 'function' &&
            typeof received.getStatus === 'function' &&
            typeof received.initialize === 'function' &&
            typeof received.shutdown === 'function' &&
            typeof received.getHealth === 'function';
            
        return {
            message: () => pass
                ? `Expected ${received} not to be a valid service`
                : `Expected ${received} to be a valid service with required methods`,
            pass
        };
    },
    
    /**
     * Check if event emitter emitted specific event
     */
    toHaveEmittedEvent(received: EventEmitter, eventName: string) {
        const emitSpy = received.emit as jest.Mock;
        const pass = emitSpy && emitSpy.mock.calls.some(call => call[0] === eventName);
        
        return {
            message: () => pass
                ? `Expected event '${eventName}' not to be emitted`
                : `Expected event '${eventName}' to be emitted`,
            pass
        };
    },

    /**
     * Check if service reached healthy state
     */
    async toBeHealthyService(received: any) {
        if (!received || typeof received.getHealth !== 'function') {
            return {
                message: () => 'Expected a valid service with getHealth method',
                pass: false
            };
        }
        
        const health = await received.getHealth();
        const pass = health.status === 'active' && health.checks.every((check: any) => check.healthy);
        
        return {
            message: () => pass
                ? 'Expected service not to be healthy'
                : `Expected service to be healthy, but status was ${health.status}`,
            pass
        };
    },

    /**
     * Check if function was called with service configuration
     */
    toHaveBeenCalledWithServiceConfig(received: jest.Mock) {
        const calls = received.mock.calls;
        const pass = calls.some(call => 
            call[0] && 
            typeof call[0] === 'object' &&
            call[0].name &&
            typeof call[0].enabled === 'boolean'
        );
        
        return {
            message: () => pass
                ? `Expected function not to have been called with service config`
                : `Expected function to have been called with service config`,
            pass
        };
    }
});

/**
 * Global error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in tests, just log the error
});

/**
 * Global error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in tests, just log the error
});

// Console overrides for cleaner test output
if (process.env.NODE_ENV === 'test') {
    // Suppress console.log in tests unless explicitly enabled
    if (!process.env.ENABLE_TEST_LOGS) {
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
    }
} 