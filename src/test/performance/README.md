# Performance Testing System

## Overview

The Performance Testing System provides comprehensive performance and load testing capabilities for the imajin-cli project. It integrates seamlessly with the existing Jest testing infrastructure and provides detailed performance analysis, benchmarking, and reporting.

## Features

### Core Capabilities
- **Performance Baseline Testing** - Measure response times, throughput, and resource usage
- **Load Testing** - Test service behavior under concurrent load
- **Stress Testing** - Find breaking points and test resilience
- **Memory Monitoring** - Track memory usage patterns and detect leaks
- **Benchmark Comparison** - Compare against historical baselines
- **Regression Detection** - Automatically detect performance degradation
- **Real-time Monitoring** - Live performance alerts and monitoring
- **Comprehensive Reporting** - HTML and JSON reports with visualizations

### Integration Features
- **Jest Integration** - Works seamlessly with existing test suites
- **Service Test Framework** - Extends ServiceTestBase for service-specific testing
- **CI/CD Ready** - Designed for automated testing pipelines
- **Configurable Thresholds** - Customizable performance expectations
- **Multi-format Reports** - HTML, JSON, and console output

## Quick Start

### Basic Performance Test

```typescript
import { PerformanceTestBase } from '../performance/PerformanceTestBase';
import { MyService } from '../../services/MyService';

class MyServicePerformanceTest extends PerformanceTestBase<MyService> {
    createService(): MyService {
        return new MyService(this.container, this.getMockConfig());
    }

    getMockConfig() {
        return {
            name: 'my-service-test',
            version: '1.0.0'
            // ... other config
        };
    }
}

describe('MyService Performance Tests', () => {
    let performanceTest: MyServicePerformanceTest;

    beforeEach(async () => {
        performanceTest = new MyServicePerformanceTest();
        await performanceTest.setupPerformanceTest();
    });

    afterEach(async () => {
        await performanceTest.teardownPerformanceTest();
    });

    test('should meet performance requirements for basic operation', async () => {
        const result = await performanceTest.executePerformanceTest(
            'basic-operation',
            async () => {
                return await performanceTest.getService().performBasicOperation();
            },
            {
                iterations: 20,
                warmupIterations: 5,
                timeout: 10000
            }
        );

        // Assert performance meets expectations
        performanceTest.assertPerformance(result, {
            maxAverageResponseTime: 500,
            maxP95ResponseTime: 1000,
            minThroughput: 50,
            maxErrorRate: 0.02
        });
    });
});
```

### Load Testing

```typescript
test('should handle concurrent load', async () => {
    const loadTestConfig = {
        concurrentUsers: 10,
        duration: 15000, // 15 seconds
        rampUpTime: 2000,
        targetThroughput: 100,
        maxErrors: 5
    };

    const result = await performanceTest.executeLoadTest(
        'concurrent-operations',
        async () => {
            return await performanceTest.getService().performOperation();
        },
        loadTestConfig
    );

    expect(result.systemMetrics?.throughput).toBeGreaterThan(80);
    expect(result.systemMetrics?.errorRate).toBeLessThan(0.05);
});
```

### Stress Testing

```typescript
test('should find breaking point', async () => {
    const stressTestConfig = {
        startConcurrency: 5,
        maxConcurrency: 50,
        stepSize: 5,
        durationPerStep: 8000,
        errorThreshold: 0.1,
        responseTimeThreshold: 2000
    };

    const result = await performanceTest.executeStressTest(
        'breaking-point-test',
        async () => {
            return await performanceTest.getService().performOperation();
        },
        stressTestConfig
    );

    console.log(`Breaking point: ${result.systemMetrics?.concurrentUsers} concurrent users`);
});
```

## Advanced Usage

### Jest Suite Integration

```typescript
import { createPerformanceTestSuite } from '../performance';

const { integration, beforeAll, afterAll } = createPerformanceTestSuite({
    serviceName: 'my-service',
    enableStressTesting: true,
    enableReporting: true,
    outputDirectory: './reports/performance',
    thresholds: {
        responseTime: { warning: 500, critical: 2000 },
        throughput: { minimum: 20, warning: 100 },
        errorRate: { warning: 0.02, critical: 0.1 }
    }
});

describe('My Service Performance Suite', () => {
    beforeAll(beforeAll);
    afterAll(afterAll);

    // Your performance tests here
});
```

