/**
 * HealthCheckTester - Service health check validation utilities
 *
 * @package     @imajin/cli
 * @subpackage  test/framework
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-02
 *
 * Integration Points:
 * - BaseService health check validation
 * - Service metrics verification
 * - Health monitoring testing
 */

import { BaseService } from '../../services/BaseService.js';
import { ServiceStatus, ServiceHealth, HealthCheckResult } from '../../services/interfaces/ServiceInterface.js';

export interface ServiceMetrics {
    operationsCount: number;
    errorsCount: number;
    averageResponseTime: number;
    startTime: Date;
    lastActivity: Date;
    [key: string]: any;
}

/**
 * Utilities for testing service health checks and metrics
 */
export class HealthCheckTester {
    /**
     * Validate service health check response structure and content
     */
    static async validateHealthCheck(
        service: BaseService,
        expectedChecks: string[]
    ): Promise<void> {
        const health = await service.getHealth();
        
        // Validate health response structure
        expect(health).toBeDefined();
        expect(health.status).toBeDefined();
        expect(health.checks).toBeDefined();
        expect(Array.isArray(health.checks)).toBe(true);
        expect(typeof health.uptime).toBe('number');
        
        // Validate expected checks are present
        expect(health.checks).toHaveLength(expectedChecks.length);
        
        for (const checkName of expectedChecks) {
            const check = health.checks.find(c => c.name === checkName);
            expect(check).toBeDefined();
            expect(check!.name).toBe(checkName);
            expect(typeof check!.healthy).toBe('boolean');
        }
    }

    /**
     * Validate service health check with specific status expectations
     */
    static async validateHealthCheckStatus(
        service: BaseService,
        expectedStatus: ServiceStatus,
        expectedCheckStatuses: Record<string, ServiceStatus>
    ): Promise<void> {
        const health = await service.getHealth();
        
        // Validate overall status
        expect(health.status).toBe(expectedStatus);
        
        // Validate individual check statuses  
        for (const [checkName, expectedCheckStatus] of Object.entries(expectedCheckStatuses)) {
            const check = health.checks.find(c => c.name === checkName);
            expect(check).toBeDefined();
            if (check) {
                // Convert status expectation to healthy boolean
                const expectedHealthy = expectedCheckStatus === ServiceStatus.ACTIVE;
                expect(check.healthy).toBe(expectedHealthy);
            }
        }
    }

    /**
     * Validate service metrics structure and values
     */
    static async validateServiceMetrics(service: BaseService): Promise<void> {
        const metrics = service.getMetrics();
        
        // Validate metrics structure
        expect(metrics).toBeDefined();
        expect(typeof metrics.operationsCount).toBe('number');
        expect(typeof metrics.errorsCount).toBe('number');
        expect(typeof metrics.averageResponseTime).toBe('number');
        expect(metrics.startTime).toBeInstanceOf(Date);
        expect(metrics.lastActivity).toBeInstanceOf(Date);
        
        // Validate metric values are sensible
        expect(metrics.operationsCount).toBeGreaterThanOrEqual(0);
        expect(metrics.errorsCount).toBeGreaterThanOrEqual(0);
        expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
        
        // Validate timestamps
        expect(metrics.startTime.getTime()).toBeLessThanOrEqual(Date.now());
        expect(metrics.lastActivity.getTime()).toBeLessThanOrEqual(Date.now());
        expect(metrics.lastActivity.getTime()).toBeGreaterThanOrEqual(metrics.startTime.getTime());
    }

    /**
     * Validate service metrics after operations
     */
    static async validateMetricsAfterOperations(
        service: BaseService,
        expectedOperations: number,
        expectedErrors: number = 0
    ): Promise<void> {
        const metrics = service.getMetrics();
        
        expect(metrics.operationsCount).toBeGreaterThanOrEqual(expectedOperations);
        expect(metrics.errorsCount).toBe(expectedErrors);
        
        // If operations were performed, last activity should be recent
        if (expectedOperations > 0) {
            const timeSinceLastActivity = Date.now() - metrics.lastActivity.getTime();
            expect(timeSinceLastActivity).toBeLessThan(10000); // Within 10 seconds
        }
    }

