/**
 * ServiceLifecycleTester - Service lifecycle validation utilities
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
 * - Service state transition validation
 * - Service operation testing
 */

import { BaseService } from '../../services/BaseService.js';
import { ServiceStatus } from '../../services/interfaces/ServiceInterface.js';

export interface LifecycleTestOptions {
    initTimeoutMs?: number;
    shutdownTimeoutMs?: number;
    healthCheckTimeoutMs?: number;
    expectEvents?: boolean;
}

/**
 * Utilities for testing service lifecycle patterns
 */
export class ServiceLifecycleTester {
    /**
     * Validate complete service lifecycle (init -> active -> shutdown)
     */
    static async validateServiceLifecycle(
        service: BaseService,
        options: LifecycleTestOptions = {}
    ): Promise<void> {
        const {
            initTimeoutMs = 5000,
            shutdownTimeoutMs = 5000,
            healthCheckTimeoutMs = 1000
        } = options;

        // Test initial state
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Test initialization
        const initStartTime = Date.now();
        await service.initialize();
        const initDuration = Date.now() - initStartTime;
        
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
        expect(initDuration).toBeLessThan(initTimeoutMs);

        // Test health check after initialization
        const healthStartTime = Date.now();
        const health = await service.getHealth();
        const healthDuration = Date.now() - healthStartTime;
        
        expect(health.status).toBe(ServiceStatus.ACTIVE);
        expect(healthDuration).toBeLessThan(healthCheckTimeoutMs);

        // Test shutdown
        const shutdownStartTime = Date.now();
        await service.shutdown();
        const shutdownDuration = Date.now() - shutdownStartTime;
        
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
        expect(shutdownDuration).toBeLessThan(shutdownTimeoutMs);
    }