### Custom Performance Monitoring

```typescript
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

const monitor = new PerformanceMonitor({
    enableRealTimeAlerts: true,
    enableRegessionDetection: true,
    monitoringInterval: 1000
});

// Listen for alerts
monitor.on('alert:created', (alert) => {
    console.warn(`Performance Alert: ${alert.message}`);
});

await monitor.startMonitoring();
// ... run tests
await monitor.stopMonitoring();
```

### Stress Testing with Chaos Engineering

```typescript
import { StressTestRunner } from '../performance/StressTestRunner';

const stressRunner = new StressTestRunner(service, metricsCollector);

const chaosConfig = {
    errorInjectionRate: 0.1, // 10% error injection
    networkDelayRange: [100, 500], // 100-500ms delays
    timeoutRate: 0.05, // 5% timeout rate
    memoryPressure: true,
    cpuPressure: false
};

const result = await stressRunner.runChaosTest(
    'chaos-resilience-test',
    operation,
    chaosConfig,
    30000 // 30 seconds
);
```

## Performance Metrics

### Collected Metrics

#### Response Time Metrics
- **Average Response Time** - Mean response time across all operations
- **Median Response Time** - 50th percentile response time
- **P95 Response Time** - 95th percentile response time
- **P99 Response Time** - 99th percentile response time
- **Min/Max Response Time** - Fastest and slowest operations

#### Throughput Metrics
- **Operations per Second** - Rate of successful operations
- **Concurrent Users** - Number of concurrent operations
- **Total Operations** - Total number of operations executed

#### Error Metrics
- **Error Rate** - Percentage of failed operations
- **Error Count** - Total number of errors
- **Error Types** - Classification of error types

#### Resource Metrics
- **Memory Usage** - Heap usage patterns and peak memory
- **CPU Usage** - Processing load during tests
- **Memory Growth** - Detection of potential memory leaks

### System Metrics
- **Network Latency** - Simulated network conditions
- **Resource Exhaustion** - Memory, CPU, and connection limits
- **Rate Limiting** - Detection of service rate limits

## Configuration

### Performance Thresholds

```typescript
const thresholds = {
    responseTime: {
        warning: 1000,   // 1 second
        critical: 5000   // 5 seconds
    },
    throughput: {
        minimum: 10,     // 10 ops/sec minimum
        warning: 50      // 50 ops/sec warning
    },
    errorRate: {
        warning: 0.05,   // 5% warning
        critical: 0.1    // 10% critical
    },
    memoryUsage: {
        warning: 100 * 1024 * 1024,  // 100MB
        critical: 500 * 1024 * 1024  // 500MB
    },
    cpuUsage: {
        warning: 70,     // 70%
        critical: 90     // 90%
    }
};
```

### Test Configuration

```typescript
const testConfig = {
    iterations: 20,           // Number of test iterations
    warmupIterations: 5,      // Warmup runs before measurement
    timeout: 30000,           // Timeout per operation (ms)
    collectMemory: true,      // Collect memory usage data
    collectCustomMetrics: true // Collect service-specific metrics
};
```

## Reporting

### HTML Reports
Comprehensive HTML reports include:
- Executive summary with key metrics
- Detailed test results table
- Performance regression analysis
- Memory usage charts
- Recommendations for optimization
- Raw data for further analysis

### JSON Reports
Machine-readable JSON format for:
- CI/CD integration
- Historical trend analysis
- Custom dashboard integration
- API consumption

### Report Generation

```typescript
import { PerformanceReportGenerator } from '../performance/PerformanceReportGenerator';

const reportConfig = {
    outputDirectory: './performance-reports',
    includeCharts: true,
    includeRawData: true,
    format: 'both', // 'html', 'json', or 'both'
    title: 'My Service Performance Report'
};

const generator = new PerformanceReportGenerator(benchmarks, reportConfig);
const report = generator.generateReport(results);
```

## Best Practices

### Test Design
1. **Realistic Scenarios** - Use realistic data and operations
2. **Proper Warmup** - Allow services to reach steady state
3. **Appropriate Iterations** - Balance accuracy with test duration
4. **Error Handling** - Test both success and failure scenarios
5. **Resource Cleanup** - Ensure proper test isolation

### Performance Baselines
1. **Establish Baselines** - Set performance baselines for critical operations
2. **Regular Updates** - Update baselines when performance improves
3. **Environment Consistency** - Use consistent test environments
4. **Historical Tracking** - Track performance trends over time

