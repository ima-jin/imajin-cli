---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-004B"
title: "Service Testing Infrastructure Setup"
updated: "2025-07-02T04:26:00-00:00"
priority: "CRITICAL"
---
**Last Updated**: July 2025

**Status**: Ready for Implementation  
**Priority**: CRITICAL (Testing Foundation - MUST PRECEDE SERVICE REFACTORING)  
**Estimated Effort**: 2-3 hours  
**Dependencies**: Task-004 (Service Architecture Compliance)  

## 🎯 **Objective**

Establish comprehensive testing infrastructure to support service testing, validation, and continuous integration as we refactor and expand service integrations.

**⚠️ CRITICAL**: This testing infrastructure MUST be in place before refactoring services to ensure we can validate changes safely.

## 🔍 **Current Testing State Analysis**

### **Existing Testing Assets**
- ✅ Jest configuration with TypeScript support
- ✅ Basic unit tests (ETLServiceProvider, CredentialManager)
- ✅ Integration tests for business context
- ❌ **Missing: Service API testing patterns**
- ❌ **Missing: HTTP mocking framework**
- ❌ **Missing: Service health check testing**

### **Testing Gaps Identified**
1. No automated testing for service API calls (Stripe, Contentful, Cloudinary)
2. No HTTP request/response mocking infrastructure
3. No service health check validation
4. No rate limiting and circuit breaker testing
5. No performance/load testing patterns

## 🛠️ **Implementation Plan**

### **Phase 1: Core Testing Infrastructure**

#### **1.1 Service Testing Base Classes**
```typescript
// src/test/framework/ServiceTestBase.ts
export abstract class ServiceTestBase<T extends BaseService> {
    protected service: T;
    protected container: Container;
    protected mockEventEmitter: jest.Mocked<EventEmitter>;
    
    abstract createService(): T;
    abstract getMockConfig(): ServiceConfig;
    
    async setupTest(): Promise<void> {
        // Common test setup
        this.container = new Container();
        this.mockEventEmitter = createMockEventEmitter();
        this.service = this.createService();
    }
    
    async teardownTest(): Promise<void> {
        // Common test cleanup
        if (this.service.getStatus() === ServiceStatus.ACTIVE) {
            await this.service.shutdown();
        }
    }
}
```

#### **1.2 HTTP Mocking Framework**
```typescript
// src/test/framework/HttpMockManager.ts
export class HttpMockManager {
    private mockAxios: jest.Mocked<typeof axios>;
    private requestHistory: HttpRequest[] = [];
    
    setupMocks(): void {
        // Setup axios mocking with request tracking
    }
    
    mockSuccessResponse(url: string, response: any): void {
        // Mock successful HTTP responses
    }
    
    mockErrorResponse(url: string, error: Error): void {
        // Mock HTTP error responses
    }
    
    verifyRequest(expectedRequest: Partial<HttpRequest>): void {
        // Verify HTTP requests were made as expected
    }
    
    getRequestHistory(): HttpRequest[] {
        return this.requestHistory;
    }
}
```

#### **1.3 Test Data Factories**
```typescript
// src/test/factories/ServiceTestData.ts
export class StripeTestData {
    static createCustomer(overrides?: Partial<Stripe.Customer>): Stripe.Customer {
        return {
            id: 'cus_test_123',
            object: 'customer',
            email: 'test@example.com',
            name: 'Test Customer',
            created: Math.floor(Date.now() / 1000),
            ...overrides
        };
    }
    
    static createPaymentIntent(overrides?: Partial<Stripe.PaymentIntent>): Stripe.PaymentIntent {
        // Factory for payment intent test data
    }
}

export class ContentfulTestData {
    static createEntry(overrides?: any): any {
        // Factory for Contentful entry test data
    }
}

export class CloudinaryTestData {
    static createUploadResponse(overrides?: any): any {
        // Factory for Cloudinary upload response test data
    }
}
```

### **Phase 2: Service Testing Utilities**

