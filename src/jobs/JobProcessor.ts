/**
 * JobProcessor - Job execution engine with event integration
 * 
 * @package     @imajin/cli
 * @subpackage  jobs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - JobQueue for job retrieval and management
 * - Event System for progress tracking and notifications
 * - Error handling and retry mechanisms
 * - Distributed processing capabilities
 */

import { EventEmitter } from 'events';
import { EventPriority } from '../core/events/Event.js';
import { Job, JobCompletedEvent, JobExecutionResult, JobFailedEvent, JobProgressEvent, JobStartedEvent } from './Job.js';
import { JobQueue } from './JobQueue.js';

/**
 * Processor configuration
 */
export interface ProcessorConfig {
    name: string;
    concurrency?: number;
    eventBus?: EventEmitter;
    enableProgressTracking?: boolean;
    enableHealthChecks?: boolean;
    healthCheckInterval?: number;
    maxProcessingTime?: number;
}

/**
 * Processor statistics
 */
export interface ProcessorStats {
    name: string;
    isActive: boolean;
    totalJobsProcessed: number;
    successfulJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    currentlyProcessing: number;
    uptime: number;
    lastHealthCheck: Date;
    memoryUsage: NodeJS.MemoryUsage;
}

/**
 * Processing context for job execution
 */
export interface ProcessingContext {
    jobId: string;
    jobType: string;
    startTime: Date;
    processor: JobProcessor;
    attemptNumber: number;
    metadata: Record<string, any>;
}

/**
 * Job execution engine with advanced features
 */
export class JobProcessor extends EventEmitter {
    private readonly queues: Map<string, JobQueue> = new Map();
    private readonly processingJobs: Map<string, ProcessingContext> = new Map();
    private healthCheckTimer?: NodeJS.Timeout;
    private readonly startTime: Date;
    private isShuttingDown = false;

    private readonly stats = {
        totalJobsProcessed: 0,
        successfulJobs: 0,
        failedJobs: 0,
        totalProcessingTime: 0
    };

    constructor(private readonly config: ProcessorConfig) {
        super();
        this.startTime = new Date();

        if (config.enableHealthChecks) {
            this.startHealthChecks();
        }

        this.setupEventHandlers();
    }

    /**
     * Register a job queue for processing
     */
    public registerQueue(queue: JobQueue): void {
        const queueName = queue.getStats().name;
        this.queues.set(queueName, queue);

        // Set up queue event handlers
        this.setupQueueEventHandlers(queue);

        this.emit('queueRegistered', {
            processorName: this.config.name,
            queueName,
            timestamp: new Date()
        });
    }

    /**
     * Unregister a job queue
     */
    public unregisterQueue(queueName: string): boolean {
        const queue = this.queues.get(queueName);
        if (!queue) return false;

        this.queues.delete(queueName);

        this.emit('queueUnregistered', {
            processorName: this.config.name,
            queueName,
            timestamp: new Date()
        });

        return true;
    }

    /**
     * Process a specific job
     */
    public async processJob(job: Job, metadata?: Record<string, any>): Promise<JobExecutionResult> {
        if (this.isShuttingDown) {
            throw new Error('Processor is shutting down, cannot process new jobs');
        }

        const context: ProcessingContext = {
            jobId: job.id,
            jobType: job.type,
            startTime: new Date(),
            processor: this,
            attemptNumber: job.retryCount + 1,
            metadata: metadata || {}
        };

        this.processingJobs.set(job.id, context);

        try {
            // Emit job started event
            if (this.config.eventBus) {
                const startEvent = this.createJobStartedEvent(job, context);
                this.config.eventBus.emit('job.started', startEvent);
            }

            // Set up progress tracking if enabled
            if (this.config.enableProgressTracking) {
                this.setupProgressTracking(job, context);
            }

            // Execute the job with timeout if configured
            const result = await this.executeJobWithTimeout(job, context);

            // Update statistics
            this.updateStats(result, context);

            // Emit completion events
            if (this.config.eventBus) {
                const completedEvent = this.createJobCompletedEvent(job, result, context);
                this.config.eventBus.emit('job.completed', completedEvent);
            }

            this.emit('jobCompleted', {
                jobId: job.id,
                jobType: job.type,
                success: result.success,
                duration: result.duration,
                processorName: this.config.name
            });

            return result;

        } catch (error) {
            const jobError = error instanceof Error ? error : new Error(String(error));
            const duration = Date.now() - context.startTime.getTime();

            const result: JobExecutionResult = {
                success: false,
                error: jobError.message,
                duration,
                timestamp: new Date(),
                retryCount: job.retryCount
            };

            this.updateStats(result, context);

            // Emit failure events
            if (this.config.eventBus) {
                const failedEvent = this.createJobFailedEvent(job, jobError, context);
                this.config.eventBus.emit('job.failed', failedEvent);
            }

            this.emit('jobFailed', {
                jobId: job.id,
                jobType: job.type,
                error: jobError.message,
                duration,
                processorName: this.config.name
            });

            return result;

        } finally {
            this.processingJobs.delete(job.id);
        }
    }

