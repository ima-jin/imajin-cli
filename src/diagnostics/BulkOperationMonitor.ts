/**
 * BulkOperationMonitor - High-volume operation tracking and optimization
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
 * - ETL pipeline bulk operations
 * - Background job batch processing
 * - API bulk request monitoring
 * - Media processing batch operations
 * - Service provider bulk actions
 */

import { EventEmitter } from 'events';

export interface BulkOperationConfig {
    batchSize?: number;           // Default: 100
    concurrency?: number;         // Default: 5
    retryLimit?: number;          // Default: 3
    timeoutMs?: number;           // Default: 30000
    progressInterval?: number;    // Default: 1000ms
}

export interface BulkOperationProgress {
    operationId: string;
    operation: string;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    progressPercent: number;
    estimatedTimeRemaining?: number;
    currentBatch?: number;
    totalBatches: number;
    startTime: Date;
    lastUpdateTime: Date;
    throughputPerSecond: number;
    errors: BulkOperationError[];
}

export interface BulkOperationError {
    itemIndex: number;
    itemId?: string;
    error: string;
    timestamp: Date;
    retryCount: number;
}

export interface BulkOperationResult {
    operationId: string;
    operation: string;
    success: boolean;
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    duration: number;
    throughputPerSecond: number;
    errors: BulkOperationError[];
    metadata?: any;
}

export interface BulkOperationStats {
    activeOperations: number;
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    totalItemsProcessed: number;
    totalItemsSuccessful: number;
    totalItemsFailed: number;
    averageThroughput: number;
    averageDuration: number;
    errorRate: number;
}

export class BulkOperationMonitor extends EventEmitter {
    private readonly activeOperations: Map<string, BulkOperationProgress> = new Map();
    private readonly completedOperations: Map<string, BulkOperationResult> = new Map();
    private readonly config: BulkOperationConfig;
    private readonly maxHistorySize = 1000; // Keep last 1000 completed operations

    constructor(config: BulkOperationConfig = {}) {
        super();

        this.config = {
            batchSize: config.batchSize ?? 100,
            concurrency: config.concurrency ?? 5,
            retryLimit: config.retryLimit ?? 3,
            timeoutMs: config.timeoutMs ?? 30000,
            progressInterval: config.progressInterval ?? 1000,
        };
    }

    /**
     * Start monitoring a bulk operation
     */
    public startOperation(
        operationId: string,
        operation: string,
        totalItems: number,
        metadata?: any
    ): void {
        const totalBatches = Math.ceil(totalItems / this.config.batchSize!);

        const progress: BulkOperationProgress = {
            operationId,
            operation,
            totalItems,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            skippedItems: 0,
            progressPercent: 0,
            currentBatch: 0,
            totalBatches,
            startTime: new Date(),
            lastUpdateTime: new Date(),
            throughputPerSecond: 0,
            errors: []
        };

        this.activeOperations.set(operationId, progress);
        this.emit('operation:started', { operationId, operation, totalItems, metadata });
    }

    /**
     * Update operation progress
     */
    public updateProgress(
        operationId: string,
        processedItems: number,
        successfulItems: number,
        failedItems: number,
        skippedItems: number = 0,
        currentBatch?: number
    ): void {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return;
        }

        const now = new Date();
        const elapsedSeconds = (now.getTime() - operation.startTime.getTime()) / 1000;

        operation.processedItems = processedItems;
        operation.successfulItems = successfulItems;
        operation.failedItems = failedItems;
        operation.skippedItems = skippedItems;
        operation.progressPercent = Math.round((processedItems / operation.totalItems) * 100);
        operation.lastUpdateTime = now;
        operation.throughputPerSecond = elapsedSeconds > 0 ? processedItems / elapsedSeconds : 0;

        if (currentBatch !== undefined) {
            operation.currentBatch = currentBatch;
        }

        // Calculate estimated time remaining
        if (operation.throughputPerSecond > 0) {
            const remainingItems = operation.totalItems - processedItems;
            operation.estimatedTimeRemaining = remainingItems / operation.throughputPerSecond;
        }

