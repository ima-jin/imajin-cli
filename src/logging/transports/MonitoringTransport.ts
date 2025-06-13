/**
 * MonitoringTransport - Integration with monitoring systems
 * 
 * @package     @imajin/cli
 * @subpackage  logging/transports
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - Metrics collection
 * - Alert generation
 * - Performance monitoring
 */

import winston from 'winston';
import Transport from 'winston-transport';
import { LoggerConfig } from '../LoggerConfig';

export class MonitoringTransport extends Transport {
    private config: LoggerConfig;
    private metrics: {
        logCount: number;
        errorCount: number;
        lastError?: Error;
        lastErrorTime?: Date;
    };

    constructor(config: LoggerConfig) {
        super();
        this.config = config;
        this.metrics = {
            logCount: 0,
            errorCount: 0,
        };
    }

    public log(info: any, callback: () => void): void {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Update metrics
        this.metrics.logCount++;
        
        if (info.level === 'error') {
            this.metrics.errorCount++;
            this.metrics.lastError = info.error;
            this.metrics.lastErrorTime = new Date();
            
            // Check error rate threshold
            const errorRate = this.metrics.errorCount / this.metrics.logCount;
            if (errorRate > 0.1) { // 10% error rate threshold
                this.emit('alert', {
                    type: 'error_rate_threshold',
                    message: `Error rate exceeded threshold: ${errorRate * 100}%`,
                    metrics: this.metrics,
                });
            }
        }

        // Emit metrics for monitoring
        if (this.config.monitoring?.enabled) {
            this.emit('metrics', {
                service: this.config.monitoring.serviceName,
                timestamp: new Date(),
                metrics: {
                    logCount: this.metrics.logCount,
                    errorCount: this.metrics.errorCount,
                    errorRate: this.metrics.errorCount / this.metrics.logCount,
                },
            });
        }

        callback();
    }

    public getMetrics() {
        return { ...this.metrics };
    }
} 