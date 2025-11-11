/**
 * PerformanceMonitor - Real-time performance monitoring and alerting
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
 * - Real-time performance monitoring
 * - Alert system for performance degradation
 * - Historical performance tracking
 * - Integration with existing service monitoring
 */

import { EventEmitter } from 'node:events';
import {
    PerformanceTestResult,
    PerformanceThresholds,
    ResourceUsage,
    RegressionAnalysis
} from './types.js';
import { PerformanceBenchmarks } from './PerformanceBenchmarks.js';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector.js';

export interface PerformanceAlert {
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'threshold_exceeded' | 'regression_detected' | 'memory_leak' | 'error_spike';
    message: string;
    metric: string;
    currentValue: number;
    thresholdValue: number;
    testName?: string;
    recommendations: string[];
}

export interface PerformanceMonitorConfig {
    alertThresholds: PerformanceThresholds;
    monitoringInterval: number; // milliseconds
    historyRetention: number; // number of data points to keep
    enableRealTimeAlerts: boolean;
    enableRegessionDetection: boolean;
    autoBaselineUpdate: boolean;
}

/**
 * Real-time performance monitoring system
 */
export class PerformanceMonitor extends EventEmitter {
    private readonly config: PerformanceMonitorConfig;
    private benchmarks: PerformanceBenchmarks;
    private readonly metricsCollector: PerformanceMetricsCollector;
    private performanceHistory: Map<string, PerformanceTestResult[]> = new Map();
    private activeAlerts: Map<string, PerformanceAlert> = new Map();
    private monitoringTimer: NodeJS.Timeout | undefined = undefined;
    private isMonitoring: boolean = false;

    constructor(config?: Partial<PerformanceMonitorConfig>) {
        super();
        
        this.config = {
            alertThresholds: this.getDefaultThresholds(),
            monitoringInterval: 5000, // 5 seconds
            historyRetention: 100,
            enableRealTimeAlerts: true,
            enableRegessionDetection: true,
            autoBaselineUpdate: false,
            ...config
        };
        
        this.benchmarks = new PerformanceBenchmarks(this.config.alertThresholds);
        this.metricsCollector = new PerformanceMetricsCollector();
    }

