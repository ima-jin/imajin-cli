/**
 * Job - Base job interface and implementation for background processing
 * 
 * @package     @imajin/cli
 * @subpackage  jobs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Event System for progress tracking
 * - JobQueue for priority-based scheduling
 * - JobProcessor for execution management
 * - Retry mechanisms with exponential backoff
 */

import { EventEmitter } from 'events';
import { randomBytes } from 'node:crypto';
import { BaseEvent, EventMetadata } from '../core/events/Event.js';

/**
 * Enhanced job execution result
 */
export interface JobExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    timestamp: Date;
    retryCount: number;
}

/**
 * Base job interface
 */
export interface Job {
    readonly id: string;
    readonly type: string;
    readonly payload: any;
    readonly priority: number;
    readonly maxRetries: number;
    readonly delay: number;
    readonly createdAt: Date;
    readonly retryCount: number;

    execute(): Promise<JobExecutionResult>;
    onFailure?(error: Error): Promise<void>;
    onSuccess?(result: any): Promise<void>;
    validate?(): Promise<boolean>;
    shouldRetry?(error: Error, attemptCount: number): boolean;

    // Event emitter methods
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): boolean;

    // Optional cancellation methods
    cancel?(): void;
}

/**
 * Job metadata for tracking and coordination
 */
export interface JobMetadata {
    readonly correlationId?: string;
    readonly userId?: string;
    readonly sessionId?: string;
    readonly tags?: Record<string, string>;
    readonly scheduledAt?: Date;
    readonly timeoutMs?: number;
}

/**
 * Job progress event payload
 */
export interface JobProgressPayload {
    jobId: string;
    jobType: string;
    step: string;
    current: number;
    total: number;
    percent: number;
    message?: string;
    data?: any;
    estimatedTimeRemaining?: number;
}

/**
 * Job progress event
 */
export class JobProgressEvent extends BaseEvent<JobProgressPayload> {
    constructor(payload: JobProgressPayload, metadata: EventMetadata) {
        super('job.progress', payload, metadata);
    }
}

/**
 * Job started event payload
 */
export interface JobStartedPayload {
    jobId: string;
    jobType: string;
    startTime: Date;
    processorName: string;
}

/**
 * Job started event
 */
export class JobStartedEvent extends BaseEvent<JobStartedPayload> {
    constructor(payload: JobStartedPayload, metadata: EventMetadata) {
        super('job.started', payload, metadata);
    }
}

/**
 * Job completed event payload
 */
export interface JobCompletedPayload {
    jobId: string;
    jobType: string;
    result: JobExecutionResult;
    duration: number;
}

/**
 * Job completed event
 */
export class JobCompletedEvent extends BaseEvent<JobCompletedPayload> {
    constructor(payload: JobCompletedPayload, metadata: EventMetadata) {
        super('job.completed', payload, metadata);
    }
}

/**
 * Job failed event payload
 */
export interface JobFailedPayload {
    jobId: string;
    jobType: string;
    error: Error;
    attemptCount: number;
    maxRetries: number;
    willRetry: boolean;
}

/**
 * Job failed event
 */
export class JobFailedEvent extends BaseEvent<JobFailedPayload> {
    constructor(payload: JobFailedPayload, metadata: EventMetadata) {
        super('job.failed', payload, metadata);
    }
}

/**
 * Abstract base job class with common functionality
 */
export abstract class BaseJob extends EventEmitter implements Job {
    public readonly id: string;
    public readonly createdAt: Date;

    private _retryCount = 0;
    private _status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' = 'pending';

    constructor(
        public readonly type: string,
        public readonly payload: any,
        public readonly priority: number = 0,
        public readonly maxRetries: number = 3,
        public readonly delay: number = 0,
        public readonly metadata: JobMetadata = {}
    ) {
        super();
        this.id = this.generateId();
        this.createdAt = new Date();
    }

    /**
     * Generate unique job ID
     */
    private generateId(): string {
        return `${this.type}_${Date.now()}_${(()=>{
const b = randomBytes(6); return b.toString("base64").replace(/[^a-z0-9]/gi,"").toLowerCase().substring(0,9);
})()}`;
    }

    /**
     * Abstract execute method - must be implemented by subclasses
     */
    public abstract execute(): Promise<JobExecutionResult>;

    /**
     * Default failure handler - can be overridden
     */
    public async onFailure(error: Error): Promise<void> {
        this.emit('failure', { jobId: this.id, error, retryCount: this._retryCount });
    }

    /**
     * Default success handler - can be overridden  
     */
    public async onSuccess(result: any): Promise<void> {
        this.emit('success', { jobId: this.id, result });
    }

    /**
     * Default validation - can be overridden
     */
    public async validate(): Promise<boolean> {
        return true;
    }

    /**
     * Default retry logic with exponential backoff - can be overridden
     */
    public shouldRetry(error: Error, attemptCount: number): boolean {
        if (attemptCount >= this.maxRetries) {
            return false;
        }

        // Don't retry certain error types
        if (error.name === 'ValidationError' || error.name === 'AuthenticationError') {
            return false;
        }

        return true;
    }

    /**
     * Calculate backoff delay for retries
     */
    public getRetryDelay(attemptCount: number): number {
        const baseDelay = this.delay || 1000;
        return Math.min(baseDelay * Math.pow(2, attemptCount), 30000); // Max 30 seconds
    }

