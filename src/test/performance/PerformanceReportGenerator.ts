/**
 * PerformanceReportGenerator - Generate comprehensive performance test reports
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
 * - Performance test results aggregation
 * - HTML and JSON report generation
 * - Benchmark comparison visualization
 * - Trend analysis and recommendations
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    PerformanceTestResult,
    PerformanceReport,
    RegressionAnalysis
} from './types.js';
import { PerformanceBenchmarks } from './PerformanceBenchmarks.js';

export interface ReportGenerationConfig {
    outputDirectory: string;
    includeCharts: boolean;
    includeRawData: boolean;
    format: 'html' | 'json' | 'both';
    title?: string;
    description?: string;
}

/**
 * Generates comprehensive performance test reports
 */
export class PerformanceReportGenerator {
    private benchmarks: PerformanceBenchmarks;
    private config: ReportGenerationConfig;

    constructor(benchmarks: PerformanceBenchmarks, config: ReportGenerationConfig) {
        this.benchmarks = benchmarks;
        this.config = config;
        
        // Ensure output directory exists
        if (!existsSync(config.outputDirectory)) {
            mkdirSync(config.outputDirectory, { recursive: true });
        }
    }

    /**
     * Generate complete performance report
     */
    generateReport(results: PerformanceTestResult[]): PerformanceReport {
        const report: PerformanceReport = {
            timestamp: new Date().toISOString(),
            service: this.extractServiceName(results),
            version: this.extractServiceVersion(results),
            testEnvironment: process.env.NODE_ENV || 'test',
            summary: this.generateSummary(results),
            results,
            regressions: this.analyzeRegressions(results),
            recommendations: this.generateRecommendations(results)
        };

        // Save report based on format configuration
        if (this.config.format === 'json' || this.config.format === 'both') {
            this.saveJsonReport(report);
        }
        
        if (this.config.format === 'html' || this.config.format === 'both') {
            this.saveHtmlReport(report);
        }

        return report;
    }

    /**
     * Generate summary statistics
     */
    private generateSummary(results: PerformanceTestResult[]) {
        const totalTests = results.length;
        const passedTests = results.filter(r => !this.hasPerformanceIssues(r)).length;
        const failedTests = totalTests - passedTests;
        
        const allRegressions = this.analyzeRegressions(results);
        const totalRegressions = allRegressions.filter(r => r.isRegression).length;
        
        const averageResponseTime = results.length > 0 
            ? results.reduce((sum, r) => sum + r.statistics.average, 0) / results.length
            : 0;
        
        const totalDuration = results.reduce((sum, r) => sum + (r.systemMetrics?.testDuration || 0), 0);

        return {
            totalTests,
            passedTests,
            failedTests,
            totalRegressions,
            averageResponseTime,
            totalDuration
        };
    }

    /**
     * Analyze performance regressions
     */
    private analyzeRegressions(results: PerformanceTestResult[]): RegressionAnalysis[] {
        const allRegressions: RegressionAnalysis[] = [];
        
        for (const result of results) {
            const regressions = this.benchmarks.compareAgainstBenchmark(result);
            allRegressions.push(...regressions);
        }
        
        return allRegressions;
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(results: PerformanceTestResult[]): string[] {
        const recommendations: string[] = [];
        const regressions = this.analyzeRegressions(results);
        
        // Critical performance issues
        const criticalRegressions = regressions.filter(r => r.severity === 'critical');
        if (criticalRegressions.length > 0) {
            recommendations.push(`Address ${criticalRegressions.length} critical performance regressions immediately`);
        }
        
        // High error rates
        const highErrorRateTests = results.filter(r => 
            r.systemMetrics?.errorRate && r.systemMetrics.errorRate > 0.05
        );
        if (highErrorRateTests.length > 0) {
            recommendations.push(`Investigate high error rates in ${highErrorRateTests.length} tests`);
        }
        
        // Slow response times
        const slowTests = results.filter(r => r.statistics.average > 2000);
        if (slowTests.length > 0) {
            recommendations.push(`Optimize response times for ${slowTests.length} slow operations`);
        }
        
        // Low throughput
        const lowThroughputTests = results.filter(r => 
            r.systemMetrics?.throughput && r.systemMetrics.throughput < 10
        );
        if (lowThroughputTests.length > 0) {
            recommendations.push(`Improve throughput for ${lowThroughputTests.length} operations`);
        }
        
        // Memory usage concerns
        const highMemoryTests = results.filter(r => {
            const avgMemory = r.memoryUsage.length > 0 
                ? r.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) / r.memoryUsage.length
                : 0;
            return avgMemory > 100 * 1024 * 1024; // 100MB
        });
        if (highMemoryTests.length > 0) {
            recommendations.push(`Review memory usage patterns for ${highMemoryTests.length} tests`);
        }
        
        // General recommendations
        if (results.length < 10) {
            recommendations.push('Consider adding more performance tests for better coverage');
        }
        
        const benchmarkedTests = results.filter(r => r.baseline).length;
        if (benchmarkedTests < results.length * 0.5) {
            recommendations.push('Establish performance baselines for more tests');
        }
        
        return recommendations;
    }

