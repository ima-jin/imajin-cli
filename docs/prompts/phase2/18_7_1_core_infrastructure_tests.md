---
# Metadata
title: "18.7.1 Core Infrastructure Tests"
created: "2025-11-21T08:45:00Z"
updated: "2025-11-21T08:45:00Z"
---

# 🧪 IMPLEMENT: Core Infrastructure Tests (Priority 1)

**Status:** ⏳ **Ready to Start**
**Phase:** Test Coverage - Sub-prompt 1 of 5
**Estimated Time:** 30-40 hours
**Target Coverage:** +15-20% (from 11% to 26-31%)
**Dependencies:** None (foundational)

---

## 📋 **CONTEXT**

Core infrastructure modules are the foundation of imajin-cli. Every feature depends on these working correctly. This prompt focuses on testing the critical systems that:
- Bootstrap the application
- Manage service lifecycle
- Handle errors and recovery
- Coordinate events
- Monitor system health
- Log operations

**Current State:**
- ✅ Container tested (32 tests, 100%)
- ✅ ErrorHandler tested (26 tests, core scenarios)
- ❌ Logger untested (0 tests)
- ❌ EventManager untested (0 tests)
- ❌ Monitoring untested (0 tests)
- ❌ ServiceProvider base untested (0 tests)
- ❌ Error Recovery untested (0 tests)

---

## 🎯 **OBJECTIVES**

1. **Test Logger System** - Comprehensive Winston integration testing
2. **Test EventManager** - Event coordination and error handling
3. **Test ServiceProvider** - Base class lifecycle and contract
4. **Test Monitoring** - System diagnostics and health checks
5. **Test Error Recovery** - Recovery strategies and fallbacks

**Success Metrics:**
- 400-500 new tests written
- +15-20% coverage gain
- All critical infrastructure paths tested
- Zero regressions in existing tests

---

## 📦 **DELIVERABLES**

### **Test Files to Create** (15-20 files)

#### **1. Logger Tests** (`src/logging/__tests__/`)
- [ ] `Logger.test.ts` - Core logging functionality (40-50 tests)
  - Log level filtering
  - Winston transport integration
  - Structured logging (context objects)
  - Error serialization
  - Color output handling
  - JSON mode
  - File rotation
  - Log formatting

- [ ] `LoggerFactory.test.ts` - Logger instance creation (15-20 tests)
  - Default logger creation
  - Custom configuration
  - Multiple logger instances
  - Named loggers

#### **2. Event System Tests** (`src/core/events/__tests__/`)
- [ ] `EventManager.test.ts` - Event coordination (50-60 tests)
  - Event registration
  - Event emission
  - Event handlers
  - Wildcard events
  - Event namespacing
  - Error handling in listeners
  - Memory leaks (listener cleanup)
  - Max listeners enforcement
  - Event history tracking

- [ ] `EventQueue.test.ts` - Async event queuing (20-25 tests)
  - Queue management
  - Priority handling
  - Batch processing
  - Error recovery

#### **3. ServiceProvider Tests** (`src/providers/__tests__/`)
- [ ] `ServiceProvider.test.ts` - Base class contract (30-40 tests)
  - Constructor behavior
  - Abstract method enforcement
  - Lifecycle hooks (register → boot → commands)
  - Error handling in lifecycle
  - Container integration
  - Command registration patterns

#### **4. Monitoring Tests** (`src/core/monitoring/__tests__/`)
- [ ] `SystemMonitor.test.ts` - System diagnostics (40-50 tests)
  - CPU monitoring
  - Memory monitoring
  - Disk usage tracking
  - Network stats
  - Process metrics
  - Health checks
  - Alert thresholds
  - Metric aggregation

- [ ] `PerformanceMonitor.test.ts` - Performance tracking (25-30 tests)
  - Operation timing
  - Throughput measurement
  - Latency percentiles
  - Bottleneck detection

#### **5. Error Recovery Tests** (`src/core/__tests__/`)
- [ ] `ErrorRecovery.test.ts` - Recovery strategies (45-55 tests)
  - Retry strategies (exponential backoff, linear, fixed)
  - Circuit breaker pattern
  - Fallback mechanisms
  - Recovery state management
  - Max retry limits
  - Timeout handling
  - Error categorization (recoverable vs fatal)

