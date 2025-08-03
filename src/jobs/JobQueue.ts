/**
 * JobQueue - Priority-based job queue management with persistence
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
 * - Job interface for type-safe operations
 * - Event System for queue state changes
 * - Rate limiting and throttling
 * - Dead letter queue for failed jobs
 */

import { EventEmitter } from 'events';
import { BaseEvent, EventMetadata } from '../core/events/Event.js';
import { Job, JobMetadata } from './Job.js';

/**
 * Queue configuration options
 */
export interface QueueConfig {
    name: string;
    maxConcurrency?: number;
    maxRetries?: number;
    retryDelay?: number;
    processingTimeout?: number;
    enableDeadLetterQueue?: boolean;
    persistJobs?: boolean;
    rateLimitPerSecond?: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
    name: string;
    pending: number;
    active: number;
    completed: number;
    failed: number;
    retrying: number;
    deadLetter: number;
    totalProcessed: number;
    averageProcessingTime: number;
    uptime: number;
}

/**
 * Job queue entry with metadata
 */
interface QueuedJob {
    job: Job;
    priority: number;
    addedAt: Date;
    retryCount: number;
    nextRetryAt?: Date | undefined;
    processingStartedAt?: Date;
    status: 'pending' | 'active' | 'completed' | 'failed' | 'retrying' | 'dead';
}

/**
 * Queue event payloads
 */
export interface QueueJobAddedPayload {
    queueName: string;
    jobId: string;
    jobType: string;
    priority: number;
}

export interface QueueJobProcessingPayload {
    queueName: string;
    jobId: string;
    jobType: string;
    attemptNumber: number;
}

export interface QueueJobCompletedPayload {
    queueName: string;
    jobId: string;
    jobType: string;
    duration: number;
    success: boolean;
}

/**
 * Queue events
 */
export class QueueJobAddedEvent extends BaseEvent<QueueJobAddedPayload> {
    constructor(payload: QueueJobAddedPayload, metadata: EventMetadata) {
        super('queue.job.added', payload, metadata);
    }
}

export class QueueJobProcessingEvent extends BaseEvent<QueueJobProcessingPayload> {
    constructor(payload: QueueJobProcessingPayload, metadata: EventMetadata) {
        super('queue.job.processing', payload, metadata);
    }
}

export class QueueJobCompletedEvent extends BaseEvent<QueueJobCompletedPayload> {
    constructor(payload: QueueJobCompletedPayload, metadata: EventMetadata) {
        super('queue.job.completed', payload, metadata);
    }
}

/**
 * Priority-based job queue with advanced features
 */
export class JobQueue extends EventEmitter {
    private jobs: Map<string, QueuedJob> = new Map();
    private pendingJobs: QueuedJob[] = [];
    private activeJobs: Map<string, QueuedJob> = new Map();
    private completedJobs: QueuedJob[] = [];
    private failedJobs: QueuedJob[] = [];
    private deadLetterJobs: QueuedJob[] = [];

    private processingTimer?: NodeJS.Timeout | undefined;
    private retryTimer?: NodeJS.Timeout | undefined;
    private rateLimitTokens: number;
    private lastTokenRefill: number;
    private startTime: Date;

    private stats = {
        totalProcessed: 0,
        totalProcessingTime: 0
    };

    constructor(private config: QueueConfig) {
        super();
        this.rateLimitTokens = config.rateLimitPerSecond || 10;
        this.lastTokenRefill = Date.now();
        this.startTime = new Date();

        this.startProcessing();
        this.startRetryTimer();
    }

    /**
     * Add a job to the queue
     */
    public async addJob(job: Job, _metadata?: JobMetadata): Promise<void> {
        const queuedJob: QueuedJob = {
            job,
            priority: job.priority,
            addedAt: new Date(),
            retryCount: 0,
            status: 'pending'
        };

        this.jobs.set(job.id, queuedJob);
        this.insertByPriority(queuedJob);

        // Emit job added event
        this.emit('jobAdded', {
            queueName: this.config.name,
            jobId: job.id,
            jobType: job.type,
            priority: job.priority
        });

        this.emit('queueChanged', this.getStats());
    }

