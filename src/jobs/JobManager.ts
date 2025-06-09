/**
 * JobManager - Background job processing and orchestration
 * 
 * @package     @imajin/cli
 * @subpackage  jobs
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/jobs.md
 * 
 * Integration Points:
 * - Bull queue for background job processing
 * - Redis for job persistence and coordination
 * - Real-time progress tracking via WebSocket
 * - LLM-friendly JSON status responses
 */

import Bull, { Job, JobOptions, Queue } from 'bull';
import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger.js';
import type { JobProgress, JobStatus } from '../types/Jobs.js';

interface RedisOptions {
    host: string;
    port: number;
    password?: string;
}

export class JobManager extends EventEmitter {
    private queues: Map<string, Queue> = new Map();
    private logger: Logger;
    private redisConfig: RedisOptions;

    constructor(logger: Logger, redisConfig?: RedisOptions) {
        super();
        this.logger = logger;
        this.redisConfig = redisConfig || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
        };
    }

    /**
     * Create or get a queue for a specific job type
     */
    public getQueue(queueName: string): Queue {
        if (!this.queues.has(queueName)) {
            const queue = new Bull(queueName, {
                redis: this.redisConfig,
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            });

            // Set up queue event handlers
            this.setupQueueEvents(queue, queueName);
            this.queues.set(queueName, queue);

            this.logger.info(`Created job queue: ${queueName}`);
        }

        return this.queues.get(queueName)!;
    }

    /**
     * Add a job to a queue
     */
    public async addJob<T = any>(
        queueName: string,
        jobName: string,
        data: T,
        options?: JobOptions
    ): Promise<Job<T>> {
        const queue = this.getQueue(queueName);
        const job = await queue.add(jobName, data, options);

        this.logger.info(`Added job ${jobName} to queue ${queueName}`, {
            jobId: job.id?.toString(),
            queueName,
            jobName,
        });

        return job;
    }

    /**
     * Process jobs in a queue with a handler function
     */
    public process<T = any, R = any>(
        queueName: string,
        jobName: string,
        concurrency: number = 1,
        processor: (job: Job<T>) => Promise<R>
    ): void {
        const queue = this.getQueue(queueName);

        queue.process(jobName, concurrency, async (job: Job<T>) => {
            this.logger.info(`Processing job ${jobName}`, {
                jobId: job.id,
                queueName,
                jobName,
            });

            try {
                // Update progress to 0% started
                await job.progress(0);
                this.emitJobProgress(job, 0, 'Job started');

                // Execute the processor
                const result = await processor(job);

                // Update progress to 100% completed
                await job.progress(100);
                this.emitJobProgress(job, 100, 'Job completed');

                return result;
            } catch (error) {
                this.logger.error(`Job ${jobName} failed`, error instanceof Error ? error : new Error(String(error)), {
                    jobId: job.id,
                });
                throw error;
            }
        });

        this.logger.info(`Registered processor for ${jobName} in queue ${queueName}`);
    }

    /**
     * Get job status by ID
     */
    public async getJobStatus(queueName: string, jobId: string): Promise<JobStatus | null> {
        const queue = this.getQueue(queueName);
        const job = await queue.getJob(jobId);

        if (!job) {
            return null;
        }

        const state = await job.getState();
        const progress = job.progress();

        return {
            id: job.id!.toString(),
            name: job.name,
            queue: queueName,
            state,
            progress: typeof progress === 'number' ? progress : 0,
            data: job.data,
            result: job.returnvalue,
            error: job.failedReason,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts || 1,
        };
    }

    /**
     * List jobs in a queue with filtering
     */
    public async listJobs(
        queueName: string,
        types: Bull.JobStatus[] = ['active', 'waiting', 'completed', 'failed'],
        start = 0,
        end = 100
    ): Promise<JobStatus[]> {
        const queue = this.getQueue(queueName);
        const jobs = await queue.getJobs(types, start, end);

        return Promise.all(
            jobs.map(async (job) => {
                const state = await job.getState();
                const progress = job.progress();

                return {
                    id: job.id!.toString(),
                    name: job.name,
                    queue: queueName,
                    state,
                    progress: typeof progress === 'number' ? progress : 0,
                    data: job.data,
                    result: job.returnvalue,
                    error: job.failedReason,
                    createdAt: new Date(job.timestamp),
                    processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
                    finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
                    attempts: job.attemptsMade,
                    maxAttempts: job.opts.attempts || 1,
                };
            })
        );
    }

    /**
     * Cancel a job
     */
    public async cancelJob(queueName: string, jobId: string): Promise<boolean> {
        const queue = this.getQueue(queueName);
        const job = await queue.getJob(jobId);

        if (!job) {
            return false;
        }

        try {
            await job.remove();
            this.logger.info(`Cancelled job ${jobId} in queue ${queueName}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to cancel job ${jobId}`, error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    /**
     * Set up event handlers for a queue
     */
    private setupQueueEvents(queue: Queue, queueName: string): void {
        queue.on('completed', (job: Job, result: any) => {
            this.logger.info(`Job completed: ${job.name}`, {
                jobId: job.id,
                queueName,
            });

            this.emit('job:completed', {
                queueName,
                jobId: job.id?.toString() || '',
                jobName: job.name,
                result,
            });
        });

        queue.on('failed', (job: Job, error: Error) => {
            this.logger.error(`Job failed: ${job.name}`, error, {
                jobId: job.id,
                queueName,
            });

            this.emit('job:failed', {
                queueName,
                jobId: job.id?.toString() || '',
                jobName: job.name,
                error: error.message,
            });
        });

        queue.on('progress', (job: Job, progress: number) => {
            this.emitJobProgress(job, progress);
        });

        queue.on('active', (job: Job) => {
            this.logger.debug(`Job active: ${job.name}`, {
                jobId: job.id,
                queueName,
            });

            this.emit('job:active', {
                queueName,
                jobId: job.id?.toString() || '',
                jobName: job.name,
            });
        });
    }

    /**
     * Emit job progress event
     */
    private emitJobProgress(job: Job, progress: number, message?: string): void {
        const progressData: JobProgress = {
            queueName: job.queue.name,
            jobId: job.id!.toString(),
            jobName: job.name,
            progress,
            message: message || `Progress: ${progress}%`,
            timestamp: new Date(),
        };

        this.emit('job:progress', progressData);
    }

    /**
     * Get queue statistics
     */
    public async getQueueStats(queueName: string) {
        const queue = this.getQueue(queueName);

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed(),
        ]);

        return {
            queueName,
            counts: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
            },
            timestamp: new Date(),
        };
    }

    /**
     * Clean up completed/failed jobs
     */
    public async cleanQueue(
        queueName: string,
        grace: number = 24 * 60 * 60 * 1000 // 24 hours
    ): Promise<void> {
        const queue = this.getQueue(queueName);

        await queue.clean(grace, 'completed');
        await queue.clean(grace, 'failed');

        this.logger.info(`Cleaned queue ${queueName}`);
    }

    /**
     * Shutdown all queues gracefully
     */
    public async shutdown(): Promise<void> {
        this.logger.info('Shutting down job manager...');

        const shutdownPromises = Array.from(this.queues.values()).map(queue =>
            queue.close()
        );

        await Promise.all(shutdownPromises);
        this.queues.clear();

        this.logger.info('Job manager shutdown complete');
    }
} 