#### **6. Credential Management Tests** (Expand existing)
- [ ] `CredentialManager.test.ts` - Add 20-30 more tests
  - Cross-platform storage
  - Encryption/decryption
  - Key rotation
  - Multiple credential sets
  - Credential expiry
  - Secure deletion

#### **7. Core Utilities Tests** (`src/core/__tests__/`)
- [ ] `ConfigManager.test.ts` - Configuration management (25-30 tests)
- [ ] `PluginManager.test.ts` - Plugin lifecycle (30-35 tests)

---

## 🔧 **IMPLEMENTATION GUIDE**

### **Step 1: Logger Tests** (8-10 hours)

**Module:** `src/logging/Logger.ts`

**Key Test Scenarios:**

```typescript
describe('Logger', () => {
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger({ level: 'debug' });
    });

    describe('Log Levels', () => {
        it('should respect log level filtering', () => {
            const debugLogger = new Logger({ level: 'debug' });
            const errorLogger = new Logger({ level: 'error' });

            // Debug logger should log everything
            // Error logger should only log errors
        });

        it('should support all log levels', () => {
            // Test: debug, info, warn, error levels
        });
    });

    describe('Structured Logging', () => {
        it('should include context objects', () => {
            logger.info('User action', { userId: '123', action: 'login' });
            // Verify context is included in output
        });

        it('should serialize errors properly', () => {
            const error = new Error('Test error');
            logger.error('Operation failed', error);
            // Verify stack trace is captured
        });
    });

    describe('Output Formatting', () => {
        it('should format for console output', () => {
            const consoleLogger = new Logger({
                level: 'info',
                enableColors: true
            });
            // Verify ANSI colors
        });

        it('should format for JSON output', () => {
            const jsonLogger = new Logger({
                level: 'info',
                format: 'json'
            });
            // Verify valid JSON
        });
    });

    describe('Transports', () => {
        it('should write to console transport', () => {
            // Mock console.log and verify calls
        });

        it('should write to file transport', () => {
            // Use temp file, verify contents
        });
    });
});
```

**Implementation Notes:**
- Use `jest.spyOn()` to mock Winston transports
- Create temp files for file transport tests
- Clean up resources in `afterEach`
- Test both sync and async logging

---

### **Step 2: EventManager Tests** (8-10 hours)

**Module:** `src/core/events/EventManager.ts`

**Key Test Scenarios:**

```typescript
describe('EventManager', () => {
    let eventManager: EventManager;

    beforeEach(() => {
        eventManager = new EventManager();
    });

    afterEach(() => {
        eventManager.removeAllListeners();
    });

    describe('Event Registration', () => {
        it('should register event handlers', () => {
            const handler = jest.fn();
            eventManager.on('test:event', handler);
            eventManager.emit('test:event', 'data');

            expect(handler).toHaveBeenCalledWith('data');
        });

        it('should support wildcard events', () => {
            const handler = jest.fn();
            eventManager.on('test:*', handler);

            eventManager.emit('test:foo', 'data1');
            eventManager.emit('test:bar', 'data2');

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('should unregister handlers', () => {
            const handler = jest.fn();
            eventManager.on('test', handler);
            eventManager.off('test', handler);
            eventManager.emit('test');

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should catch handler errors', () => {
            const failingHandler = () => { throw new Error('Handler failed'); };
            const successHandler = jest.fn();

            eventManager.on('test', failingHandler);
            eventManager.on('test', successHandler);

            eventManager.emit('test');

            // Should not prevent other handlers from running
            expect(successHandler).toHaveBeenCalled();
        });

        it('should emit error events for handler failures', (done) => {
            eventManager.on('error', (error) => {
                expect(error.message).toBe('Handler failed');
                done();
            });

            eventManager.on('test', () => {
                throw new Error('Handler failed');
            });

            eventManager.emit('test');
        });
    });

    describe('Memory Management', () => {
        it('should prevent memory leaks', () => {
            const handler = jest.fn();

            for (let i = 0; i < 1000; i++) {
                eventManager.on('test', handler);
            }

            // Should warn or limit listeners
            expect(eventManager.listenerCount('test')).toBeLessThan(100);
        });

        it('should clean up once() handlers', () => {
            const handler = jest.fn();
            eventManager.once('test', handler);

            eventManager.emit('test');
            eventManager.emit('test');

            expect(handler).toHaveBeenCalledTimes(1);
            expect(eventManager.listenerCount('test')).toBe(0);
        });
    });
});
```

