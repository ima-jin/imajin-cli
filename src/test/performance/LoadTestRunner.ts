/**
 * LoadTestRunner - Utility for executing load and stress tests
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
 * - PerformanceMetricsCollector for data collection
 * - BaseService for service interaction
 * - Jest for test execution
 */

import { BaseService } from '../../services/BaseService.js';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector.js';
import { 
    LoadTestConfig, 
    StressTestConfig, 
    PerformanceTestResult, 
    TestMetrics, 
    SystemMetrics,
    MemoryUsage
} from './types.js';

/**
 * Executes load and stress tests with concurrent operations
 */
export class LoadTestRunner {
    private readonly service: BaseService;
    private readonly metricsCollector: PerformanceMetricsCollector;
    private readonly activeTests: Map<string, boolean> = new Map();

    constructor(service: BaseService, metricsCollector: PerformanceMetricsCollector) {
        this.service = service;
        this.metricsCollector = metricsCollector;
    }

    /**
     * Run load test with sustained concurrent operations
     */
    async runLoadTest(
        testName: string,
        operation: () => Promise<any>,
        config: LoadTestConfig
    ): Promise<PerformanceTestResult> {
        this.activeTests.set(testName, true);
        
        try {
            console.log(`Starting load test: ${testName} with ${config.concurrentUsers} concurrent users`);
            
            // Start metrics collection
            await this.metricsCollector.startCollection(testName);
            
            const startTime = Date.now();
            const results: TestMetrics[] = [];
            const memoryUsage: MemoryUsage[] = [];
            const errors: Error[] = [];
            
            // Track concurrent operations
            const activeOperations = new Set<Promise<void>>();
            let operationCounter = 0;
            let completedOperations = 0;
            
            // Ramp up phase
            if (config.rampUpTime && config.rampUpTime > 0) {
                await this.rampUp(config.concurrentUsers, config.rampUpTime);
            }
            
            // Main test execution
            const testEndTime = startTime + config.duration;
            
            while (Date.now() < testEndTime && this.activeTests.get(testName)) {
                // Maintain target concurrency
                while (activeOperations.size < config.concurrentUsers && this.activeTests.get(testName)) {
                    const operationId = ++operationCounter;
                    
                    const operationPromise = this.executeOperation(
                        operation,
                        operationId,
                        config.timeout || 30000
                    ).then(result => {
                        completedOperations++;
                        results.push(result.metrics);
                        if (result.memory) {
                            memoryUsage.push(result.memory);
                        }
                        if (result.error) {
                            errors.push(result.error);
                        }
                    }).catch(error => {
                        errors.push(error);
                    }).finally(() => {
                        activeOperations.delete(operationPromise);
                    });
                    
                    activeOperations.add(operationPromise);
                    
                    // Control operation rate if target throughput is specified
                    if (config.targetThroughput) {
                        const delayMs = 1000 / (config.targetThroughput / config.concurrentUsers);
                        await this.delay(delayMs);
                    }
                    
                    // Check error threshold
                    if (config.maxErrors && errors.length >= config.maxErrors) {
                        console.warn(`Load test ${testName} stopped due to error threshold`);
                        break;
                    }
                }
                
                await this.delay(10); // Small delay to prevent busy waiting
            }
            
            // Wait for remaining operations to complete
            console.log(`Waiting for ${activeOperations.size} remaining operations to complete...`);
            await Promise.allSettled(Array.from(activeOperations));
            
            // Ramp down phase
            if (config.rampDownTime && config.rampDownTime > 0) {
                await this.rampDown(config.rampDownTime);
            }
            
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            
            // Stop metrics collection
            const systemMetrics = await this.metricsCollector.stopCollection();
            
            // Calculate final system metrics
            const finalSystemMetrics: SystemMetrics = {
                ...systemMetrics,
                throughput: (completedOperations / totalDuration) * 1000, // ops per second
                errorRate: errors.length / Math.max(completedOperations + errors.length, 1),
                concurrentUsers: config.concurrentUsers,
                totalOperations: completedOperations,
                totalErrors: errors.length,
                testDuration: totalDuration
            };
            
            const resultConfig: any = {
                iterations: completedOperations,
                collectMemory: true
            };
            
            if (config.timeout !== undefined) {
                resultConfig.timeout = config.timeout;
            }
            
            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(startTime),
                config: resultConfig,
                results,
                memoryUsage,
                systemMetrics: finalSystemMetrics,
                statistics: this.calculateStatistics(results),
                baseline: undefined,
                notes: `Load test with ${config.concurrentUsers} concurrent users for ${config.duration}ms`
            };
            
            console.log(`Load test completed: ${testName}`);
            console.log(`  Operations: ${completedOperations}`);
            console.log(`  Errors: ${errors.length}`);
            console.log(`  Duration: ${totalDuration}ms`);
            console.log(`  Throughput: ${finalSystemMetrics.throughput.toFixed(2)} ops/sec`);
            console.log(`  Error Rate: ${(finalSystemMetrics.errorRate * 100).toFixed(2)}%`);
            
            return performanceResult;
            
        } finally {
            this.activeTests.delete(testName);
        }
    }

    /**
     * Run stress test to find breaking point
     */
    async runStressTest(
        testName: string,
        operation: () => Promise<any>,
        config: StressTestConfig
    ): Promise<PerformanceTestResult> {
        this.activeTests.set(testName, true);
        
        try {
            console.log(`Starting stress test: ${testName}`);
            
            await this.metricsCollector.startCollection(testName);
            
            const startTime = Date.now();
            const allResults: TestMetrics[] = [];
            const allMemoryUsage: MemoryUsage[] = [];
            let breakingPoint = 0;
            let totalOperations = 0;
            let totalErrors = 0;
            
            for (let concurrency = config.startConcurrency; 
                 concurrency <= config.maxConcurrency && this.activeTests.get(testName); 
                 concurrency += config.stepSize) {
                
                console.log(`Testing with ${concurrency} concurrent operations...`);
                
                const stepResults = await this.runStressTestStep(
                    operation,
                    concurrency,
                    config.durationPerStep,
                    config.errorThreshold
                );
                
                allResults.push(...stepResults.results);
                allMemoryUsage.push(...stepResults.memoryUsage);
                totalOperations += stepResults.operations;
                totalErrors += stepResults.errors;
                
                const errorRate = stepResults.errors / Math.max(stepResults.operations, 1);
                const avgResponseTime = stepResults.results.reduce((sum, r) => sum + r.duration, 0) / 
                                      Math.max(stepResults.results.length, 1);
                
                console.log(`  Concurrency ${concurrency}: ${stepResults.operations} ops, ${stepResults.errors} errors, ${avgResponseTime.toFixed(2)}ms avg`);
                
                // Check if we've hit the breaking point
                if (errorRate > config.errorThreshold ||
                    (config.responseTimeThreshold && avgResponseTime > config.responseTimeThreshold) ||
                    (config.memoryThreshold && this.checkMemoryThreshold(stepResults.memoryUsage, config.memoryThreshold))) {
                    
                    breakingPoint = concurrency;
                    console.log(`Breaking point reached at ${concurrency} concurrent operations`);
                    console.log(`  Error rate: ${(errorRate * 100).toFixed(2)}% (threshold: ${(config.errorThreshold * 100).toFixed(2)}%)`);
                    if (config.responseTimeThreshold) {
                        console.log(`  Avg response time: ${avgResponseTime.toFixed(2)}ms (threshold: ${config.responseTimeThreshold}ms)`);
                    }
                    break;
                }
                
                // Small delay between steps
                await this.delay(1000);
            }
            
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            
            const systemMetrics = await this.metricsCollector.stopCollection();
            
            const finalSystemMetrics: SystemMetrics = {
                ...systemMetrics,
                throughput: (totalOperations / totalDuration) * 1000,
                errorRate: totalErrors / Math.max(totalOperations, 1),
                concurrentUsers: breakingPoint || config.maxConcurrency,
                totalOperations,
                totalErrors,
                testDuration: totalDuration
            };
            
            const performanceResult: PerformanceTestResult = {
                testName,
                timestamp: new Date(startTime),
                config: {
                    iterations: totalOperations,
                    collectMemory: true
                },
                results: allResults,
                memoryUsage: allMemoryUsage,
                systemMetrics: finalSystemMetrics,
                statistics: this.calculateStatistics(allResults),
                baseline: undefined,
                notes: `Stress test from ${config.startConcurrency} to ${config.maxConcurrency} concurrency. Breaking point: ${breakingPoint || 'Not reached'}`
            };
            
            console.log(`Stress test completed: ${testName}`);
            console.log(`  Breaking point: ${breakingPoint || 'Not reached'}`);
            console.log(`  Total operations: ${totalOperations}`);
            console.log(`  Total errors: ${totalErrors}`);
            console.log(`  Overall error rate: ${(finalSystemMetrics.errorRate * 100).toFixed(2)}%`);
            
            return performanceResult;
            
        } finally {
            this.activeTests.delete(testName);
        }
    }

    /**
     * Execute a single stress test step
     */
    private async runStressTestStep(
        operation: () => Promise<any>,
        concurrency: number,
        duration: number,
        errorThreshold: number
    ): Promise<{
        results: TestMetrics[];
        memoryUsage: MemoryUsage[];
        operations: number;
        errors: number;
    }> {
        const results: TestMetrics[] = [];
        const memoryUsage: MemoryUsage[] = [];
        const errors: Error[] = [];
        const activeOperations = new Set<Promise<void>>();
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        let operationCounter = 0;
        
        while (Date.now() < endTime) {
            // Maintain target concurrency
            while (activeOperations.size < concurrency && Date.now() < endTime) {
                const operationId = ++operationCounter;
                
                const operationPromise = this.executeOperation(operation, operationId)
                    .then(result => {
                        results.push(result.metrics);
                        if (result.memory) {
                            memoryUsage.push(result.memory);
                        }
                        if (result.error) {
                            errors.push(result.error);
                        }
                    })
                    .catch(error => {
                        errors.push(error);
                    })
                    .finally(() => {
                        activeOperations.delete(operationPromise);
                    });
                
                activeOperations.add(operationPromise);
            }
            
            await this.delay(10);
            
            // Early termination if error threshold exceeded
            const currentErrorRate = errors.length / Math.max(results.length + errors.length, 1);
            if (currentErrorRate > errorThreshold * 2) { // Allow some buffer
                break;
            }
        }
        
        // Wait for remaining operations
        await Promise.allSettled(Array.from(activeOperations));
        
        return {
            results,
            memoryUsage,
            operations: results.length,
            errors: errors.length
        };
    }

    /**
     * Execute single operation with metrics collection
     */
    private async executeOperation(
        operation: () => Promise<any>,
        operationId: number,
        timeout: number = 30000
    ): Promise<{
        metrics: TestMetrics;
        memory?: MemoryUsage;
        error?: Error;
    }> {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();
        let error: Error | undefined;
        
        try {
            // Add timeout to operation
            await Promise.race([
                operation(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Operation timeout')), timeout)
                )
            ]);
        } catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
        }
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        const metrics: TestMetrics = {
            iteration: operationId,
            duration,
            timestamp: new Date(),
            error
        };
        
        const memory: MemoryUsage = {
            iteration: operationId,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external,
            rss: endMemory.rss - startMemory.rss,
            timestamp: new Date()
        };
        
        const result: any = { metrics };
        
        if (memory !== undefined) {
            result.memory = memory;
        }
        
        if (error !== undefined) {
            result.error = error;
        }
        
        return result;
    }

    /**
     * Gradual ramp up of concurrent operations
     */
    private async rampUp(targetConcurrency: number, rampUpTime: number): Promise<void> {
        console.log(`Ramping up to ${targetConcurrency} concurrent operations over ${rampUpTime}ms`);
        
        const steps = Math.min(10, targetConcurrency);
        const stepDuration = rampUpTime / steps;
        const concurrencyPerStep = targetConcurrency / steps;
        
        for (let step = 1; step <= steps; step++) {
            const currentConcurrency = Math.floor(concurrencyPerStep * step);
            console.log(`Ramp up step ${step}/${steps}: ${currentConcurrency} concurrent operations`);
            await this.delay(stepDuration);
        }
    }

    /**
     * Gradual ramp down of concurrent operations
     */
    private async rampDown(rampDownTime: number): Promise<void> {
        console.log(`Ramping down over ${rampDownTime}ms`);
        await this.delay(rampDownTime);
    }

    /**
     * Check if memory usage exceeds threshold
     */
    private checkMemoryThreshold(memoryUsage: MemoryUsage[], threshold: number): boolean {
        const recentUsage = memoryUsage.slice(-10); // Check last 10 measurements
        return recentUsage.some(usage => usage.heapUsed > threshold);
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
        const sorted = durations.toSorted((a, b) => a - b);
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
     * Stop all active tests
     */
    stopAllTests(): void {
        console.log('Stopping all active load tests...');
        for (const testName of this.activeTests.keys()) {
            this.activeTests.set(testName, false);
        }
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}