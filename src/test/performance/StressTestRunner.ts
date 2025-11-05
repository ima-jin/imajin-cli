/**
 * StressTestRunner - Advanced stress testing for service resilience
 *
 * @package     @imajin/cli
 * @subpackage  test/performance
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-31
 * @updated      2025-08-02
 *
 * Integration Points:
 * - Rate limiting resilience testing
 * - Error injection and chaos testing
 * - Resource exhaustion scenarios
 * - Service degradation simulation
 */

import { BaseService } from '../../services/BaseService.js';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector.js';
import { 
    StressTestConfig, 
    PerformanceTestResult, 
    TestMetrics, 
    SystemMetrics,
    MemoryUsage
} from './types.js';

export interface ChaosTestConfig {
    errorInjectionRate: number; // 0.0 to 1.0
    networkDelayRange: [number, number]; // [min, max] in ms
    timeoutRate: number; // 0.0 to 1.0
    memoryPressure: boolean;
    cpuPressure: boolean;
    diskPressure: boolean;
}

export interface RateLimitTestConfig {
    initialRate: number; // requests per second
    rateIncrementStep: number;
    maxRate: number;
    testDurationPerRate: number; // milliseconds
    rateLimitThreshold: number; // expected rate limit
}

export interface ResourceExhaustionConfig {
    maxMemoryMB: number;
    maxConcurrentConnections: number;
    maxFileDescriptors: number;
    testDurationMs: number;
}

/**
 * Advanced stress testing capabilities
 */
export class StressTestRunner {
    private service: BaseService;
    private metricsCollector: PerformanceMetricsCollector;
    private isRunning: boolean = false;
    private activeTests: Set<string> = new Set();

    constructor(service: BaseService, metricsCollector: PerformanceMetricsCollector) {
        this.service = service;
        this.metricsCollector = metricsCollector;
    }

