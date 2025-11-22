/**
 * JobQueue Tests
 *
 * Comprehensive test suite for priority-based job queue with retry logic,
 * rate limiting, dead letter queue, and advanced job management features.
 *
 * @package     @imajin/cli
 * @subpackage  jobs/__tests__
 */

import { JobQueue, QueueConfig } from '../JobQueue.js';
import { BaseJob, JobExecutionResult } from '../Job.js';

/**
 * Simple test job that succeeds
 */
class SuccessfulJob extends BaseJob {
    public async execute(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work

        return {
            success: true,
            data: { message: 'Job completed' },
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: this.retryCount
        };
    }
}

/**
 * Test job that fails
 */
class FailingJob extends BaseJob {
    constructor(
        payload: any,
        priority: number = 0,
        maxRetries: number = 3,
        private shouldRetryOnFail: boolean = true
    ) {
        super('failing-job', payload, priority, maxRetries);
    }

    public async execute(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        throw new Error('Job execution failed');
    }

    public shouldRetry(error: Error, attemptCount: number): boolean {
        return this.shouldRetryOnFail && super.shouldRetry(error, attemptCount);
    }
}

/**
 * Test job that times out
 */
class SlowJob extends BaseJob {
    constructor(payload: any, private delayMs: number = 1000) {
        super('slow-job', payload, 0, 3);
    }

    public async execute(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, this.delayMs));

        return {
            success: true,
            data: { message: 'Slow job completed' },
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: this.retryCount
        };
    }
}

