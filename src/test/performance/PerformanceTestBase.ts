/**
 * PerformanceTestBase - Abstract base class for performance testing
 *
 * @package     @imajin/cli
 * @subpackage  test/performance
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-08-02
 *
 * Integration Points:
 * - ServiceTestBase for service setup
 * - PerformanceMetricsCollector for data collection
 * - LoadTestRunner for stress testing
 */

import { ServiceTestBase } from '../framework/ServiceTestBase.js';
import { BaseService } from '../../services/BaseService.js';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector.js';
import { LoadTestRunner } from './LoadTestRunner.js';
import { 
    PerformanceTestResult, 
    LoadTestConfig, 
    PerformanceBenchmark,
    MemoryUsage,
    TestMetrics
} from './types.js';

/**
 * Abstract base class for performance testing services
 * Extends ServiceTestBase with performance-specific capabilities
 */
export abstract class PerformanceTestBase<T extends BaseService> extends ServiceTestBase<T> {
    protected metricsCollector!: PerformanceMetricsCollector;
    protected loadTestRunner!: LoadTestRunner;
    protected performanceResults: PerformanceTestResult[] = [];
    protected baselines: Map<string, PerformanceBenchmark> = new Map();

    /**
     * Setup performance testing environment
     */
    async setupPerformanceTest(): Promise<void> {
        await this.setupTest();
        
        this.metricsCollector = new PerformanceMetricsCollector();
        this.loadTestRunner = new LoadTestRunner(this.service, this.metricsCollector);
        
        // Initialize performance monitoring
        await this.metricsCollector.initialize();
        
        // Load performance baselines if available
        await this.loadPerformanceBaselines();
    }

    /**
     * Cleanup performance testing environment
     */
    async teardownPerformanceTest(): Promise<void> {
        // Stop metrics collection
        if (this.metricsCollector) {
            await this.metricsCollector.stop();
        }

        // Generate performance report
        if (this.performanceResults.length > 0) {
            await this.generatePerformanceReport();
        }

        await this.teardownTest();
    }

    /**
     * Execute a performance test with metrics collection
     */
    public async executePerformanceTest<R>(
        testName: string,
        operation: () => Promise<R>,
        config?: {
            iterations?: number;
            warmupIterations?: number;
            timeout?: number;
            collectMemory?: boolean;
        }
    ): Promise<PerformanceTestResult> {
        const testConfig = {
            iterations: 10,
            warmupIterations: 3,
            timeout: 30000,
            collectMemory: true,
            ...config
        };

        console.log(`Starting performance test: ${testName}`);
        
        // Start metrics collection
        await this.metricsCollector.startCollection(testName);

        const results: TestMetrics[] = [];
        const memoryUsage: MemoryUsage[] = [];

        try {
            // Warmup iterations
            for (let i = 0; i < testConfig.warmupIterations; i++) {
                await operation();
            }

            // Actual test iterations
            for (let i = 0; i < testConfig.iterations; i++) {
                const startTime = process.hrtime.bigint();
                const startMemory = testConfig.collectMemory ? process.memoryUsage() : undefined;

                await operation();

                const endTime = process.hrtime.bigint();
                const endMemory = testConfig.collectMemory ? process.memoryUsage() : undefined;

                const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

                results.push({
                    iteration: i + 1,
                    duration,
                    timestamp: new Date()
                });

                if (startMemory && endMemory && testConfig.collectMemory) {
                    memoryUsage.push({
                        iteration: i + 1,
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                        external: endMemory.external - startMemory.external,
                        rss: endMemory.rss - startMemory.rss,
                        timestamp: new Date()
                    });
                }
            }

            // Stop metrics collection and get system metrics
            const systemMetrics = await this.metricsCollector.stopCollection();

            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(),
                config: testConfig,
                results,
                memoryUsage,
                systemMetrics,
                statistics: this.calculateStatistics(results),
                baseline: this.baselines.get(testName) || undefined
            };

            this.performanceResults.push(performanceResult);
            
            // Compare against baseline if available
            if (performanceResult.baseline) {
                this.compareAgainstBaseline(performanceResult);
            }

            console.log(`Completed performance test: ${testName}`);
            this.logPerformanceSummary(performanceResult);

            return performanceResult;

        } catch (error) {
            await this.metricsCollector.stopCollection();
            throw new Error(`Performance test failed: ${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute load test with concurrent operations
     */
    public async executeLoadTest(
        testName: string,
        operation: () => Promise<any>,
        config: LoadTestConfig
    ): Promise<PerformanceTestResult> {
        console.log(`Starting load test: ${testName}`);
        
        const result = await this.loadTestRunner.runLoadTest(testName, operation, config);
        this.performanceResults.push(result);
        
        console.log(`Completed load test: ${testName}`);
        this.logPerformanceSummary(result);
        
        return result;
    }

    /**
     * Execute stress test to find breaking point
     */
    public async executeStressTest(
        testName: string,
        operation: () => Promise<any>,
        config: {
            startConcurrency: number;
            maxConcurrency: number;
            stepSize: number;
            durationPerStep: number;
            errorThreshold: number;
        }
    ): Promise<PerformanceTestResult> {
        console.log(`Starting stress test: ${testName}`);
        
        const result = await this.loadTestRunner.runStressTest(testName, operation, config);
        this.performanceResults.push(result);
        
        console.log(`Completed stress test: ${testName}`);
        this.logPerformanceSummary(result);
        
        return result;
    }

    /**
     * Set performance baseline for comparison
     */
    protected setBaseline(testName: string, baseline: PerformanceBenchmark): void {
        this.baselines.set(testName, baseline);
    }

    /**
     * Load performance baselines from storage
     */
    protected async loadPerformanceBaselines(): Promise<void> {
        // Implementation would load from file system or database
        // For now, we'll use hardcoded baselines for demonstration
        this.setBaseline('basic-operation', {
            averageResponseTime: 100,
            maxResponseTime: 200,
            minResponseTime: 50,
            throughput: 100,
            errorRate: 0.01,
            memoryUsage: 50 * 1024 * 1024 // 50MB
        });
    }

    /**
     * Calculate statistics from test results
     */
    private calculateStatistics(results: TestMetrics[]) {
        const durations = results.map(r => r.duration);
        const sorted = durations.sort((a, b) => a - b);
        
        return {
            count: results.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            median: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : undefined,
            min: Math.min(...durations),
            max: Math.max(...durations),
            p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] || 0 : undefined,
            p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] || 0 : undefined,
            standardDeviation: this.calculateStandardDeviation(durations)
        };
    }

    /**
     * Calculate standard deviation
     */
    private calculateStandardDeviation(values: number[]): number {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => {
            const diff = value - avg;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    /**
     * Compare results against baseline
     */
    private compareAgainstBaseline(result: PerformanceTestResult): void {
        if (!result.baseline) {
return;
}

        const baseline = result.baseline;
        const stats = result.statistics;

        const regressions: string[] = [];

        if (stats.average > baseline.averageResponseTime * 1.1) {
            regressions.push(`Average response time regression: ${stats.average.toFixed(2)}ms vs baseline ${baseline.averageResponseTime}ms`);
        }

        if (stats.max > baseline.maxResponseTime * 1.2) {
            regressions.push(`Max response time regression: ${stats.max.toFixed(2)}ms vs baseline ${baseline.maxResponseTime}ms`);
        }

        if (result.systemMetrics?.errorRate && result.systemMetrics.errorRate > baseline.errorRate * 2) {
            regressions.push(`Error rate regression: ${result.systemMetrics.errorRate.toFixed(4)} vs baseline ${baseline.errorRate}`);
        }

        if (regressions.length > 0) {
            console.warn(`Performance regressions detected for ${result.testName}:`);
            for (const regression of regressions) {
                console.warn(`  - ${regression}`);
            }

            // Optionally fail the test
            // throw new Error(`Performance regression detected: ${regressions.join(', ')}`);
        }
    }

    /**
     * Log performance summary
     */
    private logPerformanceSummary(result: PerformanceTestResult): void {
        const stats = result.statistics;
        console.log(`\nPerformance Summary for ${result.testName}:`);
        console.log(`  Average: ${stats.average.toFixed(2)}ms`);
        console.log(`  Median: ${(stats.median ?? 0).toFixed(2)}ms`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  P95: ${(stats.p95 ?? 0).toFixed(2)}ms`);
        console.log(`  P99: ${(stats.p99 ?? 0).toFixed(2)}ms`);
        console.log(`  Standard Deviation: ${stats.standardDeviation.toFixed(2)}ms`);
        
        if (result.systemMetrics) {
            console.log(`  Throughput: ${result.systemMetrics.throughput.toFixed(2)} ops/sec`);
            console.log(`  Error Rate: ${(result.systemMetrics.errorRate * 100).toFixed(2)}%`);
        }
    }

