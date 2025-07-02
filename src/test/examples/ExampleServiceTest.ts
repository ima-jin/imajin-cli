/**
 * ExampleServiceTest - Demonstrates testing infrastructure usage
 *
 * @package     @imajin/cli
 * @subpackage  test/examples
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-02
 *
 * Integration Points:
 * - ServiceTestBase usage example
 * - HTTP mocking demonstration
 * - Health check testing example
 */

import { ServiceTestBase } from '../framework/ServiceTestBase.js';
import { ServiceConfig } from '../../services/interfaces/ServiceInterface.js';
import { HttpMockManager } from '../framework/HttpMockManager.js';
import { HealthCheckTester } from '../framework/HealthCheckTester.js';
import { ServiceLifecycleTester } from '../framework/ServiceLifecycleTester.js';
import { BaseService } from '../../services/BaseService.js';
import { ServiceStatus } from '../../services/interfaces/ServiceInterface.js';

/**
 * Mock service implementation for testing
 */
class MockTestService extends BaseService {
    private isHealthy = true;

    getName(): string {
        return 'MockTestService';
    }

    getVersion(): string {
        return '1.0.0';
    }

    protected async onInitialize(): Promise<void> {
        // Simulate initialization work
        await new Promise(resolve => setTimeout(resolve, 100));
        this.logger.info('Mock service initialized');
    }

    protected async onShutdown(): Promise<void> {
        // Simulate shutdown work
        await new Promise(resolve => setTimeout(resolve, 50));
        this.logger.info('Mock service shut down');
    }

    protected async onHealthCheck() {
        return [
            {
                name: 'database',
                healthy: this.isHealthy,
                message: this.isHealthy ? 'Connected' : 'Connection failed'
            },
            {
                name: 'external-api',
                healthy: true,
                message: 'API responding'
            }
        ];
    }

    // Test helper methods
    public setHealthy(healthy: boolean): void {
        this.isHealthy = healthy;
    }

    public async performOperation(data: any): Promise<any> {
        return this.execute('test-operation', async () => {
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 10));
            return { result: 'success', data };
        });
    }
}

/**
 * Example service test using testing infrastructure
 */
class ExampleServiceTest extends ServiceTestBase<MockTestService> {
    public httpMock!: HttpMockManager;

    createService(): MockTestService {
        return new MockTestService(
            this.container,
            this.testConfig,
            this.mockEventEmitter
        );
    }

    getMockConfig(): ServiceConfig {
        return {
            name: 'MockTestService',
            enabled: true,
            timeout: 5000,
            retryAttempts: 3,
            retryDelay: 1000,
            healthCheckInterval: 30000
        };
    }

    protected async beforeServiceSetup(): Promise<void> {
        // Setup HTTP mocking
        this.httpMock = new HttpMockManager();
        
        // Mock external API responses
        this.httpMock.mockSuccessResponse('https://api.example.com/test', {
            status: 200,
            data: { message: 'Test successful' }
        });
    }

    protected async afterServiceTeardown(): Promise<void> {
        // Cleanup HTTP mocks
        if (this.httpMock) {
            this.httpMock.restoreAxios();
        }
    }
}

/**
 * Test suite demonstrating testing infrastructure
 */
