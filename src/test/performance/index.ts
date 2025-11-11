/* eslint-disable @typescript-eslint/no-require-imports */ // Test file: Dynamic requires for performance testing
/**
 * Performance Testing System - Main Export
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
 * Complete performance and load testing system for the imajin-cli project.
 * Provides comprehensive testing capabilities including:
 * 
 * - Performance baseline testing
 * - Load testing with concurrent operations
 * - Stress testing and breaking point detection
 * - Memory usage and resource monitoring
 * - Benchmark comparison and regression detection
 * - Real-time performance monitoring and alerting
 * - Comprehensive reporting (HTML/JSON)
 * - Integration with existing Jest test infrastructure
 */

// Core Performance Testing Framework
export { PerformanceTestBase } from './PerformanceTestBase.js';
export { LoadTestRunner } from './LoadTestRunner.js';
export { StressTestRunner } from './StressTestRunner.js';
export { PerformanceMetricsCollector } from './PerformanceMetricsCollector.js';

// Benchmarking and Monitoring
export { PerformanceBenchmarks } from './PerformanceBenchmarks.js';
export { PerformanceMonitor } from './PerformanceMonitor.js';

// Reporting and Analysis
export { PerformanceReportGenerator } from './PerformanceReportGenerator.js';

// Integration and Utilities
export { 
    PerformanceTestIntegration,
    PerformanceTestUtils
} from './PerformanceTestIntegration.js';

// Type Definitions
export type {
    // Core Types
    PerformanceTestResult,
    TestMetrics,
    MemoryUsage,
    SystemMetrics,
    ResourceUsage,
    
    // Configuration Types
    LoadTestConfig,
    StressTestConfig,
    PerformanceMonitoringConfig,
    PerformanceTestSuiteConfig,
    
    // Benchmark and Analysis Types
    PerformanceBenchmark,
    RegressionAnalysis,
    PerformanceThresholds,
    PerformanceStatistics,
    
    // Reporting Types
    PerformanceReport,
    PerformanceAlert,
    PerformanceAssertions,
    
    // Context and Monitoring Types
    PerformanceTestContext,
    PerformanceMonitorConfig
} from './types.js';

// Service-Specific Performance Tests (for reference/examples)
// These are concrete implementations that demonstrate usage patterns
// Service-specific tests are exported separately as they don't use default exports
// These would be imported individually as needed

/**
 * Quick Setup Functions for Common Use Cases
 */

/**
 * Create a complete performance testing setup for Jest
 */
export function createPerformanceTestSuite(options: {
    serviceName: string;
    enableStressTesting?: boolean;
    enableReporting?: boolean;
    outputDirectory?: string;
    thresholds?: Partial<{
        responseTime: { warning: number; critical: number };
        throughput: { minimum: number; warning: number };
        errorRate: { warning: number; critical: number };
        memoryUsage: { warning: number; critical: number };
    }>;
} = { serviceName: 'unknown' }) {
    
    const { PerformanceTestIntegration } = require('./PerformanceTestIntegration');
    return PerformanceTestIntegration.createJestSetup({
        enableMonitoring: true,
        enableReporting: options.enableReporting ?? true,
        enableBenchmarking: true,
        enableStressTesting: options.enableStressTesting ?? false,
        outputDirectory: options.outputDirectory || `./performance-reports/${options.serviceName}`,
        thresholds: {
            responseTime: {
                warning: 1000,
                critical: 5000,
                ...options.thresholds?.responseTime
            },
            throughput: {
                minimum: 10,
                warning: 50,
                ...options.thresholds?.throughput
            },
            errorRate: {
                warning: 0.05,
                critical: 0.1,
                ...options.thresholds?.errorRate
            },
            memoryUsage: {
                warning: 100 * 1024 * 1024, // 100MB
                critical: 500 * 1024 * 1024, // 500MB
                ...options.thresholds?.memoryUsage
            },
            cpuUsage: {
                warning: 70,
                critical: 90
            }
        }
    });
}

/**
 * Create basic performance assertions for common scenarios
 */