    /**
     * Test health check performance (should respond quickly)
     */
    static async validateHealthCheckPerformance(
        service: BaseService,
        maxResponseTimeMs: number = 1000
    ): Promise<void> {
        const startTime = Date.now();
        await service.getHealth();
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(maxResponseTimeMs);
    }

    /**
     * Validate health check during service state transitions
     */
    static async validateHealthDuringStateTransition(
        service: BaseService,
        transitionFn: () => Promise<void>,
        expectedInitialStatus: ServiceStatus,
        expectedFinalStatus: ServiceStatus
    ): Promise<void> {
        // Check initial state
        let health = await service.getHealth();
        expect(health.status).toBe(expectedInitialStatus);
        
        // Perform transition
        await transitionFn();
        
        // Check final state
        health = await service.getHealth();
        expect(health.status).toBe(expectedFinalStatus);
    }

    /**
     * Test health check consistency (multiple calls should be consistent)
     */
    static async validateHealthCheckConsistency(
        service: BaseService,
        iterations: number = 5
    ): Promise<void> {
        const healthChecks: ServiceHealth[] = [];
        
        // Perform multiple health checks
        for (let i = 0; i < iterations; i++) {
            const health = await service.getHealth();
            healthChecks.push(health);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
        
        // All checks should have the same status (assuming stable service)
        if (healthChecks.length === 0) {
            throw new Error('No health checks were performed');
        }
        
        const firstStatus = healthChecks[0]!.status;
        for (const health of healthChecks) {
            expect(health.status).toBe(firstStatus);
        }
        
        // Check counts should be consistent
        const firstCheckCount = healthChecks[0]!.checks.length;
        for (const health of healthChecks) {
            expect(health.checks.length).toBe(firstCheckCount);
        }
    }

    /**
     * Validate health check error handling
     */
    static async validateHealthCheckErrorHandling(
        service: BaseService,
        errorConditionFn: () => Promise<void>,
        restoreConditionFn: () => Promise<void>
    ): Promise<void> {
        // Check healthy state
        let health = await service.getHealth();
        const initialStatus = health.status;
        
        // Introduce error condition
        await errorConditionFn();
        
        // Health check should reflect error
        health = await service.getHealth();
        expect(health.status).not.toBe(ServiceStatus.ACTIVE);
        
        // At least one check should be in error state
        const errorChecks = health.checks.filter(check => !check.healthy);
        expect(errorChecks.length).toBeGreaterThan(0);
        
        // Restore condition
        await restoreConditionFn();
        
        // Health should recover (may take time)
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            health = await service.getHealth();
            if (health.status === initialStatus) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        expect(health.status).toBe(initialStatus);
    }

    /**
     * Create mock health check for testing
     */
    static createMockHealthCheck(
        name: string,
        healthy: boolean = true,
        message?: string,
        details?: Record<string, any>
    ): HealthCheckResult {
        const result: HealthCheckResult = {
            name,
            healthy
        };
        if (message !== undefined) {
            result.message = message;
        }
        if (details !== undefined) {
            result.details = details;
        }
        return result;
    }

    /**
     * Create mock service health for testing
     */
    static createMockServiceHealth(
        status: ServiceStatus = ServiceStatus.ACTIVE,
        checks: HealthCheckResult[] = [],
        uptime: number = 1000
    ): ServiceHealth {
        return {
            status,
            name: 'test-service',
            version: '1.0.0',
            uptime,
            metrics: {
                operationsCount: 0,
                errorsCount: 0,
                averageResponseTime: 100,
                startTime: new Date(Date.now() - uptime),
                lastActivity: new Date()
            },
            checks
        };
    }

    /**
     * Create mock service metrics for testing
     */
    static createMockServiceMetrics(
        operationsCount: number = 0,
        errorsCount: number = 0,
        averageResponseTime: number = 100
    ): ServiceMetrics {
        const now = new Date();
        return {
            operationsCount,
            errorsCount,
            averageResponseTime,
            startTime: new Date(now.getTime() - 60000), // 1 minute ago
            lastActivity: now
        };
    }
} 