    /**
     * Execute job with timeout handling
     */
    private async executeJobWithTimeout(job: Job, _context: ProcessingContext): Promise<JobExecutionResult> {
        if (this.config.maxProcessingTime) {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Job execution timeout after ${this.config.maxProcessingTime}ms`));
                }, this.config.maxProcessingTime);
            });

            return await Promise.race([job.execute(), timeoutPromise]);
        } else {
            return await job.execute();
        }
    }

    /**
     * Set up progress tracking for a job
     */
    private setupProgressTracking(job: Job, _context: ProcessingContext): void {
        const progressHandler = (progressData: any) => {
            if (this.config.eventBus) {
                const progressEvent = new JobProgressEvent(
                    {
                        jobId: job.id,
                        jobType: job.type,
                        step: progressData.step ?? 'Processing',
                        current: progressData.current ?? 0,
                        total: progressData.total ?? 100,
                        percent: progressData.percent ?? 0,
                        message: progressData.message,
                        data: progressData.data
                    },
                    {
                        source: this.config.name,
                        correlationId: _context.jobId,
                        priority: EventPriority.NORMAL
                    }
                );

                this.config.eventBus.emit('job.progress', progressEvent);
            }

            this.emit('jobProgress', {
                jobId: job.id,
                jobType: job.type,
                processorName: this.config.name,
                ...progressData
            });
        };

        job.on('progress', progressHandler);

        // Clean up listener when job completes
        const cleanup = () => {
            job.removeListener('progress', progressHandler);
        };

        job.once('completed', cleanup);
        job.once('failed', cleanup);
    }

    /**
     * Set up event handlers for processor events
     */
    private setupEventHandlers(): void {
        this.on('error', (error) => {
            console.error(`JobProcessor ${this.config.name} error:`, error);
        });

        this.on('jobCompleted', (data) => {
            if (data.success) {
                console.log(`Job ${data.jobId} completed successfully in ${data.duration}ms`);
            }
        });

        this.on('jobFailed', (data) => {
            console.error(`Job ${data.jobId} failed: ${data.error}`);
        });
    }

    /**
     * Set up event handlers for queue events
     */
    private setupQueueEventHandlers(queue: JobQueue): void {
        queue.on('jobAdded', (data) => {
            this.emit('queueJobAdded', {
                processorName: this.config.name,
                ...data
            });
        });

        queue.on('jobCompleted', (data) => {
            this.emit('queueJobCompleted', {
                processorName: this.config.name,
                ...data
            });
        });

        queue.on('error', (error) => {
            this.emit('queueError', {
                processorName: this.config.name,
                error
            });
        });
    }

    /**
     * Create job started event
     */
    private createJobStartedEvent(job: Job, _context: ProcessingContext): JobStartedEvent {
        return new JobStartedEvent(
            {
                jobId: job.id,
                jobType: job.type,
                startTime: new Date(),
                processorName: this.config.name
            },
            {
                source: this.config.name,
                correlationId: job.id,
                priority: EventPriority.NORMAL
            }
        );
    }

    /**
     * Create job completed event
     */
    private createJobCompletedEvent(job: Job, result: JobExecutionResult, _context: ProcessingContext): JobCompletedEvent {
        return new JobCompletedEvent(
            {
                jobId: job.id,
                jobType: job.type,
                result,
                duration: result.duration
            },
            {
                source: this.config.name,
                correlationId: job.id,
                priority: EventPriority.NORMAL
            }
        );
    }

    /**
     * Create job failed event
     */
    private createJobFailedEvent(job: Job, error: Error, _context: ProcessingContext): JobFailedEvent {
        return new JobFailedEvent(
            {
                jobId: job.id,
                jobType: job.type,
                error,
                attemptCount: _context.attemptNumber,
                maxRetries: job.maxRetries,
                willRetry: job.shouldRetry?.(error, _context.attemptNumber) !== false
            },
            {
                source: this.config.name,
                correlationId: job.id,
                priority: EventPriority.HIGH
            }
        );
    }

    /**
     * Update processor statistics
     */
    private updateStats(result: JobExecutionResult, _context: ProcessingContext): void {
        this.stats.totalJobsProcessed++;
        this.stats.totalProcessingTime += result.duration;

        if (result.success) {
            this.stats.successfulJobs++;
        } else {
            this.stats.failedJobs++;
        }
    }

    /**
     * Start health check monitoring
     */
    private startHealthChecks(): void {
        const interval = this.config.healthCheckInterval ?? 30000; // 30 seconds

        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, interval);
    }

    /**
     * Perform health check
     */
    private performHealthCheck(): void {
        const memoryUsage = process.memoryUsage();
        const now = new Date();

        const healthData = {
            processorName: this.config.name,
            timestamp: now,
            memoryUsage,
            activeJobs: this.processingJobs.size,
            uptime: now.getTime() - this.startTime.getTime(),
            isHealthy: this.isHealthy()
        };

        this.emit('healthCheck', healthData);

        if (this.config.eventBus) {
            this.config.eventBus.emit('processor.healthCheck', healthData);
        }
    }

    /**
     * Check if processor is healthy
     */
    private isHealthy(): boolean {
        const memoryUsage = process.memoryUsage();
        const maxMemoryMB = 1024; // 1GB threshold
        const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

        return memoryUsageMB < maxMemoryMB && !this.isShuttingDown;
    }

    /**
     * Get processor statistics
     */
    public getStats(): ProcessorStats {
        const memoryUsage = process.memoryUsage();
        const uptime = Date.now() - this.startTime.getTime();
        const averageProcessingTime = this.stats.totalJobsProcessed > 0
            ? this.stats.totalProcessingTime / this.stats.totalJobsProcessed
            : 0;

        return {
            name: this.config.name,
            isActive: !this.isShuttingDown,
            totalJobsProcessed: this.stats.totalJobsProcessed,
            successfulJobs: this.stats.successfulJobs,
            failedJobs: this.stats.failedJobs,
            averageProcessingTime,
            currentlyProcessing: this.processingJobs.size,
            uptime,
            lastHealthCheck: new Date(),
            memoryUsage
        };
    }

    /**
     * Get all registered queues
     */
    public getQueues(): string[] {
        return Array.from(this.queues.keys());
    }

    /**
     * Get queue by name
     */
    public getQueue(name: string): JobQueue | undefined {
        return this.queues.get(name);
    }

    /**
     * Get currently processing jobs
     */
    public getCurrentlyProcessing(): ProcessingContext[] {
        return Array.from(this.processingJobs.values());
    }

    /**
     * Pause all queues
     */
    public pauseAll(): void {
        for (const queue of this.queues.values()) {
            queue.pause();
        }

        this.emit('allQueuesPaused', {
            processorName: this.config.name,
            timestamp: new Date()
        });
    }

    /**
     * Resume all queues
     */
    public resumeAll(): void {
        for (const queue of this.queues.values()) {
            queue.resume();
        }

        this.emit('allQueuesResumed', {
            processorName: this.config.name,
            timestamp: new Date()
        });
    }

    /**
     * Shutdown the processor
     */
    public async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        // Stop health checks
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        // Pause all queues
        this.pauseAll();

        // Wait for currently processing jobs to complete
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();

        while (this.processingJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Shutdown all queues
        for (const queue of this.queues.values()) {
            await queue.shutdown();
        }

        this.emit('processorShutdown', {
            processorName: this.config.name,
            timestamp: new Date(),
            processingJobsRemaining: this.processingJobs.size,
            totalJobsProcessed: this.stats.totalJobsProcessed
        });
    }
} 