    /**
     * Generate performance report
     */
    private async generatePerformanceReport(): Promise<void> {
        const report = {
            timestamp: new Date().toISOString(),
            service: this.service.getName(),
            version: this.service.getVersion(),
            results: this.performanceResults,
            summary: this.generateSummary()
        };

        // In a real implementation, this would write to a file or send to a monitoring system
        console.log('\n=== Performance Test Report ===');
        console.log(JSON.stringify(report, null, 2));
    }

    /**
     * Generate summary of all performance tests
     */
    private generateSummary() {
        return {
            totalTests: this.performanceResults.length,
            averageResponseTime: this.performanceResults.reduce((sum, result) => 
                sum + result.statistics.average, 0) / this.performanceResults.length,
            totalRegressions: this.performanceResults.filter(result => 
                result.baseline && result.statistics.average > result.baseline.averageResponseTime * 1.1).length
        };
    }

    /**
     * Assert performance meets expectations
     */
    public assertPerformance(
        result: PerformanceTestResult,
        expectations: {
            maxAverageResponseTime?: number;
            maxP95ResponseTime?: number;
            minThroughput?: number;
            maxErrorRate?: number;
        }
    ): void {
        const stats = result.statistics;
        
        if (expectations.maxAverageResponseTime && stats.average > expectations.maxAverageResponseTime) {
            throw new Error(`Average response time ${stats.average.toFixed(2)}ms exceeds expectation ${expectations.maxAverageResponseTime}ms`);
        }
        
        if (expectations.maxP95ResponseTime && (stats.p95 ?? 0) > expectations.maxP95ResponseTime) {
            throw new Error(`P95 response time ${(stats.p95 ?? 0).toFixed(2)}ms exceeds expectation ${expectations.maxP95ResponseTime}ms`);
        }
        
        if (expectations.minThroughput && result.systemMetrics?.throughput && result.systemMetrics.throughput < expectations.minThroughput) {
            throw new Error(`Throughput ${result.systemMetrics.throughput.toFixed(2)} ops/sec is below expectation ${expectations.minThroughput} ops/sec`);
        }
        
        if (expectations.maxErrorRate && result.systemMetrics?.errorRate && result.systemMetrics.errorRate > expectations.maxErrorRate) {
            throw new Error(`Error rate ${(result.systemMetrics.errorRate * 100).toFixed(2)}% exceeds expectation ${(expectations.maxErrorRate * 100).toFixed(2)}%`);
        }
    }
}