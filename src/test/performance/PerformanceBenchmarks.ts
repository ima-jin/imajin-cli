/**
 * PerformanceBenchmarks - Benchmark management and comparison system
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
 * - File system for benchmark persistence
 * - Performance test results comparison
 * - Regression detection and alerting
 */

import { 
    PerformanceBenchmark, 
    PerformanceTestResult, 
    RegressionAnalysis,
    PerformanceThresholds
} from './types.js';

/**
 * Manages performance benchmarks and regression detection
 */
export class PerformanceBenchmarks {
    private benchmarks: Map<string, PerformanceBenchmark> = new Map();
    private readonly thresholds: PerformanceThresholds;

    constructor(thresholds?: PerformanceThresholds) {
        this.thresholds = thresholds || this.getDefaultThresholds();
        this.loadDefaultBenchmarks();
    }

    /**
     * Set a benchmark for a specific test
     */
    setBenchmark(testName: string, benchmark: PerformanceBenchmark): void {
        this.benchmarks.set(testName, {
            ...benchmark,
            createdAt: benchmark.createdAt || new Date(),
            version: benchmark.version || '1.0.0'
        });
    }

    /**
     * Get benchmark for a test
     */
    getBenchmark(testName: string): PerformanceBenchmark | undefined {
        return this.benchmarks.get(testName);
    }

    /**
     * Create benchmark from test result
     */
    createBenchmarkFromResult(result: PerformanceTestResult): PerformanceBenchmark {
        const avgMemoryUsage = result.memoryUsage.length > 0 
            ? result.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) / result.memoryUsage.length
            : 0;