    /**
     * Test service initialization behavior
     */
    static async validateServiceInitialization(
        service: BaseService,
        expectedInitialChecks: string[] = [],
        timeoutMs: number = 5000
    ): Promise<void> {
        // Verify initial state
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Initialize with timeout
        const initPromise = service.initialize();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), timeoutMs)
        );

        await Promise.race([initPromise, timeoutPromise]);

        // Verify active state
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Verify health checks if specified
        if (expectedInitialChecks.length > 0) {
            const health = await service.getHealth();
            expect(health.checks.length).toBeGreaterThanOrEqual(expectedInitialChecks.length);
            
            for (const checkName of expectedInitialChecks) {
                const check = health.checks.find(c => c.name === checkName);
                expect(check).toBeDefined();
                expect(check!.healthy).toBe(true);
            }
        }
    }

    /**
     * Test service shutdown behavior
     */
    static async validateServiceShutdown(
        service: BaseService,
        timeoutMs: number = 5000
    ): Promise<void> {
        // Ensure service is active
        if (service.getStatus() !== ServiceStatus.ACTIVE) {
            await service.initialize();
        }
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Shutdown with timeout
        const shutdownPromise = service.shutdown();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)
        );

        await Promise.race([shutdownPromise, timeoutPromise]);

        // Verify inactive state
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
    }

    /**
     * Test double initialization (should be idempotent)
     */
    static async validateDoubleInitialization(service: BaseService): Promise<void> {
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // First initialization
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Second initialization should not cause errors
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
    }

    /**
     * Test double shutdown (should be idempotent)
     */
    static async validateDoubleShutdown(service: BaseService): Promise<void> {
        // Ensure service is active
        if (service.getStatus() !== ServiceStatus.ACTIVE) {
            await service.initialize();
        }
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // First shutdown
        await service.shutdown();
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Second shutdown should not cause errors
        await service.shutdown();
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
    }

    /**
     * Test service operations before initialization (should fail gracefully)
     */
    static async validateOperationsBeforeInit(
        service: BaseService,
        operationFn: () => Promise<any>
    ): Promise<void> {
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Operations should fail when service is not initialized
        await expect(operationFn()).rejects.toThrow();
    }

    /**
     * Test service operations after shutdown (should fail gracefully)
     */
    static async validateOperationsAfterShutdown(
        service: BaseService,
        operationFn: () => Promise<any>
    ): Promise<void> {
        // Initialize and then shutdown
        await service.initialize();
        await service.shutdown();
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Operations should fail after shutdown
        await expect(operationFn()).rejects.toThrow();
    }

    /**
     * Test service state transitions with event validation
     */
    static async validateStateTransitionsWithEvents(
        service: BaseService,
        mockEventEmitter: any,
        expectedEvents: string[]
    ): Promise<void> {
        const emittedEvents: string[] = [];
        
        // Track emitted events
        mockEventEmitter.emit.mockImplementation((event: string, ...args: any[]) => {
            emittedEvents.push(event);
            return true;
        });

        // Initialize
        await service.initialize();
        
        // Shutdown
        await service.shutdown();

        // Verify expected events were emitted
        for (const expectedEvent of expectedEvents) {
            expect(emittedEvents).toContain(expectedEvent);
        }
    }

    /**
     * Test service initialization failure handling
     */
    static async validateInitializationFailure(
        service: BaseService,
        errorConditionFn: () => void,
        restoreConditionFn: () => void
    ): Promise<void> {
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Introduce error condition
        errorConditionFn();

        // Initialization should fail
        await expect(service.initialize()).rejects.toThrow();
        expect(service.getStatus()).toBe(ServiceStatus.ERROR);

        // Restore condition
        restoreConditionFn();

        // Should be able to initialize after fixing condition
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
    }

    /**
     * Test service graceful degradation
     */
    static async validateGracefulDegradation(
        service: BaseService,
        degradationConditionFn: () => Promise<void>,
        operationFn: () => Promise<any>
    ): Promise<void> {
        // Initialize service
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Introduce degradation condition
        await degradationConditionFn();

        // Service should enter degraded state
        const health = await service.getHealth();
        expect(health.status).toBe(ServiceStatus.DEGRADED);

        // Operations might still work but with reduced functionality
        // This depends on service implementation
        try {
            await operationFn();
            // If operation succeeds, verify it worked in degraded mode
        } catch (error) {
            // If operation fails, verify it fails gracefully
            expect(error).toBeInstanceOf(Error);
        }
    }

    /**
     * Test service recovery from failures
     */
    static async validateServiceRecovery(
        service: BaseService,
        failureConditionFn: () => Promise<void>,
        recoveryConditionFn: () => Promise<void>,
        maxRecoveryTimeMs: number = 10000
    ): Promise<void> {
        // Initialize service
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Introduce failure
        await failureConditionFn();

        // Service should detect failure
        let health = await service.getHealth();
        expect([ServiceStatus.ERROR, ServiceStatus.DEGRADED]).toContain(health.status);

        // Apply recovery condition
        await recoveryConditionFn();

        // Wait for recovery
        const startTime = Date.now();
        while (Date.now() - startTime < maxRecoveryTimeMs) {
            health = await service.getHealth();
            if (health.status === ServiceStatus.ACTIVE) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        expect(health.status).toBe(ServiceStatus.ACTIVE);
    }

    /**
     * Test concurrent lifecycle operations
     */
    static async validateConcurrentLifecycleOperations(
        service: BaseService
    ): Promise<void> {
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        // Start multiple concurrent initializations
        const initPromises = [
            service.initialize(),
            service.initialize(),
            service.initialize()
        ];

        // All should complete without errors
        await Promise.all(initPromises);
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        // Start multiple concurrent shutdowns
        const shutdownPromises = [
            service.shutdown(),
            service.shutdown(),
            service.shutdown()
        ];

        // All should complete without errors
        await Promise.all(shutdownPromises);
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
    }

    /**
     * Measure and validate service startup performance
     */
    static async validateStartupPerformance(
        service: BaseService,
        maxStartupTimeMs: number = 5000
    ): Promise<number> {
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);

        const startTime = Date.now();
        await service.initialize();
        const startupTime = Date.now() - startTime;

        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
        expect(startupTime).toBeLessThan(maxStartupTimeMs);

        return startupTime;
    }

    /**
     * Measure and validate service shutdown performance
     */
    static async validateShutdownPerformance(
        service: BaseService,
        maxShutdownTimeMs: number = 3000
    ): Promise<number> {
        // Ensure service is active
        if (service.getStatus() !== ServiceStatus.ACTIVE) {
            await service.initialize();
        }
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);

        const startTime = Date.now();
        await service.shutdown();
        const shutdownTime = Date.now() - startTime;

        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
        expect(shutdownTime).toBeLessThan(maxShutdownTimeMs);

        return shutdownTime;
    }
} 