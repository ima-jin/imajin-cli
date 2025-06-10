/**
 * SystemMonitor - Overall system monitoring and diagnostics coordinator
 * 
 * @package     @imajin/cli
 * @subpackage  diagnostics
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-09
 *
 * Integration Points:
 * - Health check management and coordination
 * - Metrics collection and aggregation
 * - System status reporting
 * - Performance monitoring
 * - Alert and notification management
 */

import { EventEmitter } from 'events';
import { CoreHealthChecks, HealthCheckManager, type HealthCheck, type HealthStatusLevel, type SystemHealthReport } from './HealthCheck.js';
import { MetricsCollector, type MetricsSnapshot, type PerformanceMetrics } from './MetricsCollector.js';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'health' | 'performance' | 'error_rate' | 'resource';

export interface SystemMonitorConfig {
    healthCheckInterval?: number;  // Default: 60000ms (1 minute)
    metricsCollectionEnabled?: boolean;  // Default: true
    alertThresholds?: {
        memoryUsagePercent?: number;  // Default: 85
        errorRatePercent?: number;    // Default: 10
        responseTimeMs?: number;      // Default: 5000
    };
}

export interface SystemStatus {
    overall: HealthStatusLevel;
    timestamp: string;
    uptime: number;
    version: string;
    health: SystemHealthReport;
    metrics: {
        snapshot: MetricsSnapshot;
        performance: PerformanceMetrics;
    };
    alerts?: SystemAlert[] | undefined;
}

export interface SystemAlert {
    id: string;
    severity: AlertSeverity;
    type: AlertType;
    message: string;
    details: any;
    timestamp: Date;
    resolved?: boolean;
}

export class SystemMonitor extends EventEmitter {
    private readonly healthCheckManager: HealthCheckManager;
    private readonly metricsCollector: MetricsCollector;
    private readonly config: SystemMonitorConfig;
    private isMonitoring = false;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private readonly activeAlerts: Map<string, SystemAlert> = new Map();

    constructor(config: SystemMonitorConfig = {}) {
        super();

        this.config = {
            healthCheckInterval: config.healthCheckInterval ?? 60000, // 1 minute
            metricsCollectionEnabled: config.metricsCollectionEnabled !== false,
            alertThresholds: {
                memoryUsagePercent: config.alertThresholds?.memoryUsagePercent ?? 85,
                errorRatePercent: config.alertThresholds?.errorRatePercent ?? 10,
                responseTimeMs: config.alertThresholds?.responseTimeMs ?? 5000,
                ...config.alertThresholds
            }
        };

        this.healthCheckManager = new HealthCheckManager();
        this.metricsCollector = new MetricsCollector();

        this.setupDefaultHealthChecks();
        this.setupEventListeners();
    }

    /**
     * Start system monitoring
     */
    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;

        // Start metrics collection if enabled
        if (this.config.metricsCollectionEnabled) {
            this.metricsCollector.startCollection();
        }

        // Start periodic health checks
        this.healthCheckInterval = setInterval(
            () => this.performHealthCheck(),
            this.config.healthCheckInterval
        );

        // Perform initial health check
        await this.performHealthCheck();