        return {
            averageResponseTime: result.statistics.average,
            maxResponseTime: result.statistics.max,
            minResponseTime: result.statistics.min,
            throughput: result.systemMetrics?.throughput || 0,
            errorRate: result.systemMetrics?.errorRate || 0,
            memoryUsage: avgMemoryUsage,
            createdAt: result.timestamp,
            version: '1.0.0'
        };
    }

    /**
     * Compare test result against benchmark
     */
    compareAgainstBenchmark(result: PerformanceTestResult): RegressionAnalysis[] {
        if (!result.testName) {
return [];
}
        const benchmark = this.getBenchmark(result.testName);
        if (!benchmark) {
            return [];
        }

        const regressions: RegressionAnalysis[] = [];

        // Check average response time and max response time
        regressions.push(
            this.analyzeMetric(
                result.testName,
                'averageResponseTime',
                result.statistics.average,
                benchmark.averageResponseTime,
                this.thresholds.responseTime.warning,
                this.thresholds.responseTime.critical
            ),
            this.analyzeMetric(
                result.testName,
                'maxResponseTime',
                result.statistics.max,
                benchmark.maxResponseTime,
                this.thresholds.responseTime.warning * 1.5,
                this.thresholds.responseTime.critical * 1.5
            )
        );

        // Check throughput (lower is worse)
        if (result.systemMetrics?.throughput && benchmark.throughput > 0) {
            const throughputChange = (benchmark.throughput - result.systemMetrics.throughput) / benchmark.throughput;
            regressions.push({
                testName: result.testName,
                metric: 'throughput',
                currentValue: result.systemMetrics.throughput,
                baselineValue: benchmark.throughput,
                changePercent: throughputChange * 100,
                isRegression: throughputChange > 0.1, // 10% decrease is regression
                severity: this.getSeverity(throughputChange, 0.1, 0.25),
                threshold: 0.1
            });
        }

        // Check error rate
        if (result.systemMetrics?.errorRate !== undefined && benchmark.errorRate !== undefined) {
            const errorRateChange = (result.systemMetrics.errorRate - benchmark.errorRate) / Math.max(benchmark.errorRate, 0.001);
            regressions.push({
                testName: result.testName,
                metric: 'errorRate',
                currentValue: result.systemMetrics.errorRate,
                baselineValue: benchmark.errorRate,
                changePercent: errorRateChange * 100,
                isRegression: result.systemMetrics.errorRate > benchmark.errorRate * 2,
                severity: this.getSeverity(result.systemMetrics.errorRate, this.thresholds.errorRate.warning, this.thresholds.errorRate.critical),
                threshold: benchmark.errorRate * 2
            });
        }

        // Check memory usage
        const avgMemoryUsage = result.memoryUsage.length > 0 
            ? result.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) / result.memoryUsage.length
            : 0;

        if (avgMemoryUsage > 0 && benchmark.memoryUsage > 0) {
            const memoryChange = (avgMemoryUsage - benchmark.memoryUsage) / benchmark.memoryUsage;
            regressions.push({
                testName: result.testName,
                metric: 'memoryUsage',
                currentValue: avgMemoryUsage,
                baselineValue: benchmark.memoryUsage,
                changePercent: memoryChange * 100,
                isRegression: memoryChange > 0.2, // 20% increase is regression
                severity: this.getSeverity(memoryChange, 0.2, 0.5),
                threshold: benchmark.memoryUsage * 1.2
            });
        }

        return regressions.filter(regression => regression !== null);
    }

    /**
     * Analyze a specific metric for regression
     */
    private analyzeMetric(
        testName: string,
        metric: string,
        currentValue: number,
        baselineValue: number,
        warningThreshold: number,
        criticalThreshold: number
    ): RegressionAnalysis {
        const change = (currentValue - baselineValue) / baselineValue;
        const changePercent = change * 100;
        
        return {
            testName,
            metric,
            currentValue,
            baselineValue,
            changePercent,
            isRegression: currentValue > baselineValue * 1.1, // 10% increase is regression
            severity: this.getSeverity(currentValue, warningThreshold, criticalThreshold),
            threshold: baselineValue * 1.1
        };
    }

    /**
     * Determine severity level
     */
    private getSeverity(value: number, warningThreshold: number, criticalThreshold: number): 'low' | 'medium' | 'high' | 'critical' {
        if (value >= criticalThreshold) {
return 'critical';
}
        if (value >= criticalThreshold * 0.8) {
return 'high';
}
        if (value >= warningThreshold) {
return 'medium';
}
        return 'low';
    }

    /**
     * Update benchmark with new result if it's better
     */
    updateBenchmarkIfBetter(result: PerformanceTestResult): boolean {
        if (!result.testName) {
return false;
}
        const existingBenchmark = this.getBenchmark(result.testName);
        if (!existingBenchmark) {
            // No existing benchmark, create one
            const newBenchmark = this.createBenchmarkFromResult(result);
            this.setBenchmark(result.testName, newBenchmark);
            return true;
        }

        // Check if new result is significantly better
        const isBetter = this.isResultBetter(result, existingBenchmark);
        if (isBetter) {
            const updatedBenchmark = this.createBenchmarkFromResult(result);
            this.setBenchmark(result.testName, updatedBenchmark);
            console.log(`Updated benchmark for ${result.testName} with better performance`);
            return true;
        }

        return false;
    }

    /**
     * Check if result is better than existing benchmark
     */
    private isResultBetter(result: PerformanceTestResult, benchmark: PerformanceBenchmark): boolean {
        // Better if average response time is significantly lower
        const responseTimeImprovement = (benchmark.averageResponseTime - result.statistics.average) / benchmark.averageResponseTime;
        
        // Better if throughput is significantly higher
        const throughputImprovement = result.systemMetrics?.throughput 
            ? (result.systemMetrics.throughput - benchmark.throughput) / benchmark.throughput
            : 0;

        // Better if error rate is lower
        const errorRateImprovement = result.systemMetrics?.errorRate === undefined
            ? 0
            : (benchmark.errorRate - result.systemMetrics.errorRate) / Math.max(benchmark.errorRate, 0.001);

        // Consider it better if we have significant improvement in any area
        return responseTimeImprovement > 0.1 || // 10% faster
               throughputImprovement > 0.1 ||   // 10% more throughput
               errorRateImprovement > 0.1;      // 10% fewer errors
    }

    /**
     * Get all benchmarks
     */
    getAllBenchmarks(): Map<string, PerformanceBenchmark> {
        return new Map(this.benchmarks);
    }

    /**
     * Save benchmarks to file (in a real implementation)
     */
    async saveBenchmarks(_filePath?: string): Promise<void> {
        // In a real implementation, this would save to file system
        const _benchmarkData = Object.fromEntries(this.benchmarks);
        console.log(`Saving ${this.benchmarks.size} benchmarks...`);
        
        // Mock file save
        console.log('Benchmarks saved (mock implementation)');
    }

    /**
     * Load benchmarks from file (in a real implementation)
     */
    async loadBenchmarks(_filePath?: string): Promise<void> {
        // In a real implementation, this would load from file system
        console.log('Loading benchmarks (mock implementation)...');
        
        // For now, just load default benchmarks
        this.loadDefaultBenchmarks();
    }

    /**
     * Generate benchmark report
     */
    generateBenchmarkReport(): {
        totalBenchmarks: number;
        benchmarks: Array<{
            testName: string;
            benchmark: PerformanceBenchmark;
            age: number; // days
        }>;
        oldBenchmarks: string[];
        recommendations: string[];
    } {
        const now = new Date();
        const benchmarkList = Array.from(this.benchmarks.entries()).map(([testName, benchmark]) => ({
            testName,
            benchmark,
            age: benchmark.createdAt ? Math.floor((now.getTime() - benchmark.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
        }));

        const oldBenchmarks = benchmarkList
            .filter(item => item.age > 30) // Older than 30 days
            .map(item => item.testName);

        const recommendations: string[] = [];
        
        if (oldBenchmarks.length > 0) {
            recommendations.push(`Update ${oldBenchmarks.length} benchmarks that are older than 30 days`);
        }
        
        if (benchmarkList.length < 5) {
            recommendations.push('Consider adding more performance benchmarks for better coverage');
        }

        return {
            totalBenchmarks: this.benchmarks.size,
            benchmarks: benchmarkList,
            oldBenchmarks,
            recommendations
        };
    }

    /**
     * Get default performance thresholds
     */
    private getDefaultThresholds(): PerformanceThresholds {
        return {
            responseTime: {
                warning: 1000, // 1 second
                critical: 5000  // 5 seconds
            },
            throughput: {
                minimum: 10,    // 10 ops/sec minimum
                warning: 50     // 50 ops/sec warning threshold
            },
            errorRate: {
                warning: 0.01,  // 1%
                critical: 0.05  // 5%
            },
            memoryUsage: {
                warning: 100 * 1024 * 1024,   // 100MB
                critical: 500 * 1024 * 1024   // 500MB
            },
            cpuUsage: {
                warning: 70,    // 70%
                critical: 90    // 90%
            }
        };
    }

    /**
     * Load default benchmarks for common operations
     */
    private loadDefaultBenchmarks(): void {
        // Service initialization benchmarks
        this.setBenchmark('service-initialization', {
            averageResponseTime: 100,
            maxResponseTime: 200,
            minResponseTime: 50,
            throughput: 10,
            errorRate: 0,
            memoryUsage: 10 * 1024 * 1024, // 10MB
            createdAt: new Date(),
            version: '1.0.0'
        });

        // Basic CRUD operation benchmarks
        this.setBenchmark('basic-crud-operation', {
            averageResponseTime: 200,
            maxResponseTime: 500,
            minResponseTime: 100,
            throughput: 50,
            errorRate: 0.01,
            memoryUsage: 20 * 1024 * 1024, // 20MB
            createdAt: new Date(),
            version: '1.0.0'
        });

        // API call benchmarks
        this.setBenchmark('external-api-call', {
            averageResponseTime: 500,
            maxResponseTime: 2000,
            minResponseTime: 200,
            throughput: 20,
            errorRate: 0.02,
            memoryUsage: 15 * 1024 * 1024, // 15MB
            createdAt: new Date(),
            version: '1.0.0'
        });

        // Data processing benchmarks
        this.setBenchmark('data-processing', {
            averageResponseTime: 1000,
            maxResponseTime: 5000,
            minResponseTime: 500,
            throughput: 5,
            errorRate: 0.005,
            memoryUsage: 50 * 1024 * 1024, // 50MB
            createdAt: new Date(),
            version: '1.0.0'
        });

        console.log(`Loaded ${this.benchmarks.size} default benchmarks`);
    }

    /**
     * Clear all benchmarks
     */
    clearBenchmarks(): void {
        this.benchmarks.clear();
    }

    /**
     * Remove a specific benchmark
     */
    removeBenchmark(testName: string): boolean {
        return this.benchmarks.delete(testName);
    }

    /**
     * Get performance summary compared to benchmarks
     */
    getPerformanceSummary(results: PerformanceTestResult[]): {
        totalTests: number;
        benchmarkedTests: number;
        regressions: number;
        improvements: number;
        overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    } {
        let benchmarkedTests = 0;
        let regressions = 0;
        let improvements = 0;

        for (const result of results) {
            if (!result.testName) {
continue;
}
            const benchmark = this.getBenchmark(result.testName);
            if (benchmark) {
                benchmarkedTests++;
                
                const regressionAnalysis = this.compareAgainstBenchmark(result);
                const hasRegression = regressionAnalysis.some(analysis => analysis.isRegression);
                const hasImprovement = regressionAnalysis.some(analysis => 
                    analysis.changePercent < -10 // 10% improvement
                );

                if (hasRegression) {
regressions++;
}
                if (hasImprovement) {
improvements++;
}
            }
        }

        let overallHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
        
        if (regressions > benchmarkedTests * 0.5) {
            overallHealth = 'critical';
        } else if (regressions > benchmarkedTests * 0.25) {
            overallHealth = 'warning';
        } else if (regressions > 0 || improvements < benchmarkedTests * 0.1) {
            overallHealth = 'good';
        }

        return {
            totalTests: results.length,
            benchmarkedTests,
            regressions,
            improvements,
            overallHealth
        };
    }
}