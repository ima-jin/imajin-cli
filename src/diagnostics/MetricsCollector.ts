/**
 * MetricsCollector - Simplified performance monitoring and metrics collection
 * 
 * @package     @imajin/cli
 * @subpackage  diagnostics
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-18
 *
 * Integration Points:
 * - Command execution metrics
 * - Service provider metrics
 * - Basic system performance monitoring
 */

import { EventEmitter } from 'events';

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricData {
    name: string;
    type: MetricType;
    value: number;
    labels: Record<string, string>;
    timestamp: Date;
    count?: number;
    sum?: number;
}

export interface MetricsSnapshot {
    timestamp: string;
    metrics: MetricData[];
    summary: {
        counters: number;
        gauges: number;
        histograms: number;
        total: number;
    };
}

export interface PerformanceMetrics {
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    process: {
        uptime: number;
        pid: number;
        platform: string;
    };
    commands: {
        totalExecutions: number;
        successRate: number;
        avgDuration: number;
    };
    services: {
        activeConnections: number;
        totalApiCalls: number;
        errorRate: number;
    };
}

export class MetricsCollector extends EventEmitter {
    private readonly metrics: Map<string, MetricData> = new Map();
    private isCollecting = false;

    constructor() {
        super();
    }

    /**
     * Start basic metrics collection
     */
    public startCollection(): void {
        if (this.isCollecting) {
            return;
        }
        this.isCollecting = true;
        this.emit('collection:started');
    }

    /**
     * Stop metrics collection
     */
    public stopCollection(): void {
        this.isCollecting = false;
        this.emit('collection:stopped');
    }

    /**
     * Record a counter metric (incremental values)
     */
    public incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);

        if (existing && existing.type === 'counter') {
            existing.value += value;
            existing.timestamp = new Date();
        } else {
            this.metrics.set(key, {
                name,
                type: 'counter',
                value,
                labels,
                timestamp: new Date(),
            });
        }

        this.emit('metric:updated', { name, type: 'counter', value, labels });
    }

    /**
     * Record a gauge metric (absolute values)
     */
    public setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        const key = this.getMetricKey(name, labels);

        this.metrics.set(key, {
            name,
            type: 'gauge',
            value,
            labels,
            timestamp: new Date(),
        });

        this.emit('metric:updated', { name, type: 'gauge', value, labels });
    }

    /**
     * Record a histogram metric (for durations, sizes, etc.)
     */
    public recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);

        if (existing && existing.type === 'histogram') {
            existing.count = (existing.count ?? 0) + 1;
            existing.sum = (existing.sum ?? 0) + value;
            existing.value = existing.sum / existing.count; // Average
            existing.timestamp = new Date();
        } else {
            this.metrics.set(key, {
                name,
                type: 'histogram',
                value,
                count: 1,
                sum: value,
                labels,
                timestamp: new Date(),
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
        success: boolean
    ): void {
        const labels = {
            command,
            status: success ? 'success' : 'error'
        };

        this.incrementCounter('commands_total', 1, labels);
        this.recordHistogram('command_duration_ms', duration, labels);

        if (!success) {
            this.incrementCounter('command_errors_total', 1, { command });
        }
    }

    /**
     * Record service provider metrics
     */
    public recordServiceProviderAction(
        provider: string,
        action: string,
        duration: number,
        success: boolean
    ): void {
        const labels = {
            provider,
            action,
            status: success ? 'success' : 'error'
        };

        this.incrementCounter('provider_actions_total', 1, labels);
        this.recordHistogram('provider_action_duration_ms', duration, labels);

        if (!success) {
            this.incrementCounter('provider_errors_total', 1, { provider, action });
        }
    }

    /**
     * Get current metrics snapshot
     */
    public getMetricsSnapshot(): MetricsSnapshot {
        const metrics = Array.from(this.metrics.values());
        const counters = metrics.filter(m => m.type === 'counter').length;
        const gauges = metrics.filter(m => m.type === 'gauge').length;
        const histograms = metrics.filter(m => m.type === 'histogram').length;

        return {
            timestamp: new Date().toISOString(),
            metrics,
            summary: {
                counters,
                gauges,
                histograms,
                total: metrics.length
            }
        };
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        const memUsage = process.memoryUsage();
        const commandMetrics = this.getCommandMetrics();
        const serviceMetrics = this.getServiceMetrics();

        return {
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
            },
            process: {
                uptime: process.uptime(),
                pid: process.pid,
                platform: process.platform
            },
            commands: commandMetrics,
            services: serviceMetrics
        };
    }

    /**
     * Clear all metrics
     */
    public clearMetrics(): void {
        this.metrics.clear();
        this.emit('metrics:cleared');
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
     * Export metrics in simple JSON format
     */
    public exportMetrics(): any {
        const snapshot = this.getMetricsSnapshot();
        const performance = this.getPerformanceMetrics();

        return {
            timestamp: snapshot.timestamp,
            summary: snapshot.summary,
            performance,
            metrics: snapshot.metrics.reduce((acc, metric) => {
                const key = this.getMetricKey(metric.name, metric.labels);
                acc[key] = {
                    value: metric.value,
                    type: metric.type,
                    timestamp: metric.timestamp,
                    ...(metric.count && { count: metric.count }),
                    ...(metric.sum && { sum: metric.sum })
                };
                return acc;
            }, {} as any)
        };
    }

    private getCommandMetrics() {
        const commandMetrics = this.getMetricsByPattern(/^commands_/);
        const totalExecutions = commandMetrics
            .filter(m => m.name === 'commands_total')
            .reduce((sum, m) => sum + m.value, 0);
        
        const errors = commandMetrics
            .filter(m => m.name === 'command_errors_total')
            .reduce((sum, m) => sum + m.value, 0);

        const durations = commandMetrics
            .filter(m => m.name === 'command_duration_ms')
            .map(m => m.value);

        return {
            totalExecutions,
            successRate: totalExecutions > 0 ? (totalExecutions - errors) / totalExecutions : 1,
            avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0
        };
    }

    private getServiceMetrics() {
        const serviceMetrics = this.getMetricsByPattern(/^provider_/);
        const totalCalls = serviceMetrics
            .filter(m => m.name === 'provider_actions_total')
            .reduce((sum, m) => sum + m.value, 0);
        
        const errors = serviceMetrics
            .filter(m => m.name === 'provider_errors_total')
            .reduce((sum, m) => sum + m.value, 0);

        return {
            activeConnections: 0, // Simplified for now
            totalApiCalls: totalCalls,
            errorRate: totalCalls > 0 ? errors / totalCalls : 0
        };
    }

    /**
     * Generate a unique key for a metric with labels
     */
    private getMetricKey(name: string, labels: Record<string, string>): string {
        const labelString = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');

        return labelString ? `${name}{${labelString}}` : name;
    }
} 