---

### **Step 3: ServiceProvider Tests** (6-8 hours)

**Module:** `src/providers/ServiceProvider.ts`

**Challenge:** Abstract class - need concrete implementation for testing

```typescript
// Create test implementation
class TestServiceProvider extends ServiceProvider {
    public registerCalled = false;
    public bootCalled = false;
    public commandsRegistered = false;

    public getName(): string {
        return 'test-service';
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

describe('ServiceProvider', () => {
    let container: Container;
    let program: Command;
    let provider: TestServiceProvider;

    beforeEach(() => {
        container = new Container();
        program = new Command();
        provider = new TestServiceProvider(container, program);
    });

    describe('Lifecycle', () => {
        it('should enforce lifecycle order', async () => {
            const order: string[] = [];

            class OrderTrackingProvider extends ServiceProvider {
                public getName() { return 'order'; }
                public getVersion() { return '1.0.0'; }

                public async register() {
                    order.push('register');
                }

                public async boot() {
                    order.push('boot');
                }

                public registerCommands() {
                    order.push('commands');
                }
            }

            const tracker = new OrderTrackingProvider(container, program);

            await tracker.register();
            await tracker.boot();
            tracker.registerCommands();

            expect(order).toEqual(['register', 'boot', 'commands']);
        });
    });

    describe('Container Integration', () => {
        it('should have access to container', () => {
            expect(provider['container']).toBe(container);
        });

        it('should register services in container', async () => {
            class ServiceRegisteringProvider extends TestServiceProvider {
                public async register() {
                    this.container.singleton('testService', () => ({ foo: 'bar' }));
                }
            }

            const regProvider = new ServiceRegisteringProvider(container, program);
            await regProvider.register();

            expect(container.has('testService')).toBe(true);
        });
    });
});
```

---

### **Step 4: Monitoring Tests** (6-8 hours)

**Module:** `src/core/monitoring/SystemMonitor.ts`

**Key Test Scenarios:**
- System metrics collection
- Health check aggregation
- Alert threshold detection
- Metric formatting and reporting

```typescript
describe('SystemMonitor', () => {
    let monitor: SystemMonitor;

    beforeEach(() => {
        monitor = new SystemMonitor();
    });

    describe('System Metrics', () => {
        it('should collect CPU metrics', () => {
            const metrics = monitor.getCPUMetrics();

            expect(metrics.usage).toBeGreaterThanOrEqual(0);
            expect(metrics.usage).toBeLessThanOrEqual(100);
        });

        it('should collect memory metrics', () => {
            const metrics = monitor.getMemoryMetrics();

            expect(metrics.used).toBeGreaterThan(0);
            expect(metrics.total).toBeGreaterThan(metrics.used);
            expect(metrics.percentage).toBeGreaterThanOrEqual(0);
            expect(metrics.percentage).toBeLessThanOrEqual(100);
        });
    });

    describe('Health Checks', () => {
        it('should aggregate health status', () => {
            monitor.registerHealthCheck('database', async () => ({
                status: 'healthy',
                latency: 10
            }));

            monitor.registerHealthCheck('api', async () => ({
                status: 'healthy',
                latency: 50
            }));

            const health = await monitor.getHealth();

            expect(health.overall).toBe('healthy');
            expect(health.checks).toHaveLength(2);
        });

        it('should detect unhealthy components', () => {
            monitor.registerHealthCheck('failing', async () => ({
                status: 'unhealthy',
                error: 'Connection failed'
            }));

            const health = await monitor.getHealth();

            expect(health.overall).toBe('unhealthy');
        });
    });
});
```

---

### **Step 5: Error Recovery Tests** (8-10 hours)

**Module:** `src/core/ErrorRecovery.ts`

**Key Test Scenarios:**
- Retry with exponential backoff
- Circuit breaker pattern
- Fallback execution
- Recovery state transitions

