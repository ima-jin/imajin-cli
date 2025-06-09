/**
 * Metrics - Type definitions for performance monitoring and metrics collection
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/monitoring.md
 * 
 * Integration Points:
 * - Prometheus-style metrics collection
 * - Real-time performance monitoring
 * - LLM-friendly JSON metrics responses
 */

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricData {
    name: string;
    type: MetricType;
    value: number;
    labels: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;

    // Histogram-specific fields
    count?: number;
    sum?: number;
    buckets?: Record<string, number>;
}

export interface MetricsSnapshot {
    timestamp: Date;
    metrics: MetricData[];
    summary: {
        totalMetrics: number;
        counters: number;
        gauges: number;
        histograms: number;
    };
}

export interface PerformanceMetrics {
    timestamp: Date;
    uptime: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    eventLoop: {
        delay: number;
    };
}

export interface MetricEvent {
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
    timestamp: Date;
}

export interface ServiceMetrics {
    service: string;
    requests: {
        total: number;
        success: number;
        errors: number;
        avgDuration: number;
    };
    commands: {
        total: number;
        success: number;
        errors: number;
        avgDuration: number;
    };
    timestamp: Date;
}

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
        name: string;
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        duration: number;
    }>;
    timestamp: Date;
}

export interface AlertRule {
    name: string;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // seconds
    labels?: Record<string, string>;
    enabled: boolean;
}

export interface Alert {
    rule: string;
    metric: string;
    value: number;
    threshold: number;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
    resolved?: Date;
} 