    /**
     * Update job progress and emit event
     */
    protected updateProgress(
        step: string,
        current: number,
        total: number,
        message?: string,
        data?: any
    ): void {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;

        const progressPayload: JobProgressPayload = {
            jobId: this.id,
            jobType: this.type,
            step,
            current,
            total,
            percent,
            ...(message && { message }),
            data
        };

        this.emit('progress', progressPayload);
    }

    /**
     * Get current retry count
     */
    public get retryCount(): number {
        return this._retryCount;
    }

    /**
     * Increment retry count
     */
    public incrementRetryCount(): void {
        this._retryCount++;
    }

    /**
     * Get current status
     */
    public get status(): string {
        return this._status;
    }

    /**
     * Update job status
     */
    public updateStatus(status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'): void {
        this._status = status;
        this.emit('statusChanged', { jobId: this.id, status });
    }

    /**
     * Check if job can be cancelled
     */
    public canCancel(): boolean {
        return this._status === 'pending' || this._status === 'running';
    }

    /**
     * Cancel the job
     */
    public cancel(): void {
        if (this.canCancel()) {
            this.updateStatus('cancelled');
            this.emit('cancelled', { jobId: this.id });
        }
    }

    /**
     * Serialize job to JSON
     */
    public toJSON(): object {
        return {
            id: this.id,
            type: this.type,
            payload: this.payload,
            priority: this.priority,
            maxRetries: this.maxRetries,
            delay: this.delay,
            retryCount: this._retryCount,
            status: this._status,
            createdAt: this.createdAt,
            metadata: this.metadata
        };
    }
}

/**
 * Example concrete job implementation for HTTP requests
 */
export class HttpRequestJob extends BaseJob {
    constructor(
        payload: {
            url: string;
            method: 'GET' | 'POST' | 'PUT' | 'DELETE';
            headers?: Record<string, string>;
            body?: any;
        },
        priority: number = 0,
        maxRetries: number = 3,
        delay: number = 1000
    ) {
        super('http-request', payload, priority, maxRetries, delay);
    }

    public async execute(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        const { url, method, headers = {}, body } = this.payload;

        try {
            // Validate URL
            new URL(url);

            // Update progress
            this.updateProgress('Starting HTTP request', 0, 100, `${method} ${url}`);

            // Make the HTTP request (simplified implementation)
            // In a real implementation, you'd use a proper HTTP client like axios or fetch
            const response = await this.makeHttpRequest(url, method, headers, body);

            this.updateProgress('Request completed', 100, 100, 'Processing response');

            const duration = Date.now() - startTime;

            return {
                success: true,
                data: response,
                duration,
                timestamp: new Date(),
                retryCount: this.retryCount
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return {
                success: false,
                error: errorMessage,
                duration,
                timestamp: new Date(),
                retryCount: this.retryCount
            };
        }
    }

    /**
     * Make HTTP request (simplified implementation)
     */
    private async makeHttpRequest(url: string, method: string, _headers: Record<string, string>, _body: any): Promise<any> {
        // This is a simplified implementation
        // In production, use a proper HTTP client

        this.updateProgress('Making request', 50, 100, `${method} request to ${url}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Return mock response
        return {
            status: 200,
            statusText: 'OK',
            data: { message: `${method} request to ${url} completed` },
            headers: {}
        };
    }
}

/**
 * Example concrete job implementation for data processing
 */
export class DataProcessingJob extends BaseJob {
    constructor(
        payload: {
            data: any[];
            operation: 'transform' | 'validate' | 'aggregate';
            options?: Record<string, any>;
        },
        priority: number = 0,
        maxRetries: number = 1, // Data processing usually shouldn't retry
        delay: number = 500
    ) {
        super('data-processing', payload, priority, maxRetries, delay);
    }

    public async execute(): Promise<JobExecutionResult> {
        const startTime = Date.now();

        try {
            this.updateStatus('running');
            const { data, operation } = this.payload;

            this.updateProgress('Initializing data processing', 0, data.length);

            const processedData = [];

            for (let i = 0; i < data.length; i++) {
                // Process each item
                const processedItem = await this.processItem(data[i], operation);
                processedData.push(processedItem);

                this.updateProgress(
                    `Processing ${operation}`,
                    i + 1,
                    data.length,
                    `Processed ${i + 1}/${data.length} items`
                );

                // Add small delay to prevent overwhelming the system
                if (i % 100 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            const result: JobExecutionResult = {
                success: true,
                data: processedData,
                duration: Date.now() - startTime,
                timestamp: new Date(),
                retryCount: this.retryCount
            };

            this.updateStatus('completed');
            await this.onSuccess(result);

            return result;

        } catch (error) {
            const jobError = error instanceof Error ? error : new Error(String(error));

            const result: JobExecutionResult = {
                success: false,
                error: jobError.message,
                duration: Date.now() - startTime,
                timestamp: new Date(),
                retryCount: this.retryCount
            };

            this.updateStatus('failed');
            await this.onFailure(jobError);

            return result;
        }
    }

    private async processItem(item: any, operation: string): Promise<any> {
        // Simulate processing logic
        switch (operation) {
            case 'transform':
                return { ...item, processed: true, timestamp: new Date() };
            case 'validate':
                return { ...item, valid: typeof item === 'object' && item !== null };
            case 'aggregate':
                return { count: Array.isArray(item) ? item.length : 1, data: item };
            default:
                return item;
        }
    }
} 