```typescript
describe('ErrorRecovery', () => {
    let recovery: ErrorRecovery;

    beforeEach(() => {
        recovery = new ErrorRecovery();
    });

    describe('Retry Strategies', () => {
        it('should retry with exponential backoff', async () => {
            let attempts = 0;
            const operation = jest.fn(async () => {
                attempts++;
                if (attempts < 3) throw new Error('Temporary failure');
                return 'success';
            });

            const result = await recovery.retry(operation, {
                maxAttempts: 3,
                backoff: 'exponential',
                initialDelay: 10
            });

            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        it('should respect max retry limit', async () => {
            const operation = jest.fn(async () => {
                throw new Error('Permanent failure');
            });

            await expect(
                recovery.retry(operation, { maxAttempts: 3 })
            ).rejects.toThrow();

            expect(operation).toHaveBeenCalledTimes(3);
        });
    });

    describe('Circuit Breaker', () => {
        it('should open circuit after threshold', async () => {
            const operation = jest.fn(async () => {
                throw new Error('Service down');
            });

            // Trigger failures
            for (let i = 0; i < 5; i++) {
                await recovery.execute(operation).catch(() => {});
            }

            // Circuit should be open
            const state = recovery.getCircuitState('default');
            expect(state).toBe('open');

            // Should reject immediately
            await expect(
                recovery.execute(operation)
            ).rejects.toThrow('Circuit breaker open');

            // Operation should not be called
            expect(operation).toHaveBeenCalledTimes(5);
        });

        it('should half-open circuit after timeout', async () => {
            jest.useFakeTimers();

            // Open circuit
            const operation = jest.fn(async () => {
                throw new Error('Failure');
            });

            for (let i = 0; i < 5; i++) {
                await recovery.execute(operation).catch(() => {});
            }

            expect(recovery.getCircuitState('default')).toBe('open');

            // Wait for reset timeout
            jest.advanceTimersByTime(60000);

            expect(recovery.getCircuitState('default')).toBe('half-open');

            jest.useRealTimers();
        });
    });

    describe('Fallbacks', () => {
        it('should execute fallback on failure', async () => {
            const operation = async () => {
                throw new Error('Primary failed');
            };

            const fallback = async () => 'fallback value';

            const result = await recovery.withFallback(operation, fallback);

            expect(result).toBe('fallback value');
        });

        it('should prefer primary when available', async () => {
            const operation = async () => 'primary value';
            const fallback = async () => 'fallback value';

            const result = await recovery.withFallback(operation, fallback);

            expect(result).toBe('primary value');
        });
    });
});
```

---

## ✅ **SUCCESS CRITERIA**

### **Functional Requirements**
- [ ] All test files created and passing
- [ ] Coverage increased by 15-20%
- [ ] No regressions in existing tests
- [ ] All builds passing

### **Quality Requirements**
- [ ] Test names are descriptive
- [ ] Tests are focused and independent
- [ ] Async operations handled correctly
- [ ] Resources cleaned up properly
- [ ] Edge cases covered
- [ ] Error paths tested

### **Documentation Requirements**
- [ ] Test utilities documented
- [ ] Common patterns extracted
- [ ] README updated with test examples

---

## 🧪 **TESTING CHECKLIST**

For each module tested:
- [ ] Happy path scenarios
- [ ] Error conditions
- [ ] Edge cases (null, undefined, empty)
- [ ] Boundary conditions
- [ ] Async/Promise handling
- [ ] Resource cleanup
- [ ] Memory leaks prevented
- [ ] Type safety maintained

---

## 📊 **PROGRESS TRACKING**

| Module | Tests | Coverage | Status |
|--------|-------|----------|--------|
| Logger | 0/50 | 0% | ⏳ Pending |
| EventManager | 0/60 | 0% | ⏳ Pending |
| ServiceProvider | 0/40 | 0% | ⏳ Pending |
| Monitoring | 0/50 | 0% | ⏳ Pending |
| ErrorRecovery | 0/55 | 0% | ⏳ Pending |
| **TOTAL** | **0/255** | **0%** | **⏳** |

---

## 🔗 **NEXT STEPS**

After completing 18.7.1:
1. Run full test suite: `npm test`
2. Generate coverage report: `npm test -- --coverage`
3. Verify 26-31% coverage achieved
4. Review any failing tests
5. Commit with message: `test: Add core infrastructure tests (18.7.1)`
6. Proceed to **18.7.5** (Integration Tests) or **18.7.2** (Data Layer)

---

**Remember:** Core infrastructure is critical. Take time to write comprehensive, maintainable tests. These tests will catch bugs before they reach production and give confidence for future refactoring.

**Quality over speed.** 🎯