describe('Service Testing Infrastructure Example', () => {
    let testInstance: ExampleServiceTest;

    beforeEach(async () => {
        testInstance = new ExampleServiceTest();
        await testInstance.setupTest();
    });

    afterEach(async () => {
        await testInstance.teardownTest();
    });

    describe('Service Lifecycle Testing', () => {
        it('should validate complete service lifecycle', async () => {
            await ServiceLifecycleTester.validateServiceLifecycle(testInstance.getService());
        });

        it('should handle double initialization gracefully', async () => {
            await ServiceLifecycleTester.validateDoubleInitialization(testInstance.getService());
        });

        it('should handle double shutdown gracefully', async () => {
            await ServiceLifecycleTester.validateDoubleShutdown(testInstance.getService());
        });

        it('should validate initialization performance', async () => {
            const startupTime = await ServiceLifecycleTester.validateStartupPerformance(
                testInstance.getService(),
                2000 // max 2 seconds
            );
            
            expect(startupTime).toBeLessThan(2000);
        });
    });

    describe('Health Check Testing', () => {
        it('should validate health check response structure', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            await HealthCheckTester.validateHealthCheck(
                service,
                ['database', 'external-api']
            );
        });

        it('should validate health check performance', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            await HealthCheckTester.validateHealthCheckPerformance(
                service,
                500 // max 500ms
            );
        });

        it('should handle degraded service state', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Simulate service degradation
            service.setHealthy(false);
            
            const health = await service.getHealth();
            expect(health.status).toBe(ServiceStatus.DEGRADED);
        });

        it('should validate metrics tracking', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Perform some operations
            await service.performOperation({ test: 'data1' });
            await service.performOperation({ test: 'data2' });
            
            await HealthCheckTester.validateMetricsAfterOperations(
                service,
                2, // expected operations
                0  // expected errors
            );
        });
    });

    describe('HTTP Mocking', () => {
        it('should mock HTTP requests successfully', async () => {
            const httpMock = new HttpMockManager();
            
            // Setup mock response
            httpMock.mockSuccessResponse('https://api.example.com/users', {
                status: 200,
                data: [
                    { id: 1, name: 'John Doe' },
                    { id: 2, name: 'Jane Smith' }
                ]
            });
            
            // Make request (this would normally be done by service)
            const axios = require('axios');
            const response = await axios.get('https://api.example.com/users');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveLength(2);
            
            // Verify request was made
            httpMock.verifyRequest({
                method: 'GET',
                url: 'https://api.example.com/users'
            });
            
            httpMock.restoreAxios();
        });

        it('should mock error responses', async () => {
            const httpMock = new HttpMockManager();
            
            // Setup mock error
            httpMock.mockErrorResponse('https://api.example.com/error', {
                message: 'Not Found',
                status: 404
            });
            
            // Make request and expect error
            const axios = require('axios');
            await expect(axios.get('https://api.example.com/error')).rejects.toThrow('Not Found');
            
            httpMock.restoreAxios();
        });
    });

    describe('Event System Testing', () => {
        it('should track service events', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Verify initialization event was emitted
            testInstance.assertEventEmitted('service:initialized', {
                service: 'MockTestService'
            });
            
            // Perform operation and verify event
            await service.performOperation({ test: 'data' });
            
            testInstance.assertEventEmitted('service:operation', {
                service: 'MockTestService',
                operation: 'test-operation',
                success: true
            });
        });

        it('should track event emission count', async () => {
            const service = testInstance.getService();
            await service.initialize();
            await service.performOperation({ test: 'data1' });
            await service.performOperation({ test: 'data2' });
            
            const operationEventCount = testInstance.getEventEmitCount('service:operation');
            expect(operationEventCount).toBe(2);
        });
    });

    describe('Service Configuration Testing', () => {
        it('should validate service configuration', () => {
            const service = testInstance.getService();
            const config = service.getConfig();
            
            expect(config).toMatchObject({
                name: 'MockTestService',
                enabled: true,
                timeout: 5000,
                retryAttempts: 3
            });
        });

        it('should handle configuration updates', () => {
            const service = testInstance.getService();
            const newConfig = {
                timeout: 10000,
                retryAttempts: 5
            };
            
            service.updateConfig(newConfig);
            
            const updatedConfig = service.getConfig();
            expect(updatedConfig.timeout).toBe(10000);
            expect(updatedConfig.retryAttempts).toBe(5);
        });
    });

    describe('Logging Integration', () => {
        it('should log service operations', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            testInstance.assertLoggerCalled('info', 'Mock service initialized');
        });

        it('should log operation details', async () => {
            const service = testInstance.getService();
            await service.initialize();
            await service.performOperation({ test: 'data' });
            
            testInstance.assertLoggerCalled('debug', 'Executing operation: test-operation');
            testInstance.assertLoggerCalled('debug', 'Operation completed: test-operation');
        });
    });

    describe('Custom Matchers', () => {
        it('should validate service interface', async () => {
            expect(testInstance.getService()).toBeValidService();
        });

        it('should validate event emission', async () => {
            const service = testInstance.getService();
            await service.initialize();
            expect(testInstance.getMockEventEmitter()).toHaveEmittedEvent('service:initialized');
        });
    });

    describe('Enhanced Testing Patterns', () => {
        it('should use convenience method to wait for healthy service', async () => {
            // Initialize service
            const service = testInstance.getService();
            await service.initialize();
            
            // Wait for service to be healthy using new convenience method
            await testInstance['waitForHealthyService'](3000);
            
            // Verify service is healthy
            const health = await service.getHealth();
            expect(health.status).toBe(ServiceStatus.ACTIVE);
            expect(health.checks.every(check => check.healthy)).toBe(true);
        });

        it('should assert service events using convenience method', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Service should emit initialization event
            testInstance['assertServiceEvent']('service:initialized', {
                service: 'MockTestService'
            });
        });

        it('should handle service operations with event assertions', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Perform operation
            const result = await service.performOperation({ test: 'data' });
            
            // Assert operation event was emitted
            testInstance['assertServiceEvent']('service:operation', {
                service: 'MockTestService',
                operation: 'test-operation',
                success: true
            });
            
            expect(result).toEqual({ result: 'success', data: { test: 'data' } });
        });

        it('should demonstrate enhanced service validation', async () => {
            const service = testInstance.getService();
            await service.initialize();
            
            // Use new custom matcher
            expect(service).toBeValidService();
            
            // Use new health matcher
            await expect(service).toBeHealthyService();
        });

        it('should validate HTTP mock cleanup', async () => {
            const httpMock = testInstance.httpMock;
            
            // Make some requests to track
            httpMock.mockSuccessResponse('https://api.test.com/endpoint', {
                status: 200,
                data: { message: 'Success' }
            });
            
            // Verify cleanup happens automatically
            expect(httpMock.getRequestHistory().length).toBe(0);
        });
    });
});

export { ExampleServiceTest, MockTestService }; 