        this.emit('operation:progress', operation);
    }

    /**
     * Record an error for a bulk operation
     */
    public recordError(
        operationId: string,
        itemIndex: number,
        error: string,
        itemId?: string,
        retryCount: number = 0
    ): void {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return;
        }

        const bulkError: BulkOperationError = {
            itemIndex,
            ...(itemId && { itemId }),
            error,
            timestamp: new Date(),
            retryCount
        };

        operation.errors.push(bulkError);

        // Limit error history to avoid memory issues
        if (operation.errors.length > 100) {
            operation.errors = operation.errors.slice(-100);
        }

        this.emit('operation:error', { operationId, error: bulkError });
    }

    /**
     * Complete a bulk operation
     */
    public completeOperation(
        operationId: string,
        success: boolean = true,
        metadata?: any
    ): BulkOperationResult | null {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return null;
        }

        const endTime = new Date();
        const duration = endTime.getTime() - operation.startTime.getTime();

        const result: BulkOperationResult = {
            operationId,
            operation: operation.operation,
            success,
            totalItems: operation.totalItems,
            processedItems: operation.processedItems,
            successfulItems: operation.successfulItems,
            failedItems: operation.failedItems,
            skippedItems: operation.skippedItems,
            duration,
            throughputPerSecond: operation.throughputPerSecond,
            errors: [...operation.errors], // Copy errors
            metadata
        };

        // Move to completed operations
        this.activeOperations.delete(operationId);
        this.completedOperations.set(operationId, result);

        // Maintain history size limit
        if (this.completedOperations.size > this.maxHistorySize) {
            const oldestKey = this.completedOperations.keys().next().value;
            if (oldestKey) {
                this.completedOperations.delete(oldestKey);
            }
        }

        this.emit('operation:completed', result);
        return result;
    }

    /**
     * Get progress for a specific operation
     */
    public getOperationProgress(operationId: string): BulkOperationProgress | null {
        return this.activeOperations.get(operationId) ?? null;
    }

    /**
     * Get result for a completed operation
     */
    public getOperationResult(operationId: string): BulkOperationResult | null {
        return this.completedOperations.get(operationId) ?? null;
    }

    /**
     * Get all active operations
     */
    public getActiveOperations(): BulkOperationProgress[] {
        return Array.from(this.activeOperations.values());
    }

    /**
     * Get recent completed operations
     */
    public getRecentCompletedOperations(limit: number = 50): BulkOperationResult[] {
        const operations = Array.from(this.completedOperations.values());
        return operations
            .sort((a, b) => b.duration - a.duration) // Sort by completion time (most recent first)
            .slice(0, limit);
    }

    /**
     * Get bulk operation statistics
     */
    public getStats(): BulkOperationStats {
        const active = Array.from(this.activeOperations.values());
        const completed = Array.from(this.completedOperations.values());

        const totalOperations = active.length + completed.length;
        const completedOperations = completed.length;
        const failedOperations = completed.filter(op => !op.success).length;

        const totalItemsProcessed = completed.reduce((sum, op) => sum + op.processedItems, 0);
        const totalItemsSuccessful = completed.reduce((sum, op) => sum + op.successfulItems, 0);
        const totalItemsFailed = completed.reduce((sum, op) => sum + op.failedItems, 0);

        const averageThroughput = completed.length > 0
            ? completed.reduce((sum, op) => sum + op.throughputPerSecond, 0) / completed.length
            : 0;

        const averageDuration = completed.length > 0
            ? completed.reduce((sum, op) => sum + op.duration, 0) / completed.length
            : 0;

        const errorRate = totalItemsProcessed > 0 ? (totalItemsFailed / totalItemsProcessed) * 100 : 0;

        return {
            activeOperations: active.length,
            totalOperations,
            completedOperations,
            failedOperations,
            totalItemsProcessed,
            totalItemsSuccessful,
            totalItemsFailed,
            averageThroughput: Math.round(averageThroughput * 100) / 100,
            averageDuration: Math.round(averageDuration),
            errorRate: Math.round(errorRate * 100) / 100
        };
    }

    /**
     * Cancel an active operation
     */
    public cancelOperation(operationId: string, reason?: string): boolean {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return false;
        }

        // Complete as failed operation
        this.completeOperation(operationId, false, {
            cancelled: true,
            reason: reason ?? 'Operation cancelled',
            cancelledAt: new Date().toISOString()
        });

        this.emit('operation:cancelled', { operationId, reason });
        return true;
    }

    /**
     * Clear completed operation history
     */
    public clearHistory(): void {
        const clearedCount = this.completedOperations.size;
        this.completedOperations.clear();
        this.emit('history:cleared', { clearedCount });
    }

    /**
     * Get operations by status
     */
    public getOperationsByStatus(status: 'active' | 'completed' | 'failed'): (BulkOperationProgress | BulkOperationResult)[] {
        switch (status) {
            case 'active':
                return Array.from(this.activeOperations.values());
            case 'completed':
                return Array.from(this.completedOperations.values()).filter(op => op.success);
            case 'failed':
                return Array.from(this.completedOperations.values()).filter(op => !op.success);
            default:
                return [];
        }
    }

    /**
     * Get operations by type/name
     */
    public getOperationsByType(operationType: string): (BulkOperationProgress | BulkOperationResult)[] {
        const active = Array.from(this.activeOperations.values()).filter(op => op.operation === operationType);
        const completed = Array.from(this.completedOperations.values()).filter(op => op.operation === operationType);
        return [...active, ...completed];
    }

    /**
     * Get configuration
     */
    public getConfig(): BulkOperationConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<BulkOperationConfig>): void {
        Object.assign(this.config, config);
        this.emit('config:updated', this.config);
    }
} 