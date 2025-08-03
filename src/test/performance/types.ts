/**
 * Performance Testing Types
 *
 * @package     @imajin/cli
 * @subpackage  test/performance
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-31
 * @updated      2025-08-02
 */

/**
 * Individual test metrics for a single iteration
 */
export interface TestMetrics {
    iteration: number;
    duration: number; // milliseconds
    timestamp: Date;
    error?: Error | undefined;
    customMetrics?: Record<string, number> | undefined;
}

/**
 * Memory usage metrics
 */
export interface MemoryUsage {
    iteration: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    timestamp: Date;
}

/**
 * System-level performance metrics
 */
export interface SystemMetrics {
    throughput: number; // operations per second
    errorRate: number; // decimal (0.01 = 1%)
    concurrentUsers: number;
    totalOperations: number;
    totalErrors: number;
    testDuration: number; // milliseconds
    cpuUsage?: number; // percentage
    memoryUsage?: number; // bytes
}

/**
 * Statistical analysis of test results
 */
export interface PerformanceStatistics {
    count: number;
    average: number;
    median: number | undefined;
    min: number;
    max: number;
    p95: number | undefined;
    p99: number | undefined;
    standardDeviation: number;
}

/**
 * Performance baseline for comparison
 */
export interface PerformanceBenchmark {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    createdAt?: Date;
    version?: string;
}

/**
 * Complete performance test result
 */
export interface PerformanceTestResult {
    testName: string | undefined;
    timestamp: Date;
    config: {
        iterations?: number;
        warmupIterations?: number;
        timeout?: number;
        collectMemory?: boolean;
    };
    results: TestMetrics[];
    memoryUsage: MemoryUsage[];
    systemMetrics?: SystemMetrics;
    statistics: PerformanceStatistics;
    baseline: PerformanceBenchmark | undefined;
    regressions?: string[];
    notes?: string;
}

/**
 * Load test configuration
 */
export interface LoadTestConfig {
    concurrentUsers: number;
    duration: number; // milliseconds
    rampUpTime?: number; // milliseconds
    rampDownTime?: number; // milliseconds
    targetThroughput?: number; // operations per second
    maxErrors?: number;
    timeout?: number; // milliseconds per operation
}

/**
 * Stress test configuration
 */
export interface StressTestConfig {
    startConcurrency: number;
    maxConcurrency: number;
    stepSize: number;
    durationPerStep: number; // milliseconds
    errorThreshold: number; // decimal (0.05 = 5%)
    memoryThreshold?: number; // bytes
    responseTimeThreshold?: number; // milliseconds
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
    collectSystemMetrics: boolean;
    collectMemoryMetrics: boolean;
    collectCustomMetrics: boolean;
    samplingInterval: number; // milliseconds
    maxSamples: number;
}

/**
 * Performance test suite configuration
 */
export interface PerformanceTestSuiteConfig {
    serviceName: string;
    version: string;
    testEnvironment: string;
    baselineVersion?: string;
    reportFormat: 'json' | 'html' | 'csv';
    outputPath?: string;
    monitoring: PerformanceMonitoringConfig;
}

/**
 * Performance regression analysis
 */
export interface RegressionAnalysis {
    testName: string;
    metric: string;
    currentValue: number;
    baselineValue: number;
    changePercent: number;
    isRegression: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    threshold: number;
}

/**
 * Performance test report
 */
export interface PerformanceReport {
    timestamp: string;
    service: string;
    version: string;
    testEnvironment: string;
    summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        totalRegressions: number;
        averageResponseTime: number;
        totalDuration: number;
    };
    results: PerformanceTestResult[];
    regressions: RegressionAnalysis[];
    recommendations: string[];
}

/**
 * Custom performance assertions
 */
export interface PerformanceAssertions {
    maxAverageResponseTime?: number;
    maxP95ResponseTime?: number;
    maxP99ResponseTime?: number;
    minThroughput?: number;
    maxErrorRate?: number;
    maxMemoryUsage?: number;
    maxCpuUsage?: number;
    maxStandardDeviation?: number;
}

/**
 * Performance test context
 */
export interface PerformanceTestContext {
    testName: string;
    service: string;
    operation: string;
    parameters?: Record<string, any>;
    environment: Record<string, string>;
    startTime: Date;
    endTime?: Date;
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
    timestamp: Date;
    cpu: {
        usage: number; // percentage
        load: number[];
    };
    memory: {
        used: number;
        total: number;
        free: number;
        buffers?: number;
        cached?: number;
    };
    network?: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
    };
    disk?: {
        readBytes: number;
        writeBytes: number;
        readOps: number;
        writeOps: number;
    };
}

/**
 * Performance thresholds for alerting
 */
export interface PerformanceThresholds {
    responseTime: {
        warning: number;
        critical: number;
    };
    throughput: {
        minimum: number;
        warning: number;
    };
    errorRate: {
        warning: number;
        critical: number;
    };
    memoryUsage: {
        warning: number;
        critical: number;
    };
    cpuUsage: {
        warning: number;
        critical: number;
    };
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
    id: string;
    testName: string;
    metric: string;
    threshold: number;
    actualValue: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    message: string;
    resolved?: boolean;
    resolvedAt?: Date;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
    enableMonitoring: boolean;
    enableReporting: boolean;
    enableBenchmarking: boolean;
    enableStressTesting: boolean;
    outputDirectory?: string;
    thresholds?: PerformanceThresholds;
    alertThresholds?: PerformanceThresholds;
    enableRealTimeAlerts: boolean;
    enableRegressionDetection: boolean;
}

/**
 * Performance test suite options
 */
export interface PerformanceTestSuiteOptions {
    enableMonitoring: boolean;
    enableReporting: boolean;
    enableBenchmarking: boolean;
    enableStressTesting: boolean;
    outputDirectory?: string;
    thresholds?: PerformanceThresholds;
}