    /**
     * Insert job in priority order (higher priority first)
     */
    private insertByPriority(queuedJob: QueuedJob): void {
        let inserted = false;

        for (let i = 0; i < this.pendingJobs.length; i++) {
            const currentJob = this.pendingJobs[i];
            if (currentJob && queuedJob.priority > currentJob.priority) {
                this.pendingJobs.splice(i, 0, queuedJob);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            this.pendingJobs.push(queuedJob);
        }
    }

    /**
     * Process jobs from the queue
     */
    private async processJobs(): Promise<void> {
        // Refill rate limit tokens
        this.refillRateLimitTokens();

        // Check if we can process more jobs
        if (this.activeJobs.size >= (this.config.maxConcurrency || 5)) {
            return;
        }

        if (this.pendingJobs.length === 0) {
            return;
        }

        if (this.rateLimitTokens <= 0) {
            return;
        }

        const queuedJob = this.pendingJobs.shift();
        if (!queuedJob) return;

        this.rateLimitTokens--;

        this.processJob(queuedJob);
    }

    /**
     * Process a single job
     */
    private async processJob(queuedJob: QueuedJob): Promise<void> {
        queuedJob.status = 'active';
        queuedJob.processingStartedAt = new Date();
        this.activeJobs.set(queuedJob.job.id, queuedJob);

        // Emit processing event
        this.emit('jobProcessing', {
            queueName: this.config.name,
            jobId: queuedJob.job.id,
            jobType: queuedJob.job.type,
            attemptNumber: queuedJob.retryCount + 1
        });

        const startTime = Date.now();
        let timeoutId: NodeJS.Timeout | undefined;

        try {
            // Set up timeout if configured
            const timeoutPromise = new Promise<never>((_, reject) => {
                if (this.config.processingTimeout) {
                    timeoutId = setTimeout(() => {
                        reject(new Error(`Job timeout after ${this.config.processingTimeout}ms`));
                    }, this.config.processingTimeout);
                }
            });

            // Execute the job
            const resultPromise = queuedJob.job.execute();
            const result = this.config.processingTimeout
                ? await Promise.race([resultPromise, timeoutPromise])
                : await resultPromise;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const duration = Date.now() - startTime;
            this.stats.totalProcessed++;
            this.stats.totalProcessingTime += duration;

            // Job completed successfully
            queuedJob.status = 'completed';
            this.activeJobs.delete(queuedJob.job.id);
            this.completedJobs.push(queuedJob);

            this.emit('jobCompleted', {
                queueName: this.config.name,
                jobId: queuedJob.job.id,
                jobType: queuedJob.job.type,
                duration,
                success: result.success
            });

        } catch (error) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const jobError = error instanceof Error ? error : new Error(String(error));
            const duration = Date.now() - startTime;

            // Handle job failure
            await this.handleJobFailure(queuedJob, jobError, duration);
        }

        this.emit('queueChanged', this.getStats());
    }

    /**
     * Handle job failure with retry logic
     */
    private async handleJobFailure(queuedJob: QueuedJob, error: Error, duration: number): Promise<void> {
        this.activeJobs.delete(queuedJob.job.id);
        queuedJob.retryCount++;

        const maxRetries = this.config.maxRetries || queuedJob.job.maxRetries;
        const shouldRetry = queuedJob.retryCount < maxRetries &&
            queuedJob.job.shouldRetry?.(error, queuedJob.retryCount) !== false;

        if (shouldRetry) {
            // Schedule for retry
            queuedJob.status = 'retrying';
            const retryDelay = this.calculateRetryDelay(queuedJob.retryCount);
            queuedJob.nextRetryAt = new Date(Date.now() + retryDelay);

            this.emit('jobRetrying', {
                queueName: this.config.name,
                jobId: queuedJob.job.id,
                jobType: queuedJob.job.type,
                attemptNumber: queuedJob.retryCount,
                nextRetryAt: queuedJob.nextRetryAt,
                error: error.message
            });
        } else {
            // Job failed permanently
            queuedJob.status = 'failed';
            this.failedJobs.push(queuedJob);

            // Move to dead letter queue if enabled
            if (this.config.enableDeadLetterQueue) {
                queuedJob.status = 'dead';
                this.deadLetterJobs.push(queuedJob);
            }

            this.emit('jobFailed', {
                queueName: this.config.name,
                jobId: queuedJob.job.id,
                jobType: queuedJob.job.type,
                attemptCount: queuedJob.retryCount,
                error: error.message,
                finalFailure: true
            });
        }

        this.emit('jobCompleted', {
            queueName: this.config.name,
            jobId: queuedJob.job.id,
            jobType: queuedJob.job.type,
            duration,
            success: false
        });
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay(attemptCount: number): number {
        const baseDelay = this.config.retryDelay || 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attemptCount - 1);
        const jitteredDelay = exponentialDelay + (Math.random() * 1000); // Add jitter
        return Math.min(jitteredDelay, 30000); // Cap at 30 seconds
    }