export const createPerformanceAssertions = (result: any) => ({
    /**
     * Assert that response time meets expectations
     */
    expectResponseTime: (maxMs: number) => {
        if (result.statistics.average > maxMs) {
            throw new Error(
                `Response time ${result.statistics.average.toFixed(2)}ms exceeds maximum ${maxMs}ms`
            );
        }
        return true;
    },

    /**
     * Assert that throughput meets expectations
     */
    expectThroughput: (minOpsPerSec: number) => {
        const throughput = result.systemMetrics?.throughput || 0;
        if (throughput < minOpsPerSec) {
            throw new Error(
                `Throughput ${throughput.toFixed(2)} ops/sec is below minimum ${minOpsPerSec} ops/sec`
            );
        }
        return true;
    },

    /**
     * Assert that error rate is acceptable
     */
    expectErrorRate: (maxRate: number) => {
        const errorRate = result.systemMetrics?.errorRate || 0;
        if (errorRate > maxRate) {
            throw new Error(
                `Error rate ${(errorRate * 100).toFixed(2)}% exceeds maximum ${(maxRate * 100).toFixed(2)}%`
            );
        }
        return true;
    },

    /**
     * Assert that memory usage is reasonable
     */
    expectMemoryUsage: (maxMB: number) => {
        const avgMemoryUsage = result.memoryUsage.length > 0 
            ? result.memoryUsage.reduce((sum: number, usage: any) => sum + usage.heapUsed, 0) / result.memoryUsage.length
            : 0;
        const avgMemoryMB = avgMemoryUsage / (1024 * 1024);
        
        if (avgMemoryMB > maxMB) {
            throw new Error(
                `Average memory usage ${avgMemoryMB.toFixed(2)}MB exceeds maximum ${maxMB}MB`
            );
        }
        return true;
    },

    /**
     * Assert that P95 response time is acceptable
     */
    expectP95ResponseTime: (maxMs: number) => {
        if (result.statistics.p95 > maxMs) {
            throw new Error(
                `P95 response time ${result.statistics.p95.toFixed(2)}ms exceeds maximum ${maxMs}ms`
            );
        }
        return true;
    },

    /**
     * Get a summary of all performance metrics
     */
    getSummary: () => ({
        testName: result.testName,
        averageResponseTime: result.statistics.average,
        p95ResponseTime: result.statistics.p95,
        throughput: result.systemMetrics?.throughput || 0,
        errorRate: result.systemMetrics?.errorRate || 0,
        totalOperations: result.statistics.count,
        memoryUsage: {
            average: result.memoryUsage.length > 0 
                ? result.memoryUsage.reduce((sum: number, usage: any) => sum + usage.heapUsed, 0) / result.memoryUsage.length / (1024 * 1024)
                : 0,
            peak: Math.max(...result.memoryUsage.map((usage: any) => usage.heapUsed)) / (1024 * 1024)
        }
    })
});

/**
 * Utility function to run a quick performance benchmark
 */
export async function runQuickBenchmark(
    name: string,
    operation: () => Promise<any>,
    options: {
        iterations?: number;
        timeout?: number;
        warmupIterations?: number;
    } = {}
): Promise<{
    name: string;
    averageMs: number;
    minMs: number;
    maxMs: number;
    p95Ms: number;
    iterations: number;
    successRate: number;
}> {
    const {
        iterations = 10,
        timeout = 30000,
        warmupIterations = 2
    } = options;

    console.log(`Running quick benchmark: ${name}`);

    // Warmup runs
    for (let i = 0; i < warmupIterations; i++) {
        try {
            await Promise.race([
                operation(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
        } catch (error) {
            // Intentionally ignore warmup errors - they are expected and not relevant to benchmark
        }
    }

    // Actual benchmark runs
    const results: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        try {
            await Promise.race([
                operation(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            successCount++;
        } catch (error) {
            // Count as failure but continue - benchmark tracks success rate
        }
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;
        results.push(durationMs);
    }

    const sorted = results.sort((a, b) => a - b);
    const average = results.reduce((sum, val) => sum + val, 0) / results.length;

    return {
        name,
        averageMs: average,
        minMs: Math.min(...results),
        maxMs: Math.max(...results),
        p95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
        iterations,
        successRate: successCount / iterations
    };
}


// Import all modules that are re-exported
import { PerformanceTestBase } from './PerformanceTestBase.js';
import { LoadTestRunner } from './LoadTestRunner.js';
import { StressTestRunner } from './StressTestRunner.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { PerformanceBenchmarks } from './PerformanceBenchmarks.js';
import { PerformanceReportGenerator } from './PerformanceReportGenerator.js';
import { PerformanceTestIntegration, PerformanceTestUtils } from './PerformanceTestIntegration.js';

/**
 * Default export with commonly used utilities
 */
export default {
    PerformanceTestBase,
    LoadTestRunner,
    StressTestRunner,
    PerformanceMonitor,
    PerformanceBenchmarks,
    PerformanceReportGenerator,
    PerformanceTestIntegration,
    PerformanceTestUtils,
    createPerformanceTestSuite,
    createPerformanceAssertions,
    runQuickBenchmark
};

/**
 * Version information
 */
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

console.log(`Performance Testing System v${VERSION} loaded`);
console.log('Available components:');
console.log('  - PerformanceTestBase: Base class for service performance tests');
console.log('  - LoadTestRunner: Concurrent load testing capabilities');
console.log('  - StressTestRunner: Stress testing and breaking point detection');
console.log('  - PerformanceMonitor: Real-time monitoring and alerting');
console.log('  - PerformanceBenchmarks: Baseline management and regression detection');
console.log('  - PerformanceReportGenerator: HTML and JSON report generation');
console.log('  - Integration utilities for Jest and existing test infrastructure');
console.log('');
console.log('Example usage:');
console.log('  import { createPerformanceTestSuite } from "./test/performance";');
console.log('  const { integration, beforeAll, afterAll } = createPerformanceTestSuite({');
console.log('    serviceName: "my-service",');
console.log('    enableStressTesting: true');
console.log('  });');