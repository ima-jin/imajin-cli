/**
 * MetricsCollector - Performance monitoring and metrics collection
 * 
 * @package     @imajin/cli
 * @subpackage  monitoring
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/monitoring.md
 * 
 * Integration Points:
 * - Prometheus-style metrics for monitoring
 * - Real-time performance tracking
 * - LLM-friendly JSON metrics responses
 * - Service health monitoring and diagnostics
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger.js';
import type { MetricData, MetricsSnapshot, PerformanceMetrics } from '../types/Metrics.js';

export class MetricsCollector extends EventEmitter {
    private metrics: Map<string, MetricData> = new Map();
    private logger: Logger;
    private collectInterval: NodeJS.Timeout | null = null;
    private isCollecting = false;

    constructor(logger: Logger) {
        super();
        this.logger = logger;
    }

    /**
     * Start metrics collection with specified interval
     */
    public startCollection(intervalMs: number = 30000): void {
        if (this.isCollecting) {
            this.logger.warn('Metrics collection already started');
            return;
        }

        this.isCollecting = true;
        this.collectInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, intervalMs);

        this.logger.info('Started metrics collection', { intervalMs });
    }

    /**
     * Stop metrics collection
     */
    public stopCollection(): void {
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
            this.collectInterval = null;
        }
        this.isCollecting = false;
        this.logger.info('Stopped metrics collection');
    }

    /**
     * Record a counter metric
     */
    public incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);

        if (existing && existing.type === 'counter') {
            existing.value += value;
            existing.updatedAt = new Date();
        } else {
            this.metrics.set(key, {
                name,
                type: 'counter',
                value,
                labels: labels || {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        this.emit('metric:updated', { name, type: 'counter', value, labels });
    }

    /**
     * Record a gauge metric
     */
    public setGauge(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getMetricKey(name, labels);

        this.metrics.set(key, {
            name,
            type: 'gauge',
            value,
            labels: labels || {},
            createdAt: this.metrics.get(key)?.createdAt || new Date(),
            updatedAt: new Date(),
        });

        this.emit('metric:updated', { name, type: 'gauge', value, labels });
    }

    /**
     * Record a histogram metric (for tracking request durations, etc.)
     */
    public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);

        if (existing && existing.type === 'histogram') {
            // Update histogram buckets and count
            existing.count = (existing.count || 0) + 1;
            existing.sum = (existing.sum || 0) + value;
            existing.updatedAt = new Date();

            // Update buckets
            this.updateHistogramBuckets(existing, value);
        } else {
            this.metrics.set(key, {
                name,
                type: 'histogram',
                value: 0, // Not used for histograms
                count: 1,
                sum: value,
                buckets: this.createHistogramBuckets(value),
                labels: labels || {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        this.emit('metric:updated', { name, type: 'histogram', value, labels });
    }

    /**
     * Record command execution metrics
     */
    public recordCommandExecution(
        command: string,
        duration: number,
        success: boolean,
        service?: string
    ): void {
        const labels = { command, service: service || 'unknown', status: success ? 'success' : 'error' };

        this.incrementCounter('command_executions_total', 1, labels);
        this.recordHistogram('command_duration_seconds', duration / 1000, labels);

        if (!success) {
            this.incrementCounter('command_errors_total', 1, { command, service: service || 'unknown' });
        }
    }

    /**
     * Record API call metrics
     */
    public recordApiCall(
        service: string,
        endpoint: string,
        method: string,
        statusCode: number,
        duration: number
    ): void {
        const labels = {
            service,
            endpoint,
            method,
            status_code: statusCode.toString(),
            status_class: Math.floor(statusCode / 100) + 'xx'
        };

        this.incrementCounter('api_requests_total', 1, labels);
        this.recordHistogram('api_request_duration_seconds', duration / 1000, labels);

        if (statusCode >= 400) {
            this.incrementCounter('api_errors_total', 1, { service, endpoint, method });
        }
    }

    /**
     * Record job metrics
     */
    public recordJobMetrics(
        queueName: string,
        jobName: string,
        duration: number,
        success: boolean
    ): void {
        const labels = { queue: queueName, job: jobName, status: success ? 'success' : 'error' };

        this.incrementCounter('job_executions_total', 1, labels);
        this.recordHistogram('job_duration_seconds', duration / 1000, labels);

        if (!success) {
            this.incrementCounter('job_failures_total', 1, { queue: queueName, job: jobName });
        }
    }

    /**
     * Get current metrics snapshot
     */
    public getMetricsSnapshot(): MetricsSnapshot {
        const metrics = Array.from(this.metrics.values());
        const timestamp = new Date();

        return {
            timestamp,
            metrics,
            summary: {
                totalMetrics: metrics.length,
                counters: metrics.filter(m => m.type === 'counter').length,
                gauges: metrics.filter(m => m.type === 'gauge').length,
                histograms: metrics.filter(m => m.type === 'histogram').length,
            },
        };
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        const _now = Date.now();
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();

        return {
            timestamp: new Date(),
            uptime,
            memory: {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                arrayBuffers: memUsage.arrayBuffers,
            },
            cpu: process.cpuUsage(),
            eventLoop: {
                delay: this.measureEventLoopDelay(),
            },
        };
    }

    /**
     * Export metrics in Prometheus format
     */
    public exportPrometheusMetrics(): string {
        const lines: string[] = [];
        const groupedMetrics = this.groupMetricsByName();

        for (const [name, metrics] of groupedMetrics) {
            const metric = metrics[0];
            if (!metric) continue; // Prevent undefined access

            // Add help and type comments
            lines.push(`# HELP ${name} ${this.getMetricDescription(name)}`);
            lines.push(`# TYPE ${name} ${metric.type}`);

            // Add metric lines
            for (const m of metrics) {
                const labelStr = this.formatPrometheusLabels(m.labels);

                if (m.type === 'histogram') {
                    // Export histogram buckets
                    if (m.buckets) {
                        for (const [bucket, count] of Object.entries(m.buckets)) {
                            lines.push(`${name}_bucket{${labelStr}le="${bucket}"} ${count}`);
                        }
                    }
                    lines.push(`${name}_count{${labelStr}} ${m.count || 0}`);
                    lines.push(`${name}_sum{${labelStr}} ${m.sum || 0}`);
                } else {
                    lines.push(`${name}{${labelStr}} ${m.value}`);
                }
            }

            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Clear all metrics
     */
    public clearMetrics(): void {
        this.metrics.clear();
        this.logger.info('Cleared all metrics');
    }

    /**
     * Get metrics by name pattern
     */
    public getMetricsByPattern(pattern: RegExp): MetricData[] {
        return Array.from(this.metrics.values()).filter(metric =>
            pattern.test(metric.name)
        );
    }

    /**
     * Collect system metrics
     */
    private collectSystemMetrics(): void {
        const perfMetrics = this.getPerformanceMetrics();

        // Memory metrics
        this.setGauge('process_memory_rss_bytes', perfMetrics.memory.rss);
        this.setGauge('process_memory_heap_used_bytes', perfMetrics.memory.heapUsed);
        this.setGauge('process_memory_heap_total_bytes', perfMetrics.memory.heapTotal);

        // CPU metrics
        this.setGauge('process_cpu_user_seconds_total', perfMetrics.cpu.user / 1000000);
        this.setGauge('process_cpu_system_seconds_total', perfMetrics.cpu.system / 1000000);

        // Uptime
        this.setGauge('process_uptime_seconds', perfMetrics.uptime);

        // Event loop delay
        this.setGauge('nodejs_eventloop_delay_seconds', perfMetrics.eventLoop.delay / 1000);
    }

    /**
     * Generate metric key from name and labels
     */
    private getMetricKey(name: string, labels?: Record<string, string>): string {
        if (!labels || Object.keys(labels).length === 0) {
            return name;
        }

        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');

        return `${name}{${labelStr}}`;
    }

    /**
     * Create histogram buckets
     */
    private createHistogramBuckets(value: number): Record<string, number> {
        const buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
        const result: Record<string, number> = {};

        for (const bucket of buckets) {
            result[bucket.toString()] = value <= bucket ? 1 : 0;
        }
        result['+Inf'] = 1;

        return result;
    }

    /**
     * Update histogram buckets with new value
     */
    private updateHistogramBuckets(metric: MetricData, value: number): void {
        if (!metric.buckets) return;

        for (const [bucket, count] of Object.entries(metric.buckets)) {
            if (bucket === '+Inf' || value <= parseFloat(bucket)) {
                metric.buckets[bucket] = (typeof count === 'number' ? count : 0) + 1;
            }
        }
    }

    /**
     * Group metrics by name
     */
    private groupMetricsByName(): Map<string, MetricData[]> {
        const grouped = new Map<string, MetricData[]>();

        for (const metric of this.metrics.values()) {
            if (!grouped.has(metric.name)) {
                grouped.set(metric.name, []);
            }
            grouped.get(metric.name)!.push(metric);
        }

        return grouped;
    }

    /**
     * Format labels for Prometheus export
     */
    private formatPrometheusLabels(labels: Record<string, string>): string {
        const entries = Object.entries(labels);
        if (entries.length === 0) return '';

        return entries
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }

    /**
     * Get metric description
     */
    private getMetricDescription(name: string): string {
        const descriptions: Record<string, string> = {
            'command_executions_total': 'Total number of command executions',
            'command_duration_seconds': 'Duration of command executions in seconds',
            'command_errors_total': 'Total number of command errors',
            'api_requests_total': 'Total number of API requests',
            'api_request_duration_seconds': 'Duration of API requests in seconds',
            'api_errors_total': 'Total number of API errors',
            'job_executions_total': 'Total number of job executions',
            'job_duration_seconds': 'Duration of job executions in seconds',
            'job_failures_total': 'Total number of job failures',
            'process_memory_rss_bytes': 'Process resident memory size in bytes',
            'process_memory_heap_used_bytes': 'Process heap memory used in bytes',
            'process_memory_heap_total_bytes': 'Process heap memory total in bytes',
            'process_cpu_user_seconds_total': 'Process CPU user time in seconds',
            'process_cpu_system_seconds_total': 'Process CPU system time in seconds',
            'process_uptime_seconds': 'Process uptime in seconds',
            'nodejs_eventloop_delay_seconds': 'Node.js event loop delay in seconds',
        };

        return descriptions[name] || 'No description available';
    }

    /**
     * Measure event loop delay
     */
    private measureEventLoopDelay(): number {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
            this.setGauge('nodejs_eventloop_delay_ms', delay);
        });

        return 0; // Actual measurement happens asynchronously
    }
} 