### Load Testing
1. **Gradual Ramp-up** - Gradually increase load to identify breaking points
2. **Realistic Concurrency** - Use realistic concurrent user patterns
3. **Error Thresholds** - Set appropriate error rate thresholds
4. **Resource Monitoring** - Monitor system resources during tests

### CI/CD Integration
1. **Automated Execution** - Run performance tests in CI/CD pipelines
2. **Threshold Enforcement** - Fail builds on performance regressions
3. **Trend Analysis** - Track performance trends across builds
4. **Alert Integration** - Integrate with monitoring and alerting systems

## Service-Specific Tests

The framework includes comprehensive performance tests for:

### StripeService
- Customer creation and retrieval performance
- Payment intent processing under load
- Subscription management scalability
- Rate limiting resilience
- Memory usage optimization

### ContentfulService
- Content retrieval and query performance
- Content management operations under load
- Asset processing and delivery
- Large dataset handling
- API rate limit management

### CloudinaryService
- Image upload performance with various file sizes
- Transformation URL generation speed
- Resource management operations
- Concurrent upload handling
- Memory management for large files

## Troubleshooting

### Common Issues

#### High Memory Usage
- Check for memory leaks in test operations
- Ensure proper cleanup of resources
- Consider reducing test iteration counts
- Monitor garbage collection patterns

#### Inconsistent Results
- Ensure proper warmup iterations
- Check for external system dependencies
- Verify test environment consistency
- Consider network latency variations

#### Timeout Errors
- Increase operation timeout values
- Check for blocking operations
- Verify service health before testing
- Consider reducing concurrent load

#### Rate Limiting
- Implement proper delay between operations
- Use realistic rate limits in tests
- Test rate limiting resilience explicitly
- Monitor service-specific rate limits

### Debug Mode

```typescript
// Enable detailed logging
process.env.DEBUG_PERFORMANCE = 'true';

// Increase Jest timeout for debugging
jest.setTimeout(300000); // 5 minutes

// Enable memory debugging
process.env.NODE_OPTIONS = '--expose-gc';
```

## API Reference

### PerformanceTestBase
Abstract base class for service performance testing.

**Methods:**
- `setupPerformanceTest()` - Initialize performance testing
- `teardownPerformanceTest()` - Cleanup and generate reports
- `executePerformanceTest(name, operation, config)` - Run performance test
- `executeLoadTest(name, operation, config)` - Run load test
- `executeStressTest(name, operation, config)` - Run stress test
- `assertPerformance(result, expectations)` - Assert performance criteria

### LoadTestRunner
Executes load tests with concurrent operations.

**Methods:**
- `runLoadTest(name, operation, config)` - Execute load test
- `runStressTest(name, operation, config)` - Execute stress test
- `stopAllTests()` - Stop all active tests

### PerformanceMonitor
Real-time performance monitoring and alerting.

**Methods:**
- `startMonitoring()` - Start performance monitoring
- `stopMonitoring()` - Stop monitoring and get results
- `recordTestResult(result)` - Record a test result
- `getActiveAlerts()` - Get current performance alerts
- `getPerformanceSummary()` - Get overall performance summary

### PerformanceBenchmarks
Manages performance baselines and regression detection.

**Methods:**
- `setBenchmark(name, benchmark)` - Set performance baseline
- `compareAgainstBenchmark(result)` - Compare result to baseline
- `updateBenchmarkIfBetter(result)` - Update baseline if improved
- `getAllBenchmarks()` - Get all benchmarks

## Contributing

### Adding New Performance Tests
1. Extend `PerformanceTestBase` for your service
2. Implement required abstract methods
3. Add service-specific performance scenarios
4. Include appropriate assertions and thresholds
5. Document test scenarios and expected outcomes

### Extending Metrics Collection
1. Add new metrics to the `types.ts` file
2. Update `PerformanceMetricsCollector` to collect new metrics
3. Modify reporting to include new metrics
4. Update documentation with new metric descriptions

### Improving Reports
1. Enhance HTML template with new visualizations
2. Add new analysis functions to report generator
3. Include additional recommendations logic
4. Test report generation with various data scenarios

## License

This performance testing system is part of the imajin-cli project and is licensed under the .fair LICENSING AGREEMENT.