/**
 * MetricsCollector Tests
 *
 * Comprehensive test suite for metrics collection system covering counter,
 * gauge, and histogram metrics, command execution tracking, service provider
 * metrics, and performance monitoring.
 *
 * @package     @imajin/cli
 * @subpackage  diagnostics/__tests__
 */

import { MetricsCollector } from '../MetricsCollector.js';

describe('MetricsCollector', () => {
    let collector: MetricsCollector;

    beforeEach(() => {
        collector = new MetricsCollector();
    });

    afterEach(() => {
        collector.removeAllListeners();
    });

    // =====================================================================
    // Collection Management
    // =====================================================================
    describe('Collection Management', () => {
        it('should start metrics collection', () => {
            let started = false;
            collector.on('collection:started', () => {
                started = true;
            });

            collector.startCollection();

            expect(started).toBe(true);
        });

        it('should stop metrics collection', () => {
            let stopped = false;
            collector.on('collection:stopped', () => {
                stopped = true;
            });

            collector.startCollection();
            collector.stopCollection();

            expect(stopped).toBe(true);
        });

        it('should not start collection twice', () => {
            let startCount = 0;
            collector.on('collection:started', () => {
                startCount++;
            });

            collector.startCollection();
            collector.startCollection();

            expect(startCount).toBe(1);
        });
    });

    // =====================================================================
    // Counter Metrics
    // =====================================================================
    describe('Counter Metrics', () => {
        it('should increment counter', () => {
            collector.incrementCounter('test_counter', 1);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'test_counter');

            expect(metric).toBeDefined();
            expect(metric?.type).toBe('counter');
            expect(metric?.value).toBe(1);
        });

        it('should increment counter with custom value', () => {
            collector.incrementCounter('test_counter', 5);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'test_counter');

            expect(metric?.value).toBe(5);
        });

        it('should accumulate counter increments', () => {
            collector.incrementCounter('test_counter', 1);
            collector.incrementCounter('test_counter', 2);
            collector.incrementCounter('test_counter', 3);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'test_counter');

            expect(metric?.value).toBe(6);
        });

        it('should support counter with labels', () => {
            collector.incrementCounter('http_requests', 1, { method: 'GET', status: '200' });
            collector.incrementCounter('http_requests', 1, { method: 'POST', status: '200' });

            const snapshot = collector.getMetricsSnapshot();
            const metrics = snapshot.metrics.filter(m => m.name === 'http_requests');

            expect(metrics).toHaveLength(2);
        });

        it('should emit metric:updated event for counter', () => {
            let eventData: any = null;
            collector.on('metric:updated', (data) => {
                eventData = data;
            });

            collector.incrementCounter('test_counter', 1, { env: 'test' });

            expect(eventData).toMatchObject({
                name: 'test_counter',
                type: 'counter',
                value: 1,
                labels: { env: 'test' }
            });
        });

        it('should update timestamp on counter increment', () => {
            collector.incrementCounter('test_counter', 1);

            const firstSnapshot = collector.getMetricsSnapshot();
            const firstMetric = firstSnapshot.metrics.find(m => m.name === 'test_counter');
            const firstTimestamp = firstMetric?.timestamp;

            // Small delay
            const now = Date.now();
            while (Date.now() - now < 10) {
                // Wait
            }

            collector.incrementCounter('test_counter', 1);

            const secondSnapshot = collector.getMetricsSnapshot();
            const secondMetric = secondSnapshot.metrics.find(m => m.name === 'test_counter');

            expect(secondMetric?.timestamp.getTime()).toBeGreaterThan(firstTimestamp!.getTime());
        });
    });

    // =====================================================================
    // Gauge Metrics
    // =====================================================================
    describe('Gauge Metrics', () => {
        it('should set gauge value', () => {
            collector.setGauge('memory_usage', 1024);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'memory_usage');

            expect(metric).toBeDefined();
            expect(metric?.type).toBe('gauge');
            expect(metric?.value).toBe(1024);
        });

        it('should overwrite gauge value', () => {
            collector.setGauge('temperature', 20);
            collector.setGauge('temperature', 25);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'temperature');

            expect(metric?.value).toBe(25);
        });

        it('should support gauge with labels', () => {
            collector.setGauge('cpu_usage', 45, { core: '0' });
            collector.setGauge('cpu_usage', 50, { core: '1' });

            const snapshot = collector.getMetricsSnapshot();
            const metrics = snapshot.metrics.filter(m => m.name === 'cpu_usage');

            expect(metrics).toHaveLength(2);
        });

        it('should emit metric:updated event for gauge', () => {
            let eventData: any = null;
            collector.on('metric:updated', (data) => {
                eventData = data;
            });

            collector.setGauge('disk_space', 500, { mount: '/' });

            expect(eventData).toMatchObject({
                name: 'disk_space',
                type: 'gauge',
                value: 500,
                labels: { mount: '/' }
            });
        });
    });

    // =====================================================================
    // Histogram Metrics
    // =====================================================================
    describe('Histogram Metrics', () => {
        it('should record histogram value', () => {
            collector.recordHistogram('request_duration', 100);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'request_duration');

            expect(metric).toBeDefined();
            expect(metric?.type).toBe('histogram');
            expect(metric?.value).toBe(100);
            expect(metric?.count).toBe(1);
            expect(metric?.sum).toBe(100);
        });

        it('should calculate histogram average', () => {
            collector.recordHistogram('response_time', 100);
            collector.recordHistogram('response_time', 200);
            collector.recordHistogram('response_time', 300);

            const snapshot = collector.getMetricsSnapshot();
            const metric = snapshot.metrics.find(m => m.name === 'response_time');

            expect(metric?.count).toBe(3);
            expect(metric?.sum).toBe(600);
            expect(metric?.value).toBe(200); // Average
        });

        it('should support histogram with labels', () => {
            collector.recordHistogram('api_latency', 50, { endpoint: '/users' });
            collector.recordHistogram('api_latency', 75, { endpoint: '/posts' });

            const snapshot = collector.getMetricsSnapshot();
            const metrics = snapshot.metrics.filter(m => m.name === 'api_latency');

            expect(metrics).toHaveLength(2);
        });

        it('should emit metric:updated event for histogram', () => {
            let eventData: any = null;
            collector.on('metric:updated', (data) => {
                eventData = data;
            });

            collector.recordHistogram('query_time', 150, { db: 'postgres' });

            expect(eventData).toMatchObject({
                name: 'query_time',
                type: 'histogram',
                value: 150,
                labels: { db: 'postgres' }
            });
        });
    });

    // =====================================================================
    // Command Execution Metrics
    // =====================================================================
    describe('Command Execution Metrics', () => {
        it('should record successful command execution', () => {
            collector.recordCommandExecution('test:run', 1500, true);

            const snapshot = collector.getMetricsSnapshot();
            const totalMetric = snapshot.metrics.find(
                m => m.name === 'commands_total' && m.labels.command === 'test:run'
            );

            expect(totalMetric).toBeDefined();
            expect(totalMetric?.value).toBe(1);
        });

        it('should record command duration', () => {
            collector.recordCommandExecution('build', 3000, true);

            const snapshot = collector.getMetricsSnapshot();
            const durationMetric = snapshot.metrics.find(
                m => m.name === 'command_duration_ms' && m.labels.command === 'build'
            );

            expect(durationMetric).toBeDefined();
            expect(durationMetric?.value).toBe(3000);
        });

        it('should record command errors', () => {
            collector.recordCommandExecution('failing:command', 1000, false);

            const snapshot = collector.getMetricsSnapshot();
            const errorMetric = snapshot.metrics.find(
                m => m.name === 'command_errors_total' && m.labels.command === 'failing:command'
            );

            expect(errorMetric).toBeDefined();
            expect(errorMetric?.value).toBe(1);
        });

        it('should track multiple command executions', () => {
            collector.recordCommandExecution('test', 100, true);
            collector.recordCommandExecution('test', 150, true);
            collector.recordCommandExecution('test', 120, false);

            const snapshot = collector.getMetricsSnapshot();
            const totalMetrics = snapshot.metrics.filter(
                m => m.name === 'commands_total' && m.labels.command === 'test'
            );

            const totalCount = totalMetrics.reduce((sum, m) => sum + m.value, 0);
            expect(totalCount).toBeGreaterThanOrEqual(3);
        });
    });

    // =====================================================================
    // Service Provider Metrics
    // =====================================================================
    describe('Service Provider Metrics', () => {
        it('should record service provider action', () => {
            collector.recordServiceProviderAction('stripe', 'createCustomer', 500, true);

            const snapshot = collector.getMetricsSnapshot();
            const actionMetric = snapshot.metrics.find(
                m => m.name === 'provider_actions_total' &&
                    m.labels.provider === 'stripe' &&
                    m.labels.action === 'createCustomer'
            );

            expect(actionMetric).toBeDefined();
            expect(actionMetric?.value).toBe(1);
        });

        it('should record provider action duration', () => {
            collector.recordServiceProviderAction('contentful', 'fetchEntries', 250, true);

            const snapshot = collector.getMetricsSnapshot();
            const durationMetric = snapshot.metrics.find(
                m => m.name === 'provider_action_duration_ms' &&
                    m.labels.provider === 'contentful'
            );

            expect(durationMetric).toBeDefined();
            expect(durationMetric?.value).toBe(250);
        });

        it('should record provider errors', () => {
            collector.recordServiceProviderAction('api', 'getData', 1000, false);

            const snapshot = collector.getMetricsSnapshot();
            const errorMetric = snapshot.metrics.find(
                m => m.name === 'provider_errors_total' && m.labels.provider === 'api'
            );

            expect(errorMetric).toBeDefined();
            expect(errorMetric?.value).toBe(1);
        });

        it('should track multiple provider actions', () => {
            collector.recordServiceProviderAction('stripe', 'charge', 100, true);
            collector.recordServiceProviderAction('stripe', 'refund', 150, true);
            collector.recordServiceProviderAction('stripe', 'charge', 120, false);

            const snapshot = collector.getMetricsSnapshot();
            const actions = snapshot.metrics.filter(m => m.labels.provider === 'stripe');

            expect(actions.length).toBeGreaterThan(0);
        });
    });

    // =====================================================================
    // Metrics Snapshot
    // =====================================================================
    describe('Metrics Snapshot', () => {
        it('should return metrics snapshot', () => {
            collector.incrementCounter('test_counter');
            collector.setGauge('test_gauge', 100);
            collector.recordHistogram('test_histogram', 50);

            const snapshot = collector.getMetricsSnapshot();

            expect(snapshot.timestamp).toBeDefined();
            expect(snapshot.metrics).toHaveLength(3);
            expect(snapshot.summary.counters).toBe(1);
            expect(snapshot.summary.gauges).toBe(1);
            expect(snapshot.summary.histograms).toBe(1);
            expect(snapshot.summary.total).toBe(3);
        });

        it('should include timestamp in snapshot', () => {
            const snapshot = collector.getMetricsSnapshot();

            expect(typeof snapshot.timestamp).toBe('string');
            expect(new Date(snapshot.timestamp).getTime()).not.toBeNaN();
        });

        it('should include summary statistics', () => {
            collector.incrementCounter('c1');
            collector.incrementCounter('c2');
            collector.setGauge('g1', 10);
            collector.recordHistogram('h1', 20);

            const snapshot = collector.getMetricsSnapshot();

            expect(snapshot.summary).toMatchObject({
                counters: 2,
                gauges: 1,
                histograms: 1,
                total: 4
            });
        });
    });

    // =====================================================================
    // Performance Metrics
    // =====================================================================
    describe('Performance Metrics', () => {
        it('should get performance metrics', () => {
            const metrics = collector.getPerformanceMetrics();

            expect(metrics).toBeDefined();
            expect(metrics.memory).toBeDefined();
            expect(metrics.process).toBeDefined();
            expect(metrics.commands).toBeDefined();
            expect(metrics.services).toBeDefined();
        });

        it('should include memory metrics', () => {
            const metrics = collector.getPerformanceMetrics();

            expect(metrics.memory.used).toBeGreaterThan(0);
            expect(metrics.memory.total).toBeGreaterThan(0);
            expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
            expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
        });

        it('should include process metrics', () => {
            const metrics = collector.getPerformanceMetrics();

            expect(metrics.process.uptime).toBeGreaterThanOrEqual(0);
            expect(metrics.process.pid).toBeGreaterThan(0);
            expect(typeof metrics.process.platform).toBe('string');
        });

        it('should include command metrics', () => {
            collector.recordCommandExecution('test', 100, true);

            const metrics = collector.getPerformanceMetrics();

            expect(metrics.commands.totalExecutions).toBeGreaterThanOrEqual(0);
            expect(metrics.commands.successRate).toBeGreaterThanOrEqual(0);
            expect(metrics.commands.avgDuration).toBeGreaterThanOrEqual(0);
        });

        it('should include service metrics', () => {
            const metrics = collector.getPerformanceMetrics();

            expect(metrics.services.activeConnections).toBeGreaterThanOrEqual(0);
            expect(metrics.services.totalApiCalls).toBeGreaterThanOrEqual(0);
            expect(metrics.services.errorRate).toBeGreaterThanOrEqual(0);
        });
    });

    // =====================================================================
    // Metrics Clearing
    // =====================================================================
    describe('Metrics Clearing', () => {
        it('should clear all metrics', () => {
            collector.incrementCounter('test_counter');
            collector.setGauge('test_gauge', 100);

            collector.clearMetrics();

            const snapshot = collector.getMetricsSnapshot();
            expect(snapshot.metrics).toHaveLength(0);
        });

        it('should emit metrics:cleared event', () => {
            let cleared = false;
            collector.on('metrics:cleared', () => {
                cleared = true;
            });

            collector.clearMetrics();

            expect(cleared).toBe(true);
        });
    });

    // =====================================================================
    // Pattern Matching
    // =====================================================================
    describe('Pattern Matching', () => {
        it('should get metrics by pattern', () => {
            collector.incrementCounter('http_requests_total');
            collector.incrementCounter('http_errors_total');
            collector.incrementCounter('db_queries_total');

            const httpMetrics = collector.getMetricsByPattern(/^http_/);

            expect(httpMetrics).toHaveLength(2);
            expect(httpMetrics.every(m => m.name.startsWith('http_'))).toBe(true);
        });

        it('should return empty array for no matches', () => {
            collector.incrementCounter('test_counter');

            const metrics = collector.getMetricsByPattern(/^nonexistent_/);

            expect(metrics).toHaveLength(0);
        });
    });

    // =====================================================================
    // Metrics Export
    // =====================================================================
    describe('Metrics Export', () => {
        it('should export metrics in JSON format', () => {
            collector.incrementCounter('exported_counter', 5);
            collector.setGauge('exported_gauge', 10);

            const exported = collector.exportMetrics();

            expect(exported).toHaveProperty('timestamp');
            expect(exported).toHaveProperty('summary');
            expect(exported).toHaveProperty('performance');
            expect(exported).toHaveProperty('metrics');
        });

        it('should include all metric details in export', () => {
            collector.recordHistogram('test_histogram', 100);

            const exported = collector.exportMetrics();
            const metricKeys = Object.keys(exported.metrics);

            expect(metricKeys.length).toBeGreaterThan(0);
        });

        it('should include performance data in export', () => {
            const exported = collector.exportMetrics();

            expect(exported.performance).toHaveProperty('memory');
            expect(exported.performance).toHaveProperty('process');
            expect(exported.performance).toHaveProperty('commands');
            expect(exported.performance).toHaveProperty('services');
        });
    });
});