    /**
     * Start performance monitoring
     */
    async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            return;
        }

        console.log('Starting performance monitoring...');
        
        this.isMonitoring = true;
        await this.metricsCollector.initialize();

        // Start periodic monitoring
        this.monitoringTimer = setInterval(() => {
            void this.performMonitoringCheck().catch(err => {
                console.error('Performance monitoring check failed:', err);
            });
        }, this.config.monitoringInterval);

        this.emit('monitoring:started');
    }

    /**
     * Stop performance monitoring
     */
    async stopMonitoring(): Promise<void> {
        if (!this.isMonitoring) {
            return;
        }

        console.log('Stopping performance monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = undefined;
        }
        
        if (this.metricsCollector.isActive()) {
            await this.metricsCollector.stop();
        }
        
        this.emit('monitoring:stopped');
    }

    /**
     * Record a performance test result
     */
    recordTestResult(result: PerformanceTestResult): void {
        // Skip recording if testName is undefined
        if (!result.testName) {
            return;
        }
        
        // Add to history
        if (!this.performanceHistory.has(result.testName)) {
            this.performanceHistory.set(result.testName, []);
        }
        
        const history = this.performanceHistory.get(result.testName)!;
        history.push(result);
        
        // Maintain history size limit
        if (history.length > this.config.historyRetention) {
            history.splice(0, history.length - this.config.historyRetention);
        }
        
        // Check for regressions
        if (this.config.enableRegessionDetection) {
            this.checkForRegressions(result);
        }
        
        // Check against thresholds
        if (this.config.enableRealTimeAlerts) {
            this.checkThresholds(result);
        }
        
        // Update baselines if enabled
        if (this.config.autoBaselineUpdate) {
            this.benchmarks.updateBenchmarkIfBetter(result);
        }
        
        this.emit('test:recorded', result);
    }

    /**
     * Get current system performance metrics
     */
    getCurrentMetrics(): ResourceUsage {
        return this.metricsCollector.getCurrentResourceUsage();
    }

    /**
     * Get performance history for a test
     */
    getTestHistory(testName: string): PerformanceTestResult[] {
        return this.performanceHistory.get(testName) || [];
    }

    /**
     * Get all active alerts
     */
    getActiveAlerts(): PerformanceAlert[] {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Get performance summary for all monitored tests
     */
    getPerformanceSummary(): {
        totalTests: number;
        averageResponseTime: number;
        totalAlerts: number;
        criticalAlerts: number;
        performanceHealth: 'excellent' | 'good' | 'warning' | 'critical';
        trends: Array<{
            testName: string;
            trend: 'improving' | 'stable' | 'degrading';
            changePercent: number;
        }>;
    } {
        const allResults = Array.from(this.performanceHistory.values()).flat();
        const totalTests = allResults.length;
        
        const averageResponseTime = totalTests > 0 
            ? allResults.reduce((sum, result) => sum + result.statistics.average, 0) / totalTests
            : 0;
        
        const totalAlerts = this.activeAlerts.size;
        const criticalAlerts = Array.from(this.activeAlerts.values())
            .filter(alert => alert.severity === 'critical').length;
        
        // Determine overall health
        let performanceHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
        if (criticalAlerts > 0) {
            performanceHealth = 'critical';
        } else if (totalAlerts > 5) {
            performanceHealth = 'warning';
        } else if (totalAlerts > 0) {
            performanceHealth = 'good';
        }
        
        // Calculate trends
        const trends = Array.from(this.performanceHistory.entries()).map(([testName, history]) => {
            if (history.length < 2) {
                return { testName, trend: 'stable' as const, changePercent: 0 };
            }
            
            const recent = history.slice(-5); // Last 5 results
            const older = history.slice(-10, -5); // Previous 5 results
            
            if (older.length === 0) {
                return { testName, trend: 'stable' as const, changePercent: 0 };
            }
            
            const recentAvg = recent.reduce((sum, r) => sum + r.statistics.average, 0) / recent.length;
            const olderAvg = older.reduce((sum, r) => sum + r.statistics.average, 0) / older.length;
            
            const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
            
            let trend: 'improving' | 'stable' | 'degrading' = 'stable';
            if (changePercent > 10) {
                trend = 'degrading';
            } else if (changePercent < -10) {
                trend = 'improving';
            }
            
            return { testName, trend, changePercent };
        });
        
        return {
            totalTests,
            averageResponseTime,
            totalAlerts,
            criticalAlerts,
            performanceHealth,
            trends
        };
    }

    /**
     * Generate performance monitoring report
     */
    generateMonitoringReport(): {
        timestamp: string;
        summary: ReturnType<PerformanceMonitor['getPerformanceSummary']>;
        alerts: PerformanceAlert[];
        systemMetrics: ResourceUsage;
        recommendations: string[];
        testHistory: Array<{
            testName: string;
            results: number;
            latestResult: PerformanceTestResult;
        }>;
    } {
        const summary = this.getPerformanceSummary();
        const alerts = this.getActiveAlerts();
        const systemMetrics = this.getCurrentMetrics();
        
        const recommendations: string[] = [];
        
        // Generate recommendations based on current state
        if (summary.criticalAlerts > 0) {
            recommendations.push('Address critical performance alerts immediately');
        }
        
        if (summary.averageResponseTime > 1000) {
            recommendations.push('Consider optimizing slow operations (avg response time > 1s)');
        }
        
        const degradingTests = summary.trends.filter(t => t.trend === 'degrading');
        if (degradingTests.length > 0) {
            recommendations.push(`Investigate performance degradation in: ${degradingTests.map(t => t.testName).join(', ')}`);
        }
        
        if (systemMetrics.memory.used > 100 * 1024 * 1024) { // 100MB
            recommendations.push('Monitor memory usage - current usage is high');
        }
        
        const testHistory = Array.from(this.performanceHistory.entries())
            .filter(([_testName, results]) => results.length > 0)
            .map(([testName, results]) => {
                const latestResult = results.at(-1);
                if (!latestResult) {
                    throw new Error('Expected latestResult to exist after length check');
                }
                return {
                    testName,
                    results: results.length,
                    latestResult
                };
            });
        
        return {
            timestamp: new Date().toISOString(),
            summary,
            alerts,
            systemMetrics,
            recommendations,
            testHistory
        };
    }

    /**
     * Clear alert by ID
     */
    clearAlert(alertId: string): boolean {
        if (this.activeAlerts.has(alertId)) {
            const alert = this.activeAlerts.get(alertId)!;
            this.activeAlerts.delete(alertId);
            this.emit('alert:cleared', alert);
            return true;
        }
        return false;
    }

    /**
     * Clear all alerts
     */
    clearAllAlerts(): void {
        const alertCount = this.activeAlerts.size;
        this.activeAlerts.clear();
        this.emit('alerts:cleared', { count: alertCount });
    }

    /**
     * Perform periodic monitoring check
     */
    private async performMonitoringCheck(): Promise<void> {
        try {
            const currentMetrics = this.getCurrentMetrics();
            
            // Check system-level thresholds
            this.checkSystemMetrics(currentMetrics);
            
            // Check for memory leaks
            this.checkMemoryLeaks();
            
            this.emit('monitoring:check', currentMetrics);
            
        } catch (error) {
            console.error('Error during monitoring check:', error);
        }
    }

    /**
     * Check for performance regressions
     */
    private checkForRegressions(result: PerformanceTestResult): void {
        // Skip if testName is undefined
        if (!result.testName) {
            return;
        }
        
        const regressions = this.benchmarks.compareAgainstBenchmark(result);
        
        for (const regression of regressions) {
            if (regression.isRegression) {
                const alertId = `regression_${result.testName}_${regression.metric}`;
                
                const alert: PerformanceAlert = {
                    id: alertId,
                    timestamp: new Date(),
                    severity: regression.severity,
                    type: 'regression_detected',
                    message: `Performance regression detected in ${result.testName}: ${regression.metric} increased by ${regression.changePercent.toFixed(1)}%`,
                    metric: regression.metric,
                    currentValue: regression.currentValue,
                    thresholdValue: regression.baselineValue,
                    testName: result.testName,
                    recommendations: this.getRecommendationsForRegression(regression)
                };
                
                this.createAlert(alert);
            }
        }
    }

    /**
     * Check performance against thresholds
     */
    private checkThresholds(result: PerformanceTestResult): void {
        // Skip if testName is undefined
        if (!result.testName) {
            return;
        }
        
        const stats = result.statistics;
        const thresholds = this.config.alertThresholds;
        
        // Check response time
        if (stats.average > thresholds.responseTime.critical) {
            this.createAlert({
                id: `response_time_critical_${result.testName}`,
                timestamp: new Date(),
                severity: 'critical',
                type: 'threshold_exceeded',
                message: `Critical response time threshold exceeded in ${result.testName}`,
                metric: 'averageResponseTime',
                currentValue: stats.average,
                thresholdValue: thresholds.responseTime.critical,
                testName: result.testName,
                recommendations: ['Investigate performance bottlenecks', 'Consider scaling resources', 'Review code optimization opportunities']
            });
        } else if (stats.average > thresholds.responseTime.warning) {
            this.createAlert({
                id: `response_time_warning_${result.testName}`,
                timestamp: new Date(),
                severity: 'medium',
                type: 'threshold_exceeded',
                message: `Response time warning threshold exceeded in ${result.testName}`,
                metric: 'averageResponseTime',
                currentValue: stats.average,
                thresholdValue: thresholds.responseTime.warning,
                testName: result.testName,
                recommendations: ['Monitor performance trends', 'Consider preemptive optimization']
            });
        }
        
        // Check error rate
        if (result.systemMetrics?.errorRate) {
            if (result.systemMetrics.errorRate > thresholds.errorRate.critical) {
                this.createAlert({
                    id: `error_rate_critical_${result.testName}`,
                    timestamp: new Date(),
                    severity: 'critical',
                    type: 'error_spike',
                    message: `Critical error rate threshold exceeded in ${result.testName}`,
                    metric: 'errorRate',
                    currentValue: result.systemMetrics.errorRate,
                    thresholdValue: thresholds.errorRate.critical,
                    testName: result.testName,
                    recommendations: ['Investigate error causes immediately', 'Check service dependencies', 'Review error handling logic']
                });
            }
        }
        
        // Check throughput
        if (result.systemMetrics?.throughput) {
            if (result.systemMetrics.throughput < thresholds.throughput.minimum) {
                this.createAlert({
                    id: `throughput_low_${result.testName}`,
                    timestamp: new Date(),
                    severity: 'high',
                    type: 'threshold_exceeded',
                    message: `Throughput below minimum threshold in ${result.testName}`,
                    metric: 'throughput',
                    currentValue: result.systemMetrics.throughput,
                    thresholdValue: thresholds.throughput.minimum,
                    testName: result.testName,
                    recommendations: ['Check for bottlenecks', 'Consider horizontal scaling', 'Review resource allocation']
                });
            }
        }
    }

    /**
     * Check system metrics against thresholds
     */
    private checkSystemMetrics(metrics: ResourceUsage): void {
        const thresholds = this.config.alertThresholds;
        
        // Check CPU usage
        if (metrics.cpu.usage > thresholds.cpuUsage.critical) {
            this.createAlert({
                id: 'system_cpu_critical',
                timestamp: new Date(),
                severity: 'critical',
                type: 'threshold_exceeded',
                message: 'System CPU usage is critically high',
                metric: 'cpuUsage',
                currentValue: metrics.cpu.usage,
                thresholdValue: thresholds.cpuUsage.critical,
                recommendations: ['Identify CPU-intensive processes', 'Consider scaling resources', 'Optimize performance-critical code']
            });
        }
        
        // Check memory usage
        const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
        if (memoryUsagePercent > 90) { // 90% memory usage
            this.createAlert({
                id: 'system_memory_critical',
                timestamp: new Date(),
                severity: 'critical',
                type: 'threshold_exceeded',
                message: 'System memory usage is critically high',
                metric: 'memoryUsage',
                currentValue: metrics.memory.used,
                thresholdValue: metrics.memory.total * 0.9,
                recommendations: ['Check for memory leaks', 'Optimize memory usage', 'Consider increasing available memory']
            });
        }
    }

    /**
     * Check for potential memory leaks
     */
    private checkMemoryLeaks(): void {
        // Simple memory leak detection based on trend analysis
        const recentMetrics = this.metricsCollector.getSamples().slice(-20); // Last 20 samples
        
        if (recentMetrics.length < 10) {
return;
}
        
        const memoryUsages = recentMetrics.map(sample => sample.memory.used);
        const trend = this.calculateTrend(memoryUsages);
        
        // If memory is consistently increasing, potential leak
        if (trend > 0.1) { // 10% growth trend
            this.createAlert({
                id: 'memory_leak_detected',
                timestamp: new Date(),
                severity: 'high',
                type: 'memory_leak',
                message: 'Potential memory leak detected - memory usage trending upward',
                metric: 'memoryGrowthTrend',
                currentValue: trend,
                thresholdValue: 0.1,
                recommendations: ['Investigate memory allocation patterns', 'Check for unreleased resources', 'Review garbage collection performance']
            });
        }
    }

    /**
     * Calculate trend from a series of values
     */
    private calculateTrend(values: number[]): number {
        if (values.length < 2) {
return 0;
}
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        return (secondAvg - firstAvg) / firstAvg;
    }

    /**
     * Create or update an alert
     */
    private createAlert(alert: PerformanceAlert): void {
        this.activeAlerts.set(alert.id, alert);
        this.emit('alert:created', alert);
        
        console.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }

    /**
     * Get recommendations for regression
     */
    private getRecommendationsForRegression(regression: RegressionAnalysis): string[] {
        const recommendations: string[] = [];
        
        switch (regression.metric) {
            case 'averageResponseTime':
            case 'maxResponseTime':
                recommendations.push(
                    'Profile the application to identify slow operations',
                    'Check for database query performance issues',
                    'Review network latency and external API calls'
                );
                break;

            case 'throughput':
                recommendations.push(
                    'Analyze system bottlenecks',
                    'Consider horizontal scaling',
                    'Review resource allocation and limits'
                );
                break;

            case 'errorRate':
                recommendations.push(
                    'Investigate error logs for root causes',
                    'Check service dependencies and external integrations',
                    'Review error handling and retry logic'
                );
                break;

            case 'memoryUsage':
                recommendations.push(
                    'Check for memory leaks',
                    'Optimize memory allocation patterns',
                    'Review garbage collection performance'
                );
                break;
        }
        
        return recommendations;
    }

    /**
     * Get default performance thresholds
     */
    private getDefaultThresholds(): PerformanceThresholds {
        return {
            responseTime: {
                warning: 1000,
                critical: 5000
            },
            throughput: {
                minimum: 10,
                warning: 50
            },
            errorRate: {
                warning: 0.05,
                critical: 0.1
            },
            memoryUsage: {
                warning: 100 * 1024 * 1024,
                critical: 500 * 1024 * 1024
            },
            cpuUsage: {
                warning: 70,
                critical: 90
            }
        };
    }
}