    /**
     * Run chaos engineering tests
     */
    async runChaosTest(
        testName: string,
        operation: () => Promise<any>,
        config: ChaosTestConfig,
        duration: number = 30000
    ): Promise<PerformanceTestResult> {
        console.log(`Starting chaos test: ${testName}`);
        this.isRunning = true;
        this.activeTests.add(testName);

        try {
            await this.metricsCollector.startCollection(testName);
            
            const startTime = Date.now();
            const results: TestMetrics[] = [];
            const memoryUsage: MemoryUsage[] = [];
            const errors: Error[] = [];
            let operationCount = 0;

            // Apply initial chaos conditions if configured
            if (config.memoryPressure) {
                await this.simulateMemoryPressure();
            }
            if (config.cpuPressure) {
                await this.simulateCpuPressure();
            }

            while (Date.now() - startTime < duration && this.isRunning) {
                const operationStartTime = process.hrtime.bigint();
                const startMemory = process.memoryUsage();
                let error: Error | undefined;

                try {
                    // Inject chaos conditions
                    const chaosResult = await this.applyChaosConditions(operation, config);
                    operationCount++;
                } catch (err) {
                    error = err instanceof Error ? err : new Error(String(err));
                    errors.push(error);
                }

                const endTime = process.hrtime.bigint();
                const endMemory = process.memoryUsage();
                const duration = Number(endTime - operationStartTime) / 1_000_000;

                results.push({
                    iteration: operationCount,
                    duration,
                    timestamp: new Date(),
                    error
                });

                memoryUsage.push({
                    iteration: operationCount,
                    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                    heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                    external: endMemory.external - startMemory.external,
                    rss: endMemory.rss - startMemory.rss,
                    timestamp: new Date()
                });

                // Small delay to prevent overwhelming the system
                await this.delay(100);
            }

            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const systemMetrics = await this.metricsCollector.stopCollection();

            const finalSystemMetrics: SystemMetrics = {
                ...systemMetrics,
                throughput: (operationCount / totalDuration) * 1000,
                errorRate: errors.length / Math.max(operationCount + errors.length, 1),
                concurrentUsers: 1,
                totalOperations: operationCount,
                totalErrors: errors.length,
                testDuration: totalDuration
            };

            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(startTime),
                config: { collectMemory: true },
                results,
                memoryUsage,
                systemMetrics: finalSystemMetrics,
                statistics: this.calculateStatistics(results),
                baseline: undefined,
                notes: `Chaos test with ${(config.errorInjectionRate * 100).toFixed(1)}% error injection`
            };

            console.log(`Chaos test completed: ${testName}`);
            console.log(`  Operations: ${operationCount}, Errors: ${errors.length}`);
            console.log(`  Error rate: ${(finalSystemMetrics.errorRate * 100).toFixed(2)}%`);

            return performanceResult;

        } finally {
            this.isRunning = false;
            this.activeTests.delete(testName);
        }
    }

    /**
     * Test rate limiting resilience
     */
    async runRateLimitTest(
        testName: string,
        operation: () => Promise<any>,
        config: RateLimitTestConfig
    ): Promise<PerformanceTestResult> {
        console.log(`Starting rate limit test: ${testName}`);
        this.isRunning = true;
        this.activeTests.add(testName);

        try {
            await this.metricsCollector.startCollection(testName);
            
            const startTime = Date.now();
            const allResults: TestMetrics[] = [];
            const allMemoryUsage: MemoryUsage[] = [];
            let totalOperations = 0;
            let totalErrors = 0;
            let rateLimitDetected = false;
            let detectedRateLimit = 0;

            for (let currentRate = config.initialRate; 
                 currentRate <= config.maxRate && this.isRunning; 
                 currentRate += config.rateIncrementStep) {

                console.log(`Testing at ${currentRate} requests/second...`);
                
                const stepResults = await this.runRateStep(
                    operation,
                    currentRate,
                    config.testDurationPerRate
                );

                allResults.push(...stepResults.results);
                allMemoryUsage.push(...stepResults.memoryUsage);
                totalOperations += stepResults.operations;
                totalErrors += stepResults.errors;

                // Calculate error rate for this step
                const stepErrorRate = stepResults.errors / Math.max(stepResults.operations, 1);
                
                // Detect rate limiting (high error rate or significant response time increase)
                const avgResponseTime = stepResults.results.length > 0
                    ? stepResults.results.reduce((sum, r) => sum + r.duration, 0) / stepResults.results.length
                    : 0;

                if (stepErrorRate > 0.3 || avgResponseTime > 5000) { // 30% error rate or 5s response time
                    rateLimitDetected = true;
                    detectedRateLimit = currentRate;
                    console.log(`Rate limiting detected at ${currentRate} requests/second`);
                    console.log(`  Error rate: ${(stepErrorRate * 100).toFixed(2)}%`);
                    console.log(`  Avg response time: ${avgResponseTime.toFixed(0)}ms`);
                    break;
                }

                // Short pause between rate steps
                await this.delay(2000);
            }

            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const systemMetrics = await this.metricsCollector.stopCollection();

            const finalSystemMetrics: SystemMetrics = {
                ...systemMetrics,
                throughput: (totalOperations / totalDuration) * 1000,
                errorRate: totalErrors / Math.max(totalOperations, 1),
                concurrentUsers: 1,
                totalOperations,
                totalErrors,
                testDuration: totalDuration
            };

            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(startTime),
                config: { collectMemory: true },
                results: allResults,
                memoryUsage: allMemoryUsage,
                systemMetrics: finalSystemMetrics,
                statistics: this.calculateStatistics(allResults),
                baseline: undefined,
                notes: rateLimitDetected 
                    ? `Rate limit detected at ${detectedRateLimit} req/sec`
                    : `No rate limit detected up to ${config.maxRate} req/sec`
            };

            console.log(`Rate limit test completed: ${testName}`);
            console.log(`  Rate limit detected: ${rateLimitDetected}`);
            console.log(`  Max tested rate: ${detectedRateLimit || config.maxRate} req/sec`);

            return performanceResult;

        } finally {
            this.isRunning = false;
            this.activeTests.delete(testName);
        }
    }

    /**
     * Test resource exhaustion scenarios
     */
    async runResourceExhaustionTest(
        testName: string,
        operation: () => Promise<any>,
        config: ResourceExhaustionConfig
    ): Promise<PerformanceTestResult> {
        console.log(`Starting resource exhaustion test: ${testName}`);
        this.isRunning = true;
        this.activeTests.add(testName);

        try {
            await this.metricsCollector.startCollection(testName);
            
            const startTime = Date.now();
            const results: TestMetrics[] = [];
            const memoryUsage: MemoryUsage[] = [];
            const errors: Error[] = [];
            const memoryHogs: Buffer[] = []; // To simulate memory pressure
            let operationCount = 0;

            while (Date.now() - startTime < config.testDurationMs && this.isRunning) {
                const operationStartTime = process.hrtime.bigint();
                const startMemory = process.memoryUsage();
                let error: Error | undefined;

                try {
                    // Gradually increase memory pressure
                    const currentMemoryMB = process.memoryUsage().heapUsed / (1024 * 1024);
                    if (currentMemoryMB < config.maxMemoryMB && memoryHogs.length < 100) {
                        // Allocate 1MB chunks
                        memoryHogs.push(Buffer.alloc(1024 * 1024, 'performance-test'));
                    }

                    await operation();
                    operationCount++;
                } catch (err) {
                    error = err instanceof Error ? err : new Error(String(err));
                    errors.push(error);
                }

                const endTime = process.hrtime.bigint();
                const endMemory = process.memoryUsage();
                const duration = Number(endTime - operationStartTime) / 1_000_000;

                results.push({
                    iteration: operationCount,
                    duration,
                    timestamp: new Date(),
                    error,
                    customMetrics: {
                        memoryUsageMB: endMemory.heapUsed / (1024 * 1024),
                        allocatedBuffers: memoryHogs.length
                    }
                });

                memoryUsage.push({
                    iteration: operationCount,
                    heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                    heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                    external: endMemory.external - startMemory.external,
                    rss: endMemory.rss - startMemory.rss,
                    timestamp: new Date()
                });

                await this.delay(50);
            }

            // Clean up memory hogs to prevent actual memory issues
            memoryHogs.length = 0;
            if (global.gc) {
                global.gc();
            }

            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const systemMetrics = await this.metricsCollector.stopCollection();

            const finalSystemMetrics: SystemMetrics = {
                ...systemMetrics,
                throughput: (operationCount / totalDuration) * 1000,
                errorRate: errors.length / Math.max(operationCount + errors.length, 1),
                concurrentUsers: 1,
                totalOperations: operationCount,
                totalErrors: errors.length,
                testDuration: totalDuration
            };

            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(startTime),
                config: { collectMemory: true },
                results,
                memoryUsage,
                systemMetrics: finalSystemMetrics,
                statistics: this.calculateStatistics(results),
                baseline: undefined,
                notes: `Resource exhaustion test targeting ${config.maxMemoryMB}MB memory usage`
            };

            console.log(`Resource exhaustion test completed: ${testName}`);
            console.log(`  Peak memory: ${Math.max(...results.map(r => r.customMetrics?.memoryUsageMB || 0)).toFixed(1)}MB`);
            console.log(`  Operations under pressure: ${operationCount}`);

            return performanceResult;

        } finally {
            this.isRunning = false;
            this.activeTests.delete(testName);
        }
    }

    /**
     * Apply chaos conditions to an operation
     */
    private async applyChaosConditions(
        operation: () => Promise<any>,
        config: ChaosTestConfig
    ): Promise<any> {
        // Inject network delay
        if (config.networkDelayRange[1] > 0) {
            const delay = config.networkDelayRange[0] + 
                Math.random() * (config.networkDelayRange[1] - config.networkDelayRange[0]);
            await this.delay(delay);
        }

        // Inject timeouts
        if (Math.random() < config.timeoutRate) {
            throw new Error('Simulated timeout error');
        }

        // Inject random errors
        if (Math.random() < config.errorInjectionRate) {
            const errorTypes = [
                'Network connection failed',
                'Service temporarily unavailable',
                'Rate limit exceeded',
                'Authentication failed',
                'Internal server error'
            ];
            const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            throw new Error(`Chaos injection: ${randomError}`);
        }

        // Execute the actual operation
        return await operation();
    }

    /**
     * Run a single rate testing step
     */
    private async runRateStep(
        operation: () => Promise<any>,
        targetRate: number,
        duration: number
    ): Promise<{
        results: TestMetrics[];
        memoryUsage: MemoryUsage[];
        operations: number;
        errors: number;
    }> {
        const results: TestMetrics[] = [];
        const memoryUsage: MemoryUsage[] = [];
        const errors: Error[] = [];
        const startTime = Date.now();
        const intervalMs = 1000 / targetRate; // Interval between requests
        let operationCount = 0;

        while (Date.now() - startTime < duration && this.isRunning) {
            const operationStartTime = process.hrtime.bigint();
            const startMemory = process.memoryUsage();
            let error: Error | undefined;

            try {
                await operation();
                operationCount++;
            } catch (err) {
                error = err instanceof Error ? err : new Error(String(err));
                errors.push(error);
            }

            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage();
            const operationDuration = Number(endTime - operationStartTime) / 1_000_000;

            results.push({
                iteration: operationCount,
                duration: operationDuration,
                timestamp: new Date(),
                error
            });

            memoryUsage.push({
                iteration: operationCount,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                external: endMemory.external - startMemory.external,
                rss: endMemory.rss - startMemory.rss,
                timestamp: new Date()
            });

            // Wait for next request based on target rate
            await this.delay(intervalMs);
        }

        return {
            results,
            memoryUsage,
            operations: operationCount,
            errors: errors.length
        };
    }

    /**
     * Simulate memory pressure
     */
    private async simulateMemoryPressure(): Promise<void> {
        // This is a simplified simulation
        // In a real scenario, you might want more sophisticated memory pressure
        console.log('Applying memory pressure...');
    }

    /**
     * Simulate CPU pressure
     */
    private async simulateCpuPressure(): Promise<void> {
        // This is a simplified simulation
        // In a real scenario, you might spawn CPU-intensive tasks
        console.log('Applying CPU pressure...');
    }

    /**
     * Calculate statistics from test results
     */
    private calculateStatistics(results: TestMetrics[]) {
        if (results.length === 0) {
            return {
                count: 0,
                average: 0,
                median: undefined,
                min: 0,
                max: 0,
                p95: undefined,
                p99: undefined,
                standardDeviation: 0
            };
        }

        const durations = results.map(r => r.duration);
        const sorted = durations.sort((a, b) => a - b);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;

        return {
            count: results.length,
            average: avg,
            median: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : undefined,
            min: Math.min(...durations),
            max: Math.max(...durations),
            p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] || 0 : undefined,
            p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] || 0 : undefined,
            standardDeviation: Math.sqrt(
                durations.reduce((sum, duration) => sum + Math.pow(duration - avg, 2), 0) / durations.length
            )
        };
    }

    /**
     * Stop all running stress tests
     */
    stopAll(): void {
        console.log('Stopping all stress tests...');
        this.isRunning = false;
    }

    /**
     * Get active test names
     */
    getActiveTests(): string[] {
        return Array.from(this.activeTests);
    }

    /**
     * Check if stress testing is currently running
     */
    isStressTestRunning(): boolean {
        return this.isRunning && this.activeTests.size > 0;
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}