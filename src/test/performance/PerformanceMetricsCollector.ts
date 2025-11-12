/**
 * PerformanceMetricsCollector - System for collecting performance metrics
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
 * - Node.js process metrics
 * - System resource monitoring
 * - Custom metric collection
 */

import * as os from 'node:os';
import {
    SystemMetrics,
    ResourceUsage,
    PerformanceMonitoringConfig
} from './types.js';

/**
 * Collects system and application performance metrics during tests
 */
export class PerformanceMetricsCollector {
    private isCollecting: boolean = false;
    private collectionInterval?: NodeJS.Timeout;
    private startTime?: number;
    private testName?: string;
    
    private config: PerformanceMonitoringConfig = {
        collectSystemMetrics: true,
        collectMemoryMetrics: true,
        collectCustomMetrics: true,
        samplingInterval: 1000, // 1 second
        maxSamples: 1000
    };
    
    private samples: ResourceUsage[] = [];
    private customMetrics: Record<string, number[]> = {};
    private operationCounts: Record<string, number> = {};
    private errorCounts: Record<string, number> = {};

    constructor(config?: Partial<PerformanceMonitoringConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Initialize the metrics collector
     */
    async initialize(): Promise<void> {
        console.log('Initializing performance metrics collector...');
        
        // Clear any existing data
        this.samples = [];
        this.customMetrics = {};
        this.operationCounts = {};
        this.errorCounts = {};
        
        console.log('Performance metrics collector initialized');
    }

    /**
     * Start collecting metrics for a test
     */
    async startCollection(testName: string): Promise<void> {
        if (this.isCollecting) {
            await this.stopCollection();
        }
        
        this.testName = testName;
        this.startTime = Date.now();
        this.isCollecting = true;
        
        console.log(`Starting metrics collection for test: ${testName}`);
        
        // Start periodic sampling
        this.collectionInterval = setInterval(() => {
            this.collectSample();
        }, this.config.samplingInterval);
        
        // Collect initial sample
        this.collectSample();
    }

    /**
     * Stop collecting metrics and return final system metrics
     */
    async stopCollection(): Promise<SystemMetrics> {
        if (!this.isCollecting) {
            throw new Error('Metrics collection is not active');
        }
        
        this.isCollecting = false;
        
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null as any;
        }
        
        // Collect final sample
        this.collectSample();
        
        const endTime = Date.now();
        const duration = this.startTime ? endTime - this.startTime : 0;
        
        console.log(`Stopped metrics collection for test: ${this.testName}`);
        console.log(`  Collected ${this.samples.length} samples over ${duration}ms`);
        
        // Calculate final metrics
        const systemMetrics = this.calculateSystemMetrics(duration);
        
        return systemMetrics;
    }

    /**
     * Record a custom metric value
     */
    recordCustomMetric(name: string, value: number): void {
        if (!this.config.collectCustomMetrics) {
return;
}

        this.customMetrics[name] ??= [];
        
        this.customMetrics[name].push(value);
        
        // Limit samples to prevent memory issues
        if (this.customMetrics[name].length > this.config.maxSamples) {
            this.customMetrics[name] = this.customMetrics[name].slice(-this.config.maxSamples);
        }
    }

    /**
     * Record an operation completion
     */
    recordOperation(operationName: string, success: boolean = true): void {
        if (!this.operationCounts[operationName]) {
            this.operationCounts[operationName] = 0;
        }
        this.operationCounts[operationName]++;
        
        if (!success) {
            if (!this.errorCounts[operationName]) {
                this.errorCounts[operationName] = 0;
            }
            this.errorCounts[operationName]++;
        }
    }

