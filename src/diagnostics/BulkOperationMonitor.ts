/**
 * BulkOperationMonitor - Simplified bulk operation tracking
 * 
 * @package     @imajin/cli
 * @subpackage  diagnostics
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-07-03
 *
 * Integration Points:
 * - ETL pipeline monitoring
 * - Basic operation tracking
 */

import { EventEmitter } from 'events';

export interface OperationProgress {
    operationId: string;
    type: string;
    total: number;
    completed: number;
    failed: number;
    startTime: Date;
    lastUpdate: Date;
    status: 'running' | 'completed' | 'failed';
    error?: string;
}

export interface OperationMetrics {
    totalOperations: number;
    activeOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageDuration: number;
    successRate: number;
}

export class BulkOperationMonitor extends EventEmitter {
    private readonly operations: Map<string, OperationProgress> = new Map();
    private readonly metrics: {
        totalOperations: number;
        completedOperations: number;
        failedOperations: number;
        totalDuration: number;
    } = {
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        totalDuration: 0
    };

    constructor() {
        super();
    }

    /**
     * Start tracking a new operation
     */
    public startOperation(operationId: string, type: string, total: number): void {
        const operation: OperationProgress = {
            operationId,
            type,
            total,
            completed: 0,
            failed: 0,
            startTime: new Date(),
            lastUpdate: new Date(),
            status: 'running'
        };

        this.operations.set(operationId, operation);
        this.metrics.totalOperations++;
        this.emit('operation:started', operation);
    }

    /**
     * Update operation progress
     */
    public updateProgress(
        operationId: string,
        completed: number,
        failed: number = 0
    ): void {
        const operation = this.operations.get(operationId);
        if (!operation) {
            return;
        }

        operation.completed = completed;
        operation.failed = failed;
        operation.lastUpdate = new Date();

        this.emit('operation:progress', operation);

        // Check if operation is complete
        if (operation.completed + operation.failed >= operation.total) {
            this.completeOperation(operationId);
        }
    }

    /**
     * Mark operation as failed
     */
    public failOperation(operationId: string, error: string): void {
        const operation = this.operations.get(operationId);
        if (!operation) {
            return;
        }

        operation.status = 'failed';
        operation.error = error;
        operation.lastUpdate = new Date();

        this.metrics.failedOperations++;
        this.emit('operation:failed', operation);
        this.operations.delete(operationId);
    }

    /**
     * Complete an operation
     */
    private completeOperation(operationId: string): void {
        const operation = this.operations.get(operationId);
        if (!operation) {
            return;
        }

        operation.status = 'completed';
        operation.lastUpdate = new Date();

        const duration = operation.lastUpdate.getTime() - operation.startTime.getTime();
        this.metrics.totalDuration += duration;
        this.metrics.completedOperations++;

        this.emit('operation:completed', operation);
        this.operations.delete(operationId);
    }

    /**
     * Get operation progress
     */
    public getOperationProgress(operationId: string): OperationProgress | undefined {
        return this.operations.get(operationId);
    }

    /**
     * Get all active operations
     */
    public getActiveOperations(): OperationProgress[] {
        return Array.from(this.operations.values());
    }

    /**
     * Get operation metrics
     */
    public getMetrics(): OperationMetrics {
        const activeOperations = this.operations.size;
        const totalOperations = this.metrics.totalOperations;
        const completedOperations = this.metrics.completedOperations;
        const failedOperations = this.metrics.failedOperations;

        return {
            totalOperations,
            activeOperations,
            completedOperations,
            failedOperations,
            averageDuration: totalOperations > 0 
                ? this.metrics.totalDuration / totalOperations 
                : 0,
            successRate: totalOperations > 0
                ? (completedOperations / totalOperations) * 100
                : 100
        };
    }

    /**
     * Clear all operations
     */
    public clear(): void {
        this.operations.clear();
        this.metrics.totalOperations = 0;
        this.metrics.completedOperations = 0;
        this.metrics.failedOperations = 0;
        this.metrics.totalDuration = 0;
        this.emit('operations:cleared');
    }
} 