/**
 * PerformanceTestIntegration - Integration with existing test infrastructure
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
 * - Jest integration for performance tests
 * - Service test framework integration  
 * - Automated performance regression detection
 * - CI/CD pipeline integration
 */

import { BaseService } from '../../services/BaseService.js';
import { PerformanceTestBase } from './PerformanceTestBase.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { PerformanceBenchmarks } from './PerformanceBenchmarks.js';
import { PerformanceReportGenerator, ReportGenerationConfig } from './PerformanceReportGenerator.js';
import { StressTestRunner } from './StressTestRunner.js';
import { 
    PerformanceTestResult, 
    PerformanceTestSuiteConfig,
    PerformanceThresholds 
} from './types.js';

export interface PerformanceTestSuiteOptions {
    enableMonitoring: boolean;
    enableReporting: boolean;
    enableBenchmarking: boolean;
    enableStressTesting: boolean;
    reportConfig?: ReportGenerationConfig;
    thresholds?: PerformanceThresholds;
    outputDirectory?: string;
}

/**
 * Integrates performance testing with existing test infrastructure
 */
export class PerformanceTestIntegration {
    private monitor?: PerformanceMonitor;
    private benchmarks?: PerformanceBenchmarks;
    private reportGenerator?: PerformanceReportGenerator;
    private stressTestRunner?: StressTestRunner;
    private readonly results: PerformanceTestResult[] = [];
    private readonly options: PerformanceTestSuiteOptions;

    constructor(options: PerformanceTestSuiteOptions) {
        this.options = {
            outputDirectory: './performance-reports',
            ...options
        };

        this.initializeComponents();
    }

    /**
     * Initialize performance testing components
     */
    private initializeComponents(): void {
        if (this.options.enableBenchmarking) {
            this.benchmarks = new PerformanceBenchmarks(this.options.thresholds);
        }

        if (this.options.enableMonitoring) {
            this.monitor = new PerformanceMonitor({
                alertThresholds: this.options.thresholds,
                enableRealTimeAlerts: true,
                enableRegessionDetection: this.options.enableBenchmarking
            } as any);
        }

        if (this.options.enableReporting) {
            const reportConfig: ReportGenerationConfig = {
                outputDirectory: this.options.outputDirectory || './performance-reports',
                includeCharts: true,
                includeRawData: true,
                format: 'both',
                title: 'Performance Test Report',
                description: 'Automated performance testing results',
                ...this.options.reportConfig
            };

            this.reportGenerator = new PerformanceReportGenerator(
                this.benchmarks || new PerformanceBenchmarks(),
                reportConfig
            );
        }
    }

    /**
     * Setup performance testing for a service test
     */
    async setupPerformanceTest<T extends BaseService>(
        testBase: PerformanceTestBase<T>
    ): Promise<void> {
        // Initialize monitoring if enabled
        if (this.monitor) {
            await this.monitor.startMonitoring();
            
            // Listen for performance test results
            this.monitor.on('test:recorded', (result: PerformanceTestResult) => {
                this.results.push(result);
            });
        }

        // Initialize stress testing if enabled
        if (this.options.enableStressTesting && testBase.getService()) {
            const metricsCollector = (testBase as any).metricsCollector;
            if (metricsCollector) {
                this.stressTestRunner = new StressTestRunner(
                    testBase.getService(),
                    metricsCollector
                );
            }
        }

        console.log('Performance test integration initialized');
    }

    /**
     * Teardown performance testing
     */
    async teardownPerformanceTest(): Promise<void> {
        // Stop monitoring
        if (this.monitor) {
            await this.monitor.stopMonitoring();
        }

        // Stop stress testing
        if (this.stressTestRunner?.isStressTestRunning()) {
            this.stressTestRunner.stopAll();
        }

        // Generate reports if enabled
        if (this.options.enableReporting && this.reportGenerator && this.results.length > 0) {
            console.log('Generating performance reports...');
            const _report = this.reportGenerator.generateReport(this.results);
            console.log(`Generated report with ${this.results.length} test results`);
        }

        console.log('Performance test integration teardown complete');
    }

    /**
     * Record a performance test result
     */
    recordTestResult(result: PerformanceTestResult): void {
        this.results.push(result);
        
        if (this.monitor) {
            this.monitor.recordTestResult(result);
        }
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        if (this.monitor) {
            return this.monitor.getPerformanceSummary();
        }
        
        return {
            totalTests: this.results.length,
            averageResponseTime: this.results.length > 0 
                ? this.results.reduce((sum, r) => sum + r.statistics.average, 0) / this.results.length
                : 0,
            totalAlerts: 0,
            criticalAlerts: 0,
            performanceHealth: 'unknown' as const,
            trends: []
        };
    }

    /**
     * Get active performance alerts
     */
    getActiveAlerts() {
        return this.monitor?.getActiveAlerts() || [];
    }

    /**
     * Get stress test runner (if enabled)
     */
    getStressTestRunner(): StressTestRunner | undefined {
        return this.stressTestRunner;
    }

    /**
     * Get benchmark manager
     */
    getBenchmarks(): PerformanceBenchmarks | undefined {
        return this.benchmarks;
    }