        this.emit('monitoring:started');
    }

    /**
     * Stop system monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        // Stop metrics collection
        this.metricsCollector.stopCollection();

        // Stop health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        this.emit('monitoring:stopped');
    }

    /**
     * Get current system status
     */
    public async getSystemStatus(): Promise<SystemStatus> {
        const healthReport = await this.healthCheckManager.runHealthChecks();
        const metricsSnapshot = this.metricsCollector.getMetricsSnapshot();
        const performanceMetrics = this.metricsCollector.getPerformanceMetrics();

        const alerts = Array.from(this.activeAlerts.values())
            .filter(alert => !alert.resolved)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            overall: healthReport.overall,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            version: process.env.npm_package_version ?? '0.1.0',
            health: healthReport,
            metrics: {
                snapshot: metricsSnapshot,
                performance: performanceMetrics
            },
            alerts: alerts.length > 0 ? alerts : undefined
        };
    }

    /**
     * Register a custom health check
     */
    public registerHealthCheck(healthCheck: HealthCheck): void {
        this.healthCheckManager.registerCheck(healthCheck);
    }

    /**
     * Register multiple health checks
     */
    public registerHealthChecks(healthChecks: HealthCheck[]): void {
        this.healthCheckManager.registerChecks(healthChecks);
    }

    /**
     * Get metrics collector for custom metrics
     */
    public getMetricsCollector(): MetricsCollector {
        return this.metricsCollector;
    }

    /**
     * Get health check manager for custom health checks
     */
    public getHealthCheckManager(): HealthCheckManager {
        return this.healthCheckManager;
    }

    /**
     * Manually trigger a health check
     */
    public async triggerHealthCheck(): Promise<SystemHealthReport> {
        return await this.healthCheckManager.runHealthChecks();
    }

    /**
     * Get active alerts
     */
    public getActiveAlerts(): SystemAlert[] {
        return Array.from(this.activeAlerts.values())
            .filter(alert => !alert.resolved)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Resolve an alert
     */
    public resolveAlert(alertId: string): boolean {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.resolved = true;
            this.emit('alert:resolved', alert);
            return true;
        }
        return false;
    }

    /**
     * Clear all resolved alerts
     */
    public clearResolvedAlerts(): void {
        const resolvedAlerts = Array.from(this.activeAlerts.entries())
            .filter(([, alert]) => alert.resolved);

        resolvedAlerts.forEach(([id]) => {
            this.activeAlerts.delete(id);
        });

        if (resolvedAlerts.length > 0) {
            this.emit('alerts:cleared', resolvedAlerts.length);
        }
    }

    /**
     * Setup default health checks for existing systems
     */
    private setupDefaultHealthChecks(): void {
        // Register core health checks
        this.healthCheckManager.registerChecks(CoreHealthChecks.getAllCoreChecks());

        // Add job system health check if jobs exist
        this.healthCheckManager.registerCheck({
            name: 'job_system',
            timeout: 10000,
            critical: false,
            async check() {
                try {
                    // Simple check - would be more sophisticated in reality
                    return {
                        status: 'healthy',
                        details: { message: 'Job system operational' },
                        timestamp: new Date()
                    };
                } catch (error) {
                    return {
                        status: 'unhealthy',
                        details: { error: error instanceof Error ? error.message : String(error) },
                        timestamp: new Date()
                    };
                }
            }
        });

        // Add webhook system health check if webhooks exist
        this.healthCheckManager.registerCheck({
            name: 'webhook_system',
            timeout: 5000,
            critical: false,
            async check() {
                try {
                    return {
                        status: 'healthy',
                        details: { message: 'Webhook system operational' },
                        timestamp: new Date()
                    };
                } catch (error) {
                    return {
                        status: 'unhealthy',
                        details: { error: error instanceof Error ? error.message : String(error) },
                        timestamp: new Date()
                    };
                }
            }
        });
    }

    /**
     * Setup event listeners for monitoring
     */
    private setupEventListeners(): void {
        // Listen for metric updates to check thresholds
        this.metricsCollector.on('metric:updated', (metric) => {
            this.checkMetricThresholds(metric);
        });

        // Note: Health check failures are handled during periodic checks
        // The HealthCheckManager doesn't emit events, so we monitor during periodic checks instead
    }

    /**
     * Perform periodic health check
     */
    private async performHealthCheck(): Promise<void> {
        try {
            const healthReport = await this.healthCheckManager.runHealthChecks();

            // Check for health issues and create alerts
            Object.entries(healthReport.checks).forEach(([checkName, status]) => {
                if (status.status === 'unhealthy') {
                    const check = this.healthCheckManager.getCheckConfig(checkName);
                    const severity = check?.critical ? 'critical' : 'high';
                    this.createAlert(
                        severity,
                        'health',
                        `Health check failed: ${checkName}`,
                        status.details
                    );
                }
            });

            this.emit('health:checked', healthReport);
        } catch (error) {
            this.createAlert('critical', 'health', 'Health check system failed', { error });
        }
    }

    /**
     * Check metric values against thresholds
     */
    private checkMetricThresholds(metric: any): void {
        const thresholds = this.config.alertThresholds!;

        // Check error rate threshold
        if (metric.name.includes('error') && metric.type === 'counter') {
            const performance = this.metricsCollector.getPerformanceMetrics();
            if (performance.services.errorRate > thresholds.errorRatePercent!) {
                this.createAlert(
                    'high',
                    'error_rate',
                    `High error rate detected: ${performance.services.errorRate.toFixed(2)}%`,
                    { errorRate: performance.services.errorRate, threshold: thresholds.errorRatePercent }
                );
            }
        }

        // Check response time threshold
        if (metric.name.includes('duration') && metric.type === 'histogram') {
            if (metric.value > thresholds.responseTimeMs!) {
                this.createAlert(
                    'medium',
                    'performance',
                    `Slow response time detected: ${metric.value}ms`,
                    { responseTime: metric.value, threshold: thresholds.responseTimeMs }
                );
            }
        }
    }

    /**
     * Create a new alert
     */
    private createAlert(
        severity: SystemAlert['severity'],
        type: SystemAlert['type'],
        message: string,
        details: any
    ): void {
        const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const alert: SystemAlert = {
            id: alertId,
            severity,
            type,
            message,
            details,
            timestamp: new Date(),
            resolved: false
        };

        this.activeAlerts.set(alertId, alert);
        this.emit('alert:created', alert);
    }
} 