#### **2.1 Health Check Testing**
```typescript
// src/test/framework/HealthCheckTester.ts
export class HealthCheckTester {
    static async validateHealthCheck(
        service: BaseService,
        expectedChecks: string[]
    ): Promise<void> {
        const health = await service.getHealth();
        
        expect(health.status).toBeDefined();
        expect(health.checks).toHaveLength(expectedChecks.length);
        
        for (const checkName of expectedChecks) {
            const check = health.checks.find(c => c.name === checkName);
            expect(check).toBeDefined();
        }
    }
    
    static async validateServiceMetrics(service: BaseService): Promise<void> {
        const metrics = service.getMetrics();
        
        expect(metrics.operationsCount).toBeGreaterThanOrEqual(0);
        expect(metrics.errorsCount).toBeGreaterThanOrEqual(0);
        expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
        expect(metrics.startTime).toBeInstanceOf(Date);
        expect(metrics.lastActivity).toBeInstanceOf(Date);
    }
}
```

#### **2.2 Service Lifecycle Testing**
```typescript
// src/test/framework/ServiceLifecycleTester.ts
export class ServiceLifecycleTester {
    static async validateServiceLifecycle(service: BaseService): Promise<void> {
        // Test initialization
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
        
        await service.initialize();
        expect(service.getStatus()).toBe(ServiceStatus.ACTIVE);
        
        // Test health check
        const health = await service.getHealth();
        expect(health.status).toBe(ServiceStatus.ACTIVE);
        
        // Test shutdown
        await service.shutdown();
        expect(service.getStatus()).toBe(ServiceStatus.INACTIVE);
    }
}
```

### **Phase 3: Testing Configuration**

#### **3.1 Enhanced Jest Configuration**
```typescript
// jest.config.service.js
module.exports = {
    ...require('./jest.config.js'),
    
    // Service-specific test configuration
    testMatch: [
        '**/__tests__/**/*.service.test.ts',
        '**/__tests__/**/*.integration.test.ts'
    ],
    
    setupFilesAfterEnv: [
        '<rootDir>/src/test/setup/serviceTestSetup.ts'
    ],
    
    testTimeout: 30000, // Longer timeout for service tests
    
    // Coverage requirements for services
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
```

#### **3.2 Test Environment Setup**
```typescript
// src/test/setup/serviceTestSetup.ts
import { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';

// Global test setup
beforeEach(() => {
    // Reset container state
    Container.reset();
    
    // Setup mock logger
    const mockLogger = createMockLogger();
    Container.singleton('logger', () => mockLogger);
});

afterEach(async () => {
    // Cleanup any active services
    await cleanupActiveServices();
});
```

## 📋 **Deliverables**

1. **Testing Framework Classes**
   - `src/test/framework/ServiceTestBase.ts`
   - `src/test/framework/HttpMockManager.ts`
   - `src/test/framework/HealthCheckTester.ts`
   - `src/test/framework/ServiceLifecycleTester.ts`

2. **Test Data Factories**
   - `src/test/factories/StripeTestData.ts`
   - `src/test/factories/ContentfulTestData.ts`
   - `src/test/factories/CloudinaryTestData.ts`

3. **Test Configuration**
   - `jest.config.service.js`
   - `src/test/setup/serviceTestSetup.ts`

4. **Testing Utilities**
   - Mock factories for all external APIs
   - Service validation helpers
   - Performance testing utilities

## ✅ **Success Criteria**

- [ ] Service testing base classes are implemented and functional
- [ ] HTTP mocking framework can mock all external API calls
- [ ] Test data factories provide realistic test data for all services
- [ ] Health check testing validates all service health endpoints
- [ ] Service lifecycle testing validates initialization/shutdown patterns
- [ ] Test configuration supports both unit and integration testing
- [ ] All testing utilities are documented with examples

## 🔗 **Dependencies & Next Steps**

**Prerequisite**: Task-004 (Service Architecture Compliance)  
**Leads to**: Task-004C (Service-Specific Test Suites)

---

## 🛡️ **Risk Mitigation**

With this testing infrastructure in place, we can:
- ✅ Safely refactor services knowing tests will catch breaking changes
- ✅ Validate service health and performance under load
- ✅ Ensure consistent service behavior across environments
- ✅ Automate regression testing for all service integrations