    /**
     * Get current resource usage
     */
    getCurrentResourceUsage(): ResourceUsage {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            timestamp: new Date(),
            cpu: {
                usage: this.calculateCpuUsage(cpuUsage),
                load: this.getSystemLoad()
            },
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                free: memoryUsage.heapTotal - memoryUsage.heapUsed,
                buffers: memoryUsage.external
            }
        };
    }

    /**
     * Get collected samples
     */
    getSamples(): ResourceUsage[] {
        return [...this.samples];
    }

    /**
     * Get custom metrics
     */
    getCustomMetrics(): Record<string, number[]> {
        return { ...this.customMetrics };
    }

    /**
     * Get operation statistics
     */
    getOperationStats(): { operations: Record<string, number>; errors: Record<string, number> } {
        return {
            operations: { ...this.operationCounts },
            errors: { ...this.errorCounts }
        };
    }

    /**
     * Collect a single resource usage sample
     */
    private collectSample(): void {
        if (!this.isCollecting) {
return;
}
        
        try {
            const sample = this.getCurrentResourceUsage();
            this.samples.push(sample);
            
            // Limit samples to prevent memory issues
            if (this.samples.length > this.config.maxSamples) {
                this.samples = this.samples.slice(-this.config.maxSamples);
            }
            
        } catch (error) {
            console.warn('Failed to collect performance sample:', error);
        }
    }

    /**
     * Calculate final system metrics from collected samples
     */
    private calculateSystemMetrics(duration: number): SystemMetrics {
        const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
        const totalErrors = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
        
        // Calculate averages from samples
        let avgCpuUsage = 0;
        let avgMemoryUsage = 0;
        
        if (this.samples.length > 0) {
            avgCpuUsage = this.samples.reduce((sum, sample) => sum + sample.cpu.usage, 0) / this.samples.length;
            avgMemoryUsage = this.samples.reduce((sum, sample) => sum + sample.memory.used, 0) / this.samples.length;
        }
        
        const systemMetrics: SystemMetrics = {
            throughput: duration > 0 ? (totalOperations / duration) * 1000 : 0, // ops per second
            errorRate: totalOperations > 0 ? totalErrors / totalOperations : 0,
            concurrentUsers: 1, // Will be overridden by load test runner
            totalOperations,
            totalErrors,
            testDuration: duration,
            cpuUsage: avgCpuUsage,
            memoryUsage: avgMemoryUsage
        };
        
        return systemMetrics;
    }

    /**
     * Calculate CPU usage percentage from process.cpuUsage()
     */
    private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
        // This is a simplified calculation
        // In a real implementation, you'd compare with previous measurements
        const totalCpuTime = cpuUsage.user + cpuUsage.system;
        
        // Convert microseconds to percentage (simplified)
        // This would need to be calculated relative to sampling interval
        return Math.min(100, (totalCpuTime / (this.config.samplingInterval * 1000)) * 100);
    }

    /**
     * Get system load average (simplified for cross-platform compatibility)
     */
    private getSystemLoad(): number[] {
        try {
            // Node.js os.loadavg() returns load averages for 1, 5, and 15 minutes
            return os.loadavg ? os.loadavg() : [0, 0, 0];
        } catch (error) {
            // Load average not available on this platform - return zeros
            return [0, 0, 0];
        }
    }

    /**
     * Generate performance report from collected data
     */
    generateReport(): {
        testName?: string;
        duration: number;
        samples: number;
        averageMetrics: {
            cpuUsage: number;
            memoryUsage: number;
            customMetrics: Record<string, { average: number; min: number; max: number }>;
        };
        operations: Record<string, number>;
        errors: Record<string, number>;
        resourceUsage: {
            peak: ResourceUsage;
            average: ResourceUsage;
            timeline: ResourceUsage[];
        };
    } {
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        
        // Calculate peak and average resource usage
        let peakMemoryUsage = 0;
        let peakCpuUsage = 0;
        let totalMemoryUsage = 0;
        let totalCpuUsage = 0;
        
        let peakSample: ResourceUsage | undefined;
        
        for (const sample of this.samples) {
            if (sample.memory.used > peakMemoryUsage) {
                peakMemoryUsage = sample.memory.used;
                peakSample = sample;
            }
            if (sample.cpu.usage > peakCpuUsage) {
                peakCpuUsage = sample.cpu.usage;
            }
            totalMemoryUsage += sample.memory.used;
            totalCpuUsage += sample.cpu.usage;
        }
        
        const avgMemoryUsage = this.samples.length > 0 ? totalMemoryUsage / this.samples.length : 0;
        const avgCpuUsage = this.samples.length > 0 ? totalCpuUsage / this.samples.length : 0;
        
        // Calculate custom metrics statistics
        const customMetricsStats: Record<string, { average: number; min: number; max: number }> = {};
        
        for (const [name, values] of Object.entries(this.customMetrics)) {
            if (values.length > 0) {
                customMetricsStats[name] = {
                    average: values.reduce((sum, val) => sum + val, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        }
        
        return {
            testName: this.testName || 'unknown',
            duration,
            samples: this.samples.length,
            averageMetrics: {
                cpuUsage: avgCpuUsage,
                memoryUsage: avgMemoryUsage,
                customMetrics: customMetricsStats
            },
            operations: { ...this.operationCounts },
            errors: { ...this.errorCounts },
            resourceUsage: {
                peak: peakSample || this.samples[0] || this.getCurrentResourceUsage(),
                average: {
                    timestamp: new Date(),
                    cpu: { usage: avgCpuUsage, load: [0, 0, 0] },
                    memory: { used: avgMemoryUsage, total: 0, free: 0 }
                },
                timeline: this.samples.slice(-100) // Last 100 samples for timeline
            }
        };
    }

    /**
     * Reset all collected data
     */
    reset(): void {
        this.samples = [];
        this.customMetrics = {};
        this.operationCounts = {};
        this.errorCounts = {};
        this.startTime = null as any;
        this.testName = null as any;
        
        if (this.isCollecting) {
            this.isCollecting = false;
            if (this.collectionInterval) {
                clearInterval(this.collectionInterval);
                this.collectionInterval = null as any;
            }
        }
    }

    /**
     * Check if currently collecting metrics
     */
    isActive(): boolean {
        return this.isCollecting;
    }

    /**
     * Stop collection (alias for stopCollection)
     */
    async stop(): Promise<SystemMetrics | void> {
        if (this.isCollecting) {
            return await this.stopCollection();
        }
    }
}