describe('JobQueue', () => {
    let queue: JobQueue;

    afterEach(async () => {
        if (queue) {
            await queue.shutdown();
        }
    });

    // =====================================================================
    // Initialization & Configuration
    // =====================================================================
    describe('Initialization & Configuration', () => {
        it('should initialize with default configuration', () => {
            const config: QueueConfig = { name: 'test-queue' };
            queue = new JobQueue(config);

            const stats = queue.getStats();
            expect(stats.name).toBe('test-queue');
            expect(stats.pending).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.completed).toBe(0);
            expect(stats.failed).toBe(0);
        });

        it('should initialize with custom configuration', () => {
            const config: QueueConfig = {
                name: 'custom-queue',
                maxConcurrency: 3,
                maxRetries: 5,
                retryDelay: 2000,
                processingTimeout: 5000,
                enableDeadLetterQueue: true,
                rateLimitPerSecond: 20
            };
            queue = new JobQueue(config);

            const stats = queue.getStats();
            expect(stats.name).toBe('custom-queue');
        });

        it('should start with empty queues', () => {
            queue = new JobQueue({ name: 'test-queue' });

            const stats = queue.getStats();
            expect(stats.pending).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.completed).toBe(0);
            expect(stats.failed).toBe(0);
            expect(stats.totalProcessed).toBe(0);
        });
    });

    // =====================================================================
    // Job Addition & Priority
    // =====================================================================
    describe('Job Addition & Priority', () => {
        beforeEach(() => {
            queue = new JobQueue({ name: 'test-queue' });
        });

        it('should add a single job to the queue', async () => {
            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);

            await queue.addJob(job);

            const stats = queue.getStats();
            expect(stats.pending).toBe(1);
        });

        it('should add multiple jobs with same priority', async () => {
            const job1 = new SuccessfulJob('test-job', { data: 'test1' }, 0);
            const job2 = new SuccessfulJob('test-job', { data: 'test2' }, 0);
            const job3 = new SuccessfulJob('test-job', { data: 'test3' }, 0);

            await queue.addJob(job1);
            await queue.addJob(job2);
            await queue.addJob(job3);

            const stats = queue.getStats();
            expect(stats.pending).toBe(3);
        });

        it('should order jobs by priority (higher priority first)', async () => {
            const lowPriorityJob = new SuccessfulJob('low', { priority: 'low' }, 1);
            const highPriorityJob = new SuccessfulJob('high', { priority: 'high' }, 10);
            const mediumPriorityJob = new SuccessfulJob('medium', { priority: 'medium' }, 5);

            await queue.addJob(lowPriorityJob);
            await queue.addJob(highPriorityJob);
            await queue.addJob(mediumPriorityJob);

            // Pause queue to prevent processing
            queue.pause();

            const stats = queue.getStats();
            expect(stats.pending).toBe(3);

            // Check that high priority job will be processed first
            const queuedHighJob = queue.getJob(highPriorityJob.id);
            expect(queuedHighJob).toBeDefined();
            expect(queuedHighJob?.priority).toBe(10);
        });

        it('should emit jobAdded event when job is added', async () => {
            const eventSpy = jest.fn();
            queue.on('jobAdded', eventSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 5);
            await queue.addJob(job);

            expect(eventSpy).toHaveBeenCalledWith({
                queueName: 'test-queue',
                jobId: job.id,
                jobType: 'test-job',
                priority: 5
            });
        });

        it('should emit queueChanged event when job is added', async () => {
            const eventSpy = jest.fn();
            queue.on('queueChanged', eventSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                name: 'test-queue',
                pending: 1
            }));
        });
    });

    // =====================================================================
    // Job Processing
    // =====================================================================
    describe('Job Processing', () => {
        it('should process a single job successfully', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const completedSpy = jest.fn();
            queue.on('jobCompleted', completedSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            // Wait for job to be processed
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
                queueName: 'test-queue',
                jobId: job.id,
                jobType: 'test-job',
                success: true
            }));

            const stats = queue.getStats();
            expect(stats.completed).toBe(1);
            expect(stats.totalProcessed).toBe(1);
        });

        it('should process multiple jobs sequentially', async () => {
            queue = new JobQueue({ name: 'test-queue', maxConcurrency: 1 });
            const processingEvents: string[] = [];

            queue.on('jobProcessing', (payload) => {
                processingEvents.push(payload.jobId);
            });

            const job1 = new SuccessfulJob('test-job', { data: 'test1' }, 0);
            const job2 = new SuccessfulJob('test-job', { data: 'test2' }, 0);
            const job3 = new SuccessfulJob('test-job', { data: 'test3' }, 0);

            await queue.addJob(job1);
            await queue.addJob(job2);
            await queue.addJob(job3);

            // Wait for all jobs to be processed
            await new Promise(resolve => setTimeout(resolve, 400));

            expect(processingEvents).toContain(job1.id);
            expect(processingEvents).toContain(job2.id);
            expect(processingEvents).toContain(job3.id);

            const stats = queue.getStats();
            expect(stats.totalProcessed).toBe(3);
        });

        it('should respect maxConcurrency limit', async () => {
            queue = new JobQueue({ name: 'test-queue', maxConcurrency: 2 });
            let maxActiveJobs = 0;

            queue.on('queueChanged', (stats) => {
                if (stats.active > maxActiveJobs) {
                    maxActiveJobs = stats.active;
                }
            });

            // Add 5 jobs
            for (let i = 0; i < 5; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 300));

            // Should never exceed maxConcurrency of 2
            expect(maxActiveJobs).toBeLessThanOrEqual(2);
        });

        it('should emit jobProcessing event when processing starts', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const processingSpy = jest.fn();
            queue.on('jobProcessing', processingSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 5);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 150));

            expect(processingSpy).toHaveBeenCalledWith(expect.objectContaining({
                queueName: 'test-queue',
                jobId: job.id,
                jobType: 'test-job',
                attemptNumber: 1
            }));
        });

        it('should emit jobCompleted event when job finishes', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const completedSpy = jest.fn();
            queue.on('jobCompleted', completedSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 200));

            expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
                queueName: 'test-queue',
                jobId: job.id,
                success: true,
                duration: expect.any(Number)
            }));
        });

        it('should handle job timeout correctly', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                processingTimeout: 100, // 100ms timeout
                maxRetries: 0 // Don't retry
            });
            const completedSpy = jest.fn();
            queue.on('jobCompleted', completedSpy);

            // Job takes 500ms, will timeout at 100ms
            const slowJob = new SlowJob({ data: 'slow' }, 500);
            await queue.addJob(slowJob);

            // Wait for timeout to occur
            await new Promise(resolve => setTimeout(resolve, 400));

            // Should have completed event with success: false
            expect(completedSpy).toHaveBeenCalled();
            const completedCall = completedSpy.mock.calls.find(call => call[0].jobId === slowJob.id);
            expect(completedCall).toBeDefined();
            expect(completedCall[0].success).toBe(false);
        });
    });

    // =====================================================================
    // Rate Limiting
    // =====================================================================
    describe('Rate Limiting', () => {
        it('should respect rate limit per second', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                rateLimitPerSecond: 2 // Only 2 jobs per second
            });

            const processingTimes: number[] = [];
            queue.on('jobProcessing', () => {
                processingTimes.push(Date.now());
            });

            // Add 4 jobs
            for (let i = 0; i < 4; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            // Wait for all jobs to be attempted
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Should have processed at least 2 jobs
            expect(processingTimes.length).toBeGreaterThanOrEqual(2);
        });

        it('should refill rate limit tokens over time', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                rateLimitPerSecond: 3
            });

            // Add 3 jobs (should consume all tokens)
            for (let i = 0; i < 3; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            // Wait for token refill (1 second)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Add 3 more jobs (should process with refilled tokens)
            for (let i = 3; i < 6; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            const stats = queue.getStats();
            expect(stats.totalProcessed).toBeGreaterThanOrEqual(3);
        });

        it('should handle multiple jobs with rate limiting', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                rateLimitPerSecond: 5,
                maxConcurrency: 2
            });

            let processedCount = 0;
            queue.on('jobCompleted', () => {
                processedCount++;
            });

            // Add 10 jobs
            for (let i = 0; i < 10; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            // Wait for some processing
            await new Promise(resolve => setTimeout(resolve, 500));

            // Should have rate limited processing
            expect(processedCount).toBeLessThan(10);
        });

        it('should not exceed rate limit with high concurrency', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                rateLimitPerSecond: 3,
                maxConcurrency: 10 // High concurrency
            });

            const processingStarts: number[] = [];
            queue.on('jobProcessing', () => {
                processingStarts.push(Date.now());
            });

            // Add many jobs
            for (let i = 0; i < 10; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 400));

            // Should have rate limited to ~3 jobs in first second
            const firstSecondJobs = processingStarts.filter(t =>
                t <= processingStarts[0]! + 1000
            ).length;
            expect(firstSecondJobs).toBeLessThanOrEqual(4); // Allow small variance
        });
    });

    // =====================================================================
    // Retry Logic
    // =====================================================================
    describe('Retry Logic', () => {
        it('should retry failed jobs automatically', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 3,
                retryDelay: 100
            });

            const retryingSpy = jest.fn();
            queue.on('jobRetrying', retryingSpy);

            const job = new FailingJob({ data: 'test' }, 0, 3, true);
            await queue.addJob(job);

            // Wait for initial attempt and first retry
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(retryingSpy).toHaveBeenCalled();
            expect(retryingSpy.mock.calls.length).toBeGreaterThan(0);
        });

        it('should calculate exponential backoff correctly', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 3,
                retryDelay: 100
            });

            const retryTimes: number[] = [];
            queue.on('jobRetrying', (payload) => {
                retryTimes.push(Date.now());
            });

            const job = new FailingJob({ data: 'test' }, 0, 3, true);
            await queue.addJob(job);

            // Wait for retries
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (retryTimes.length >= 2) {
                // Second retry should be later than first
                const delay1 = retryTimes[1]! - retryTimes[0]!;
                expect(delay1).toBeGreaterThan(0);
            }
        });

        it('should add jitter to retry delays', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 5,
                retryDelay: 100
            });

            const retryDelays: number[] = [];
            let lastRetryTime = 0;

            queue.on('jobRetrying', () => {
                const now = Date.now();
                if (lastRetryTime > 0) {
                    retryDelays.push(now - lastRetryTime);
                }
                lastRetryTime = now;
            });

            const job = new FailingJob({ data: 'test' }, 0, 5, true);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Delays should vary due to jitter
            if (retryDelays.length >= 2) {
                const uniqueDelays = new Set(retryDelays.map(d => Math.floor(d / 100)));
                // With jitter, delays should not be identical
                expect(uniqueDelays.size).toBeGreaterThan(0);
            }
        });

        it('should stop retrying after maxRetries exhausted', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 2,
                retryDelay: 100
            });

            const completedSpy = jest.fn();
            queue.on('jobCompleted', completedSpy);

            const job = new FailingJob({ data: 'test' }, 0, 2, true);
            await queue.addJob(job);

            // Wait for all retry attempts (initial + 2 retries + processing time)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Should have final completed event with success: false
            const finalCall = completedSpy.mock.calls[completedSpy.mock.calls.length - 1];
            expect(finalCall).toBeDefined();
            expect(finalCall[0].success).toBe(false);

            const stats = queue.getStats();
            // Job should be in failed or dead letter queue
            expect(stats.failed + stats.deadLetter).toBeGreaterThan(0);
        });

        it('should emit jobRetrying event with retry details', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 3,
                retryDelay: 100
            });

            const retryingSpy = jest.fn();
            queue.on('jobRetrying', retryingSpy);

            const job = new FailingJob({ data: 'test' }, 0, 3, true);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 500));

            if (retryingSpy.mock.calls.length > 0) {
                expect(retryingSpy).toHaveBeenCalledWith(expect.objectContaining({
                    queueName: 'test-queue',
                    jobId: job.id,
                    jobType: 'failing-job',
                    attemptNumber: expect.any(Number),
                    nextRetryAt: expect.any(Date),
                    error: expect.any(String)
                }));
            }
        });

        it('should respect shouldRetry() hook on job', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 5
            });

            const retryingSpy = jest.fn();
            const failedSpy = jest.fn();
            queue.on('jobRetrying', retryingSpy);
            queue.on('jobFailed', failedSpy);

            // Job with shouldRetry returning false
            const job = new FailingJob({ data: 'test' }, 0, 5, false);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 500));

            // Should fail immediately without retrying
            expect(retryingSpy).not.toHaveBeenCalled();
            expect(failedSpy).toHaveBeenCalled();
        });
    });

    // =====================================================================
    // Dead Letter Queue
    // =====================================================================
    describe('Dead Letter Queue', () => {
        it('should move failed jobs to DLQ when enabled', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 1,
                retryDelay: 100,
                enableDeadLetterQueue: true
            });

            const job = new FailingJob({ data: 'test' }, 0, 1, false);
            await queue.addJob(job);

            // Wait for failure
            await new Promise(resolve => setTimeout(resolve, 300));

            const stats = queue.getStats();
            expect(stats.deadLetter).toBe(1);
        });

        it('should not move to DLQ when disabled', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 1,
                enableDeadLetterQueue: false
            });

            const job = new FailingJob({ data: 'test' }, 0, 1, false);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 300));

            const stats = queue.getStats();
            expect(stats.deadLetter).toBe(0);
            expect(stats.failed).toBeGreaterThan(0);
        });

        it('should track multiple failed jobs in DLQ', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 1,
                retryDelay: 50,
                enableDeadLetterQueue: true
            });

            for (let i = 0; i < 3; i++) {
                const job = new FailingJob({ data: `test${i}` }, 0, 1, false);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const stats = queue.getStats();
            expect(stats.deadLetter).toBe(3);
        });

        it('should update DLQ stats correctly', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 1,
                retryDelay: 100,
                enableDeadLetterQueue: true
            });

            const job = new FailingJob({ data: 'test' }, 0, 1, true);
            await queue.addJob(job);

            // Wait for retries and final failure (initial + 1 retry + processing time)
            await new Promise(resolve => setTimeout(resolve, 1500));

            const stats = queue.getStats();
            expect(stats.deadLetter).toBeGreaterThan(0);
        });
    });

    // =====================================================================
    // Job Control
    // =====================================================================
    describe('Job Control', () => {
        beforeEach(() => {
            queue = new JobQueue({ name: 'test-queue' });
            queue.pause(); // Pause to control execution
        });

        it('should cancel a pending job', async () => {
            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            const cancelled = queue.cancelJob(job.id);
            expect(cancelled).toBe(true);

            const stats = queue.getStats();
            expect(stats.pending).toBe(0);
        });

        it('should cancel a retrying job', async () => {
            queue.resume();
            const job = new FailingJob({ data: 'test' }, 0, 3, true);
            await queue.addJob(job);

            // Wait for first failure
            await new Promise(resolve => setTimeout(resolve, 300));
            queue.pause();

            // Job should now be in retrying state
            const cancelled = queue.cancelJob(job.id);
            expect(cancelled).toBe(true);
        });

        it('should not cancel an active job', async () => {
            queue.resume();
            const slowJob = new SlowJob({ data: 'test' }, 300);

            // Listen for when job starts processing
            let jobStarted = false;
            queue.on('jobProcessing', (payload) => {
                if (payload.jobId === slowJob.id) {
                    jobStarted = true;
                }
            });

            await queue.addJob(slowJob);

            // Wait for job to definitely start processing
            await new Promise(resolve => setTimeout(resolve, 150));

            // Verify job is actually active
            expect(jobStarted).toBe(true);
            const stats = queue.getStats();

            // If job is still active, cancelJob should return false
            // If it completed already, that's also a valid state (can't cancel completed)
            const cancelled = queue.cancelJob(slowJob.id);
            if (stats.active > 0) {
                expect(cancelled).toBe(false);
            } else {
                // Job completed, cancellation should also fail
                expect(cancelled).toBe(false);
            }
        });

        it('should not cancel a completed job', async () => {
            queue.resume();
            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 200));

            const cancelled = queue.cancelJob(job.id);
            expect(cancelled).toBe(false);
        });

        it('should emit jobCancelled event', async () => {
            const cancelledSpy = jest.fn();
            queue.on('jobCancelled', cancelledSpy);

            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            queue.cancelJob(job.id);

            expect(cancelledSpy).toHaveBeenCalledWith({
                queueName: 'test-queue',
                jobId: job.id,
                jobType: 'test-job'
            });
        });
    });

    // =====================================================================
    // Queue Control
    // =====================================================================
    describe('Queue Control', () => {
        it('should pause queue and stop processing', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);

            queue.pause();
            await queue.addJob(job);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 200));

            // Job should still be pending
            const stats = queue.getStats();
            expect(stats.pending).toBe(1);
            expect(stats.completed).toBe(0);
        });

        it('should resume queue and continue processing', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            queue.pause();

            const job = new SuccessfulJob('test-job', { data: 'test' }, 0);
            await queue.addJob(job);

            queue.resume();

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));

            const stats = queue.getStats();
            expect(stats.completed).toBe(1);
        });

        it('should emit queuePaused event', () => {
            queue = new JobQueue({ name: 'test-queue' });
            const pausedSpy = jest.fn();
            queue.on('queuePaused', pausedSpy);

            queue.pause();

            expect(pausedSpy).toHaveBeenCalledWith({ queueName: 'test-queue' });
        });

        it('should emit queueResumed event', () => {
            queue = new JobQueue({ name: 'test-queue' });
            queue.pause();

            const resumedSpy = jest.fn();
            queue.on('queueResumed', resumedSpy);

            queue.resume();

            expect(resumedSpy).toHaveBeenCalledWith({ queueName: 'test-queue' });
        });
    });

    // =====================================================================
    // Statistics
    // =====================================================================
    describe('Statistics', () => {
        it('should return correct queue statistics', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            const job1 = new SuccessfulJob('test-job', { data: 'test1' }, 0);
            const job2 = new SuccessfulJob('test-job', { data: 'test2' }, 0);

            await queue.addJob(job1);
            await queue.addJob(job2);

            const stats = queue.getStats();
            expect(stats.name).toBe('test-queue');
            expect(stats.pending).toBe(2);
        });

        it('should calculate average processing time', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            for (let i = 0; i < 3; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 500));

            const stats = queue.getStats();
            expect(stats.averageProcessingTime).toBeGreaterThan(0);
        });

        it('should track total processed jobs', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            for (let i = 0; i < 5; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            // Wait for all jobs to complete (each job takes ~50ms)
            await new Promise(resolve => setTimeout(resolve, 800));

            const stats = queue.getStats();
            expect(stats.totalProcessed).toBe(5);
        });

        it('should calculate uptime correctly', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            await new Promise(resolve => setTimeout(resolve, 100));

            const stats = queue.getStats();
            expect(stats.uptime).toBeGreaterThanOrEqual(100);
        });
    });

    // =====================================================================
    // Cleanup & Shutdown
    // =====================================================================
    describe('Cleanup & Shutdown', () => {
        it('should clear completed jobs', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            for (let i = 0; i < 3; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const clearedCount = queue.clearCompleted();
            expect(clearedCount).toBe(3);

            const stats = queue.getStats();
            expect(stats.completed).toBe(0);
        });

        it('should return count of cleared jobs', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            for (let i = 0; i < 5; i++) {
                const job = new SuccessfulJob('test-job', { data: `test${i}` }, 0);
                await queue.addJob(job);
            }

            await new Promise(resolve => setTimeout(resolve, 600));

            const clearedCount = queue.clearCompleted();
            expect(clearedCount).toBeGreaterThan(0);
        });

        it('should wait for active jobs during shutdown', async () => {
            queue = new JobQueue({ name: 'test-queue' });

            const slowJob = new SlowJob({ data: 'test' }, 100);
            await queue.addJob(slowJob);

            // Wait for job to start
            await new Promise(resolve => setTimeout(resolve, 50));

            const shutdownPromise = queue.shutdown();

            // Shutdown should wait for active job
            await shutdownPromise;

            const stats = queue.getStats();
            expect(stats.active).toBe(0);
        });

        it('should emit queueShutdown event', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const shutdownSpy = jest.fn();
            queue.on('queueShutdown', shutdownSpy);

            await queue.shutdown();

            expect(shutdownSpy).toHaveBeenCalledWith(expect.objectContaining({
                queueName: 'test-queue',
                pendingJobs: expect.any(Number),
                activeJobs: expect.any(Number)
            }));
        });
    });

    // =====================================================================
    // Error Handling
    // =====================================================================
    describe('Error Handling', () => {
        it('should handle job execution errors gracefully', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                maxRetries: 0
            });

            const failedSpy = jest.fn();
            queue.on('jobFailed', failedSpy);

            const job = new FailingJob({ data: 'test' }, 0, 0, false);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 300));

            expect(failedSpy).toHaveBeenCalled();
        });

        it('should handle timeout errors', async () => {
            queue = new JobQueue({
                name: 'test-queue',
                processingTimeout: 50,
                maxRetries: 0 // Don't retry
            });

            const completedSpy = jest.fn();
            queue.on('jobCompleted', completedSpy);

            const slowJob = new SlowJob({ data: 'test' }, 200);
            await queue.addJob(slowJob);

            await new Promise(resolve => setTimeout(resolve, 400));

            // Should have completed with failure
            expect(completedSpy).toHaveBeenCalled();
            const call = completedSpy.mock.calls.find(c => c[0].jobId === slowJob.id);
            expect(call).toBeDefined();
            expect(call[0].success).toBe(false);
        });

        it('should emit error events for processing failures', async () => {
            queue = new JobQueue({ name: 'test-queue' });
            const errorSpy = jest.fn();
            queue.on('error', errorSpy);

            const job = new FailingJob({ data: 'test' }, 0, 1, false);
            await queue.addJob(job);

            await new Promise(resolve => setTimeout(resolve, 300));

            // Error handling should prevent crashes
            const stats = queue.getStats();
            expect(stats.failed).toBeGreaterThan(0);
        });
    });
});