    /**
     * Create Jest setup for performance testing
     */
    static createJestSetup(options?: PerformanceTestSuiteOptions): {
        beforeAll: () => Promise<void>;
        afterAll: () => Promise<void>;
        integration: PerformanceTestIntegration;
    } {
        const defaultOptions: PerformanceTestSuiteOptions = {
            enableMonitoring: true,
            enableReporting: true,
            enableBenchmarking: true,
            enableStressTesting: false
        };
        const integration = new PerformanceTestIntegration(options || defaultOptions);

        return {
            integration,
            beforeAll: async () => {
                console.log('Setting up performance test suite...');
                // Global setup tasks here
            },
            afterAll: async () => {
                console.log('Tearing down performance test suite...');
                await integration.teardownPerformanceTest();
            }
        };
    }

    /**
     * Create performance test decorator for Jest tests
     */
    static performanceTest(
        thresholds?: {
            maxAverageResponseTime?: number;
            maxP95ResponseTime?: number;
            minThroughput?: number;
            maxErrorRate?: number;
        }
    ) {
        return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
            const method = descriptor.value;
            
            descriptor.value = async function(...args: any[]) {
                console.log(`Running performance test: ${propertyName}`);
                
                const startTime = Date.now();
                let result;
                let _error;

                try {
                    result = await method.apply(this, args);
                } catch (err) {
                    _error = err;
                    throw err;
                } finally {
                    const duration = Date.now() - startTime;
                    
                    // Log performance metrics
                    console.log(`Performance test ${propertyName} completed in ${duration}ms`);
                    
                    // Check against thresholds if provided
                    if (thresholds?.maxAverageResponseTime && duration > thresholds.maxAverageResponseTime) {
                        console.warn(`Performance threshold exceeded: ${duration}ms > ${thresholds.maxAverageResponseTime}ms`);
                    }
                }
                
                return result;
            };
            
            return descriptor;
        };
    }
}

/**
 * Global performance test utilities
 */
export class PerformanceTestUtils {
    /**
     * Setup performance testing for Jest environment
     */
    static setupJestEnvironment(_config?: PerformanceTestSuiteConfig): void {
        // Global Jest setup
        const originalDescribe = globalThis.describe;

        (globalThis.describe as any) = function(name: string, fn: () => void) {
            return originalDescribe(`${name} [Performance]`, fn);
        };

        // Add performance test timeout
        jest.setTimeout(60000); // 60 seconds for performance tests
        
        console.log('Jest environment configured for performance testing');
    }

    /**
     * Create performance assertion helpers
     */
    static createAssertions() {
        return {
            toMeetPerformanceThreshold: (result: PerformanceTestResult, threshold: number) => {
                const pass = result.statistics.average <= threshold;
                return {
                    message: () => 
                        `Expected average response time ${result.statistics.average.toFixed(2)}ms to be ${pass ? 'above' : 'below'} ${threshold}ms`,
                    pass
                };
            },
            
            toHaveThroughputAbove: (result: PerformanceTestResult, minThroughput: number) => {
                const actualThroughput = result.systemMetrics?.throughput || 0;
                const pass = actualThroughput >= minThroughput;
                return {
                    message: () => 
                        `Expected throughput ${actualThroughput.toFixed(2)} ops/sec to be ${pass ? 'below' : 'above'} ${minThroughput} ops/sec`,
                    pass
                };
            },
            
            toHaveErrorRateBelow: (result: PerformanceTestResult, maxErrorRate: number) => {
                const actualErrorRate = result.systemMetrics?.errorRate || 0;
                const pass = actualErrorRate <= maxErrorRate;
                return {
                    message: () => 
                        `Expected error rate ${(actualErrorRate * 100).toFixed(2)}% to be ${pass ? 'above' : 'below'} ${(maxErrorRate * 100).toFixed(2)}%`,
                    pass
                };
            }
        };
    }

    /**
     * Generate performance test report summary
     */
    static generateSummary(results: PerformanceTestResult[]): string {
        if (results.length === 0) {
            return 'No performance test results available';
        }

        const totalTests = results.length;
        const averageResponseTime = results.reduce((sum, r) => sum + r.statistics.average, 0) / totalTests;
        const totalOperations = results.reduce((sum, r) => sum + (r.systemMetrics?.totalOperations || 0), 0);
        const totalErrors = results.reduce((sum, r) => sum + (r.systemMetrics?.totalErrors || 0), 0);
        const overallErrorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

        return `
Performance Test Summary:
========================
Total Tests: ${totalTests}
Average Response Time: ${averageResponseTime.toFixed(2)}ms
Total Operations: ${totalOperations}
Total Errors: ${totalErrors}
Overall Error Rate: ${(overallErrorRate * 100).toFixed(2)}%

Test Details:
${results.map(r => 
    `- ${r.testName}: ${r.statistics.average.toFixed(0)}ms avg, ${r.statistics.count} samples`
).join('\n')}
`;
    }
}

// Extend Jest matchers if in Jest environment
if (typeof expect !== 'undefined') {
    expect.extend(PerformanceTestUtils.createAssertions());
}