    /**
     * Refill rate limit tokens
     */
    private refillRateLimitTokens(): void {
        if (!this.config.rateLimitPerSecond) return;

        const now = Date.now();
        const timePassed = now - this.lastTokenRefill;
        const tokensToAdd = Math.floor((timePassed / 1000) * this.config.rateLimitPerSecond);

        if (tokensToAdd > 0) {
            this.rateLimitTokens = Math.min(
                this.config.rateLimitPerSecond,
                this.rateLimitTokens + tokensToAdd
            );
            this.lastTokenRefill = now;
        }
    }

    /**
     * Start processing timer
     */
    private startProcessing(): void {
        this.processingTimer = setInterval(() => {
            this.processJobs().catch(error => {
                this.emit('error', error);
            });
        }, 100); // Check every 100ms
    }

    /**
     * Start retry timer
     */
    private startRetryTimer(): void {
        this.retryTimer = setInterval(() => {
            this.processRetries();
        }, 1000); // Check every second
    }

    /**
     * Process jobs scheduled for retry
     */
    private processRetries(): void {
        const now = new Date();
        const jobsToRetry: QueuedJob[] = [];

        // Find jobs ready for retry
        for (const [, queuedJob] of this.jobs.entries()) {
            if (queuedJob.status === 'retrying' &&
                queuedJob.nextRetryAt &&
                queuedJob.nextRetryAt <= now) {
                jobsToRetry.push(queuedJob);
            }
        }

        // Move them back to pending queue
        for (const queuedJob of jobsToRetry) {
            queuedJob.status = 'pending';
            queuedJob.nextRetryAt = undefined;
            this.insertByPriority(queuedJob);
        }
    }

    /**
     * Get queue statistics
     */
    public getStats(): QueueStats {
        const pending = this.pendingJobs.length;
        const active = this.activeJobs.size;
        const completed = this.completedJobs.length;
        const failed = this.failedJobs.length;
        const retrying = Array.from(this.jobs.values()).filter(j => j.status === 'retrying').length;
        const deadLetter = this.deadLetterJobs.length;
        const averageProcessingTime = this.stats.totalProcessed > 0
            ? this.stats.totalProcessingTime / this.stats.totalProcessed
            : 0;
        const uptime = Date.now() - this.startTime.getTime();

        return {
            name: this.config.name,
            pending,
            active,
            completed,
            failed,
            retrying,
            deadLetter,
            totalProcessed: this.stats.totalProcessed,
            averageProcessingTime,
            uptime
        };
    }

    /**
     * Get job by ID
     */
    public getJob(jobId: string): QueuedJob | undefined {
        return this.jobs.get(jobId);
    }

    /**
     * Cancel a job
     */
    public cancelJob(jobId: string): boolean {
        const queuedJob = this.jobs.get(jobId);
        if (!queuedJob) return false;

        if (queuedJob.status === 'pending' || queuedJob.status === 'retrying') {
            // Remove from pending queue
            const index = this.pendingJobs.findIndex(j => j.job.id === jobId);
            if (index >= 0) {
                this.pendingJobs.splice(index, 1);
            }

            queuedJob.status = 'failed';
            queuedJob.job.cancel?.();

            this.emit('jobCancelled', {
                queueName: this.config.name,
                jobId,
                jobType: queuedJob.job.type
            });

            return true;
        }

        return false;
    }

    /**
     * Pause the queue
     */
    public pause(): void {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = undefined;
        }
        this.emit('queuePaused', { queueName: this.config.name });
    }

    /**
     * Resume the queue
     */
    public resume(): void {
        if (!this.processingTimer) {
            this.startProcessing();
        }
        this.emit('queueResumed', { queueName: this.config.name });
    }

    /**
     * Clear completed jobs
     */
    public clearCompleted(): number {
        const count = this.completedJobs.length;
        this.completedJobs = [];

        // Also remove from jobs map
        for (const [jobId, queuedJob] of this.jobs.entries()) {
            if (queuedJob.status === 'completed') {
                this.jobs.delete(jobId);
            }
        }

        return count;
    }

    /**
     * Shutdown the queue
     */
    public async shutdown(): Promise<void> {
        this.pause();

        if (this.retryTimer) {
            clearInterval(this.retryTimer);
        }

        // Wait for active jobs to complete (with timeout)
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();

        while (this.activeJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.emit('queueShutdown', {
            queueName: this.config.name,
            pendingJobs: this.pendingJobs.length,
            activeJobs: this.activeJobs.size
        });
    }
} 