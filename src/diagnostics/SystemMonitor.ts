/**
 * SystemMonitor - Core system monitoring and diagnostics
 * 
 * @package     @imajin/cli
 * @subpackage  diagnostics
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-13
 *
 * Integration Points:
 * - Health check system
 * - Metrics collection
 * - Basic system diagnostics
 */

import { EventEmitter } from 'events';
import { HealthCheckManager, SystemHealthReport } from './HealthCheck';
import { MetricsCollector, PerformanceMetrics } from './MetricsCollector';

export interface SystemStatus {
    health: SystemHealthReport;
    metrics: PerformanceMetrics;
    timestamp: string;
}

export class SystemMonitor extends EventEmitter {
    private readonly healthManager: HealthCheckManager;
    private readonly metricsCollector: MetricsCollector;
    private isMonitoring = false;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.healthManager = new HealthCheckManager();
        this.metricsCollector = new MetricsCollector();
    }

    /**
     * Start system monitoring
     */
    public startMonitoring(intervalMs: number = 60000): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.metricsCollector.startCollection();
        this.emit('monitoring:started');

        // Run initial health check
        this.runHealthCheck();

        // Set up periodic monitoring
        this.monitorInterval = setInterval(() => {
            this.runHealthCheck();
        }, intervalMs);
    }

    /**
     * Stop system monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        this.metricsCollector.stopCollection();
        
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        this.emit('monitoring:stopped');
    }

    /**
     * Run health check and collect metrics
     */
    public async runHealthCheck(): Promise<SystemStatus> {
        const health = await this.healthManager.runHealthChecks();
        const metrics = this.metricsCollector.getPerformanceMetrics();

        const status: SystemStatus = {
            health,
            metrics,
            timestamp: new Date().toISOString()
        };

        this.emit('status:updated', status);
        return status;
    }

    /**
     * Get current system status
     */
    public getCurrentStatus(): SystemStatus | null {
        const health = this.healthManager.getLastReport();
        if (!health) {
            return null;
        }

        return {
            health,
            metrics: this.metricsCollector.getPerformanceMetrics(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Check if monitoring is active
     */
    public isActive(): boolean {
        return this.isMonitoring;
    }

    /**
     * Get health check manager
     */
    public getHealthManager(): HealthCheckManager {
        return this.healthManager;
    }

    /**
     * Get metrics collector
     */
    public getMetricsCollector(): MetricsCollector {
        return this.metricsCollector;
    }

    /**
     * Get comprehensive system status (for StatusCommand compatibility)
     */
    public async getSystemStatus(): Promise<any> {
        const health = await this.healthManager.runHealthChecks();
        const metrics = this.metricsCollector.getPerformanceMetrics();

        return {
            overall: health.overall,
            uptime: health.uptime,
            version: health.version,
            health: {
                checks: health.checks
            },
            metrics: {
                performance: metrics
            },
            timestamp: new Date().toISOString()
        };
    }
} 