    /**
     * Save JSON report to file
     */
    private saveJsonReport(report: PerformanceReport): void {
        const filename = `performance-report-${this.formatTimestamp(report.timestamp)}.json`;
        const filepath = join(this.config.outputDirectory, filename);
        
        writeFileSync(filepath, JSON.stringify(report, null, 2));
        console.log(`JSON report saved to: ${filepath}`);
    }

    /**
     * Save HTML report to file
     */
    private saveHtmlReport(report: PerformanceReport): void {
        const filename = `performance-report-${this.formatTimestamp(report.timestamp)}.html`;
        const filepath = join(this.config.outputDirectory, filename);
        
        const htmlContent = this.generateHtmlReport(report);
        writeFileSync(filepath, htmlContent);
        console.log(`HTML report saved to: ${filepath}`);
    }

    /**
     * Generate HTML report content
     */
    private generateHtmlReport(report: PerformanceReport): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title || 'Performance Test Report'}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>${this.config.title || 'Performance Test Report'}</h1>
            <div class="report-meta">
                <span>Service: ${report.service}</span>
                <span>Version: ${report.version}</span>
                <span>Generated: ${new Date(report.timestamp).toLocaleString()}</span>
                <span>Environment: ${report.testEnvironment}</span>
            </div>
            ${this.config.description ? `<p class="description">${this.config.description}</p>` : ''}
        </header>

        ${this.generateSummarySection(report)}
        ${this.generateTestResultsSection(report)}
        ${this.generateRegressionsSection(report)}
        ${this.generateRecommendationsSection(report)}
        ${this.config.includeRawData ? this.generateRawDataSection(report) : ''}
    </div>
    
    <script>
        ${this.getReportScripts()}
    </script>
</body>
</html>`;
    }

    /**
     * Generate summary section HTML
     */
    private generateSummarySection(report: PerformanceReport): string {
        const summary = report.summary;
        const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100).toFixed(1) : '0';
        
        return `
        <section class="summary-section">
            <h2>Test Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Tests</h3>
                    <div class="summary-value">${summary.totalTests}</div>
                </div>
                <div class="summary-card success">
                    <h3>Passed</h3>
                    <div class="summary-value">${summary.passedTests}</div>
                </div>
                <div class="summary-card ${summary.failedTests > 0 ? 'error' : ''}">
                    <h3>Failed</h3>
                    <div class="summary-value">${summary.failedTests}</div>
                </div>
                <div class="summary-card ${summary.totalRegressions > 0 ? 'warning' : ''}">
                    <h3>Regressions</h3>
                    <div class="summary-value">${summary.totalRegressions}</div>
                </div>
                <div class="summary-card">
                    <h3>Pass Rate</h3>
                    <div class="summary-value">${passRate}%</div>
                </div>
                <div class="summary-card">
                    <h3>Avg Response Time</h3>
                    <div class="summary-value">${summary.averageResponseTime.toFixed(0)}ms</div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate test results section HTML
     */
    private generateTestResultsSection(report: PerformanceReport): string {
        const testRows = report.results.map(result => {
            const hasIssues = this.hasPerformanceIssues(result);
            const statusClass = hasIssues ? 'failed' : 'passed';
            const throughput = result.systemMetrics?.throughput?.toFixed(1) || 'N/A';
            const errorRate = result.systemMetrics?.errorRate 
                ? (result.systemMetrics.errorRate * 100).toFixed(2) + '%'
                : 'N/A';
            
            return `
                <tr class="${statusClass}">
                    <td>${result.testName}</td>
                    <td>${result.statistics.average.toFixed(0)}ms</td>
                    <td>${result.statistics.p95?.toFixed(0) ?? 'N/A'}ms</td>
                    <td>${result.statistics.min.toFixed(0)}ms</td>
                    <td>${result.statistics.max.toFixed(0)}ms</td>
                    <td>${throughput} ops/sec</td>
                    <td>${errorRate}</td>
                    <td>${result.statistics.count}</td>
                    <td><span class="status-badge ${statusClass}">${hasIssues ? 'Failed' : 'Passed'}</span></td>
                </tr>`;
        }).join('');

        return `
        <section class="results-section">
            <h2>Test Results</h2>
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Avg Response</th>
                            <th>95th Percentile</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>Throughput</th>
                            <th>Error Rate</th>
                            <th>Samples</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testRows}
                    </tbody>
                </table>
            </div>
        </section>`;
    }

    /**
     * Generate regressions section HTML
     */
    private generateRegressionsSection(report: PerformanceReport): string {
        if (report.regressions.length === 0) {
            return `
            <section class="regressions-section">
                <h2>Performance Regressions</h2>
                <div class="no-issues">
                    <p>✅ No performance regressions detected</p>
                </div>
            </section>`;
        }

        const regressionRows = report.regressions
            .filter(r => r.isRegression)
            .map(regression => `
                <tr class="severity-${regression.severity}">
                    <td>${regression.testName}</td>
                    <td>${regression.metric}</td>
                    <td>${regression.currentValue.toFixed(2)}</td>
                    <td>${regression.baselineValue.toFixed(2)}</td>
                    <td>${regression.changePercent > 0 ? '+' : ''}${regression.changePercent.toFixed(1)}%</td>
                    <td><span class="severity-badge ${regression.severity}">${regression.severity}</span></td>
                </tr>`)
            .join('');

        return `
        <section class="regressions-section">
            <h2>Performance Regressions</h2>
            <div class="table-container">
                <table class="regressions-table">
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Metric</th>
                            <th>Current</th>
                            <th>Baseline</th>
                            <th>Change</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${regressionRows}
                    </tbody>
                </table>
            </div>
        </section>`;
    }

    /**
     * Generate recommendations section HTML
     */
    private generateRecommendationsSection(report: PerformanceReport): string {
        if (report.recommendations.length === 0) {
            return `
            <section class="recommendations-section">
                <h2>Recommendations</h2>
                <div class="no-issues">
                    <p>✅ No specific recommendations at this time</p>
                </div>
            </section>`;
        }

        const recommendationItems = report.recommendations
            .map(rec => `<li>${rec}</li>`)
            .join('');

        return `
        <section class="recommendations-section">
            <h2>Recommendations</h2>
            <ul class="recommendations-list">
                ${recommendationItems}
            </ul>
        </section>`;
    }

    /**
     * Generate raw data section HTML
     */
    private generateRawDataSection(report: PerformanceReport): string {
        return `
        <section class="raw-data-section">
            <h2>Raw Data</h2>
            <details>
                <summary>Show Raw JSON Data</summary>
                <pre class="raw-data">${JSON.stringify(report, null, 2)}</pre>
            </details>
        </section>`;
    }

    /**
     * Get CSS styles for the HTML report
     */
    private getReportStyles(): string {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .report-header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .report-header h1 {
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .report-meta {
            display: flex;
            gap: 20px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .description {
            color: #666;
            font-style: italic;
        }
        
        section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
        }
        
        .summary-card.success { border-left-color: #27ae60; }
        .summary-card.error { border-left-color: #e74c3c; }
        .summary-card.warning { border-left-color: #f39c12; }
        
        .summary-card h3 {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        tr.passed { background-color: #f8fff8; }
        tr.failed { background-color: #fff8f8; }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .status-badge.passed {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-badge.failed {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .severity-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .severity-badge.low { background-color: #d1ecf1; color: #0c5460; }
        .severity-badge.medium { background-color: #fff3cd; color: #856404; }
        .severity-badge.high { background-color: #f8d7da; color: #721c24; }
        .severity-badge.critical { background-color: #721c24; color: white; }
        
        .no-issues {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 16px;
        }
        
        .recommendations-list {
            list-style-type: none;
        }
        
        .recommendations-list li {
            padding: 10px 15px;
            margin-bottom: 10px;
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }
        
        .raw-data {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            font-size: 12px;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        
        details {
            margin-top: 20px;
        }
        
        summary {
            cursor: pointer;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .report-meta { flex-direction: column; gap: 10px; }
            .summary-grid { grid-template-columns: 1fr; }
        }`;
    }

    /**
     * Get JavaScript for the HTML report
     */
    private getReportScripts(): string {
        return `
        // Add interactive features if needed
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers, charts, or other interactive elements
            console.log('Performance report loaded');
        });`;
    }

    /**
     * Check if a test result has performance issues
     */
    private hasPerformanceIssues(result: PerformanceTestResult): boolean {
        // Check against baseline if available
        if (result.baseline) {
            const regressions = this.benchmarks.compareAgainstBenchmark(result);
            if (regressions.some(r => r.isRegression)) {
                return true;
            }
        }
        
        // Check against absolute thresholds
        if (result.statistics.average > 5000) {
return true;
} // 5 second response time
        if (result.systemMetrics?.errorRate && result.systemMetrics.errorRate > 0.1) {
return true;
} // 10% error rate
        if (result.systemMetrics?.throughput && result.systemMetrics.throughput < 1) {
return true;
} // Less than 1 op/sec
        
        return false;
    }

    /**
     * Extract service name from results
     */
    private extractServiceName(results: PerformanceTestResult[]): string {
        // Try to extract from test names
        const testNames = results.map(r => r.testName);
        const commonPrefixes = ['stripe', 'contentful', 'cloudinary'];
        
        for (const prefix of commonPrefixes) {
            if (testNames.some(name => name?.toLowerCase().includes(prefix))) {
                return prefix;
            }
        }
        
        return 'unknown-service';
    }

    /**
     * Extract service version from results
     */
    private extractServiceVersion(_results: PerformanceTestResult[]): string {
        // In a real implementation, this would be extracted from service metadata
        return '1.0.0';
    }

    /**
     * Format timestamp for filename
     */
    private formatTimestamp(timestamp: string): string {
        return new Date(timestamp)
            .toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0] || '';
    }
}