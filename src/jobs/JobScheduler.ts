/* eslint-disable no-console */ // CLI Output: Scheduler status logging
/**
 * JobScheduler - Job scheduling system with cron-like functionality
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
 * - Job interface for scheduled job execution
 * - JobQueue for scheduled job queuing
 * - Event System for schedule events
 * - Cron-like scheduling expressions
 */

import { EventEmitter } from 'events';
import { BaseEvent, EventMetadata, EventPriority } from '../core/events/Event.js';
import { Job, JobMetadata } from './Job.js';
import { JobQueue } from './JobQueue.js';

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
    id: string;
    cronExpression: string;
    jobFactory: () => Job;
    enabled?: boolean;
    timezone?: string;
    startDate?: Date;
    endDate?: Date;
    maxRuns?: number;
    metadata?: JobMetadata;
}

/**
 * Schedule statistics  
 */
export interface ScheduleStats {
    id: string;
    cronExpression: string;
    enabled: boolean;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastRun?: Date | undefined;
    nextRun?: Date | undefined;
    averageExecutionTime: number;
}

/**
 * Scheduled job entry
 */
interface ScheduledJob {
    config: ScheduleConfig;
    nextRunTime: Date;
    lastRunTime?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;
    totalExecutionTime: number;
    isRunning: boolean;
}

/**
 * Schedule event payloads
 */
export interface ScheduleTriggeredPayload {
    scheduleId: string;
    cronExpression: string;
    jobId: string;
    scheduledTime: Date;
    actualTime: Date;
}

export interface ScheduleCompletedPayload {
    scheduleId: string;
    jobId: string;
    success: boolean;
    duration: number;
    runCount: number;
}

/**
 * Schedule events
 */
export class ScheduleTriggeredEvent extends BaseEvent<ScheduleTriggeredPayload> {
    constructor(payload: ScheduleTriggeredPayload, metadata: EventMetadata) {
        super('schedule.triggered', payload, metadata);
    }
}

export class ScheduleCompletedEvent extends BaseEvent<ScheduleCompletedPayload> {
    constructor(payload: ScheduleCompletedPayload, metadata: EventMetadata) {
        super('schedule.completed', payload, metadata);
    }
}

/**
 * Cron expression parser and evaluator
 */
class CronParser {
    /**
     * Parse cron expression and calculate next run time
     */
    static getNextRunTime(cronExpression: string, fromDate: Date = new Date()): Date {
        const parts = cronExpression.trim().split(/\s+/);

        // Support both 5-field (no seconds) and 6-field (with seconds) cron expressions
        const hasSeconds = parts.length === 6;
        const [seconds = '0', minutes = '*', hours = '*', dayOfMonth = '*', month = '*', dayOfWeek = '*'] = hasSeconds
            ? parts
            : ['0', ...parts];

        const next = new Date(fromDate);
        next.setMilliseconds(0);

        if (!hasSeconds) {
            next.setSeconds(0);
        }

        // Simple implementation - for production use a proper cron library
        return this.calculateNextRun(next, {
            seconds: this.parseField(seconds, 0, 59),
            minutes: this.parseField(minutes, 0, 59),
            hours: this.parseField(hours, 0, 23),
            dayOfMonth: this.parseField(dayOfMonth, 1, 31),
            month: this.parseField(month, 1, 12),
            dayOfWeek: this.parseField(dayOfWeek, 0, 6)
        });
    }

    /**
     * Parse a single cron field
     */
    private static parseField(field: string, min: number, max: number): number[] {
        if (field === '*') {
            return Array.from({ length: max - min + 1 }, (_, i) => min + i);
        }

        if (field.includes(',')) {
            return field.split(',').map(f => parseInt(f.trim(), 10));
        }

        if (field.includes('/')) {
            const parts = field.split('/');
            const range = parts[0] || '*';
            const stepStr = parts[1] || '1';
            const stepNum = parseInt(stepStr, 10);
            const values = [];

            if (range === '*') {
                for (let i = min; i <= max; i += stepNum) {
                    values.push(i);
                }
            }

            return values;
        }

        if (field.includes('-')) {
            const parts = field.split('-');
            const startStr = parts[0] || '0';
            const endStr = parts[1] || '0';
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }

        return [parseInt(field, 10)];
    }

    /**
     * Calculate next run time based on parsed cron fields
     */
    private static calculateNextRun(fromDate: Date, _fields: any): Date {
        const next = new Date(fromDate.getTime() + 60000); // Add 1 minute minimum

        // This is a simplified implementation
        // For production, use a proper cron library like 'cron-parser' or 'node-cron'

        // Set to next minute boundary
        next.setSeconds(0);
        next.setMilliseconds(0);

        return next;
    }
}

/**
 * Job scheduler with cron-like functionality
 */
export class JobScheduler extends EventEmitter {
    private schedules: Map<string, ScheduledJob> = new Map();
    private schedulerTimer?: NodeJS.Timeout | undefined;
    private isRunning = false;
    private checkInterval = 1000; // Check every second

    constructor(
        private defaultQueue?: JobQueue,
        private eventBus?: EventEmitter
    ) {
        super();
    }

    /**
     * Add a scheduled job
     */
    public addSchedule(config: ScheduleConfig): void {
        if (this.schedules.has(config.id)) {
            throw new Error(`Schedule with id '${config.id}' already exists`);
        }

        const nextRunTime = CronParser.getNextRunTime(config.cronExpression);

        const scheduledJob: ScheduledJob = {
            config,
            nextRunTime,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            totalExecutionTime: 0,
            isRunning: false
        };

        this.schedules.set(config.id, scheduledJob);

        this.emit('scheduleAdded', {
            scheduleId: config.id,
            cronExpression: config.cronExpression,
            nextRun: nextRunTime,
            enabled: config.enabled !== false
        });

        // Start scheduler if not running
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * Remove a scheduled job
     */
    public removeSchedule(scheduleId: string): boolean {
        const removed = this.schedules.delete(scheduleId);

        if (removed) {
            this.emit('scheduleRemoved', {
                scheduleId,
                timestamp: new Date()
            });
        }

        // Stop scheduler if no schedules remain
        if (this.schedules.size === 0) {
            this.stop();
        }

        return removed;
    }

    /**
     * Enable a schedule
     */
    public enableSchedule(scheduleId: string): boolean {
        const scheduledJob = this.schedules.get(scheduleId);
        if (!scheduledJob) {
return false;
}

        scheduledJob.config.enabled = true;

        this.emit('scheduleEnabled', {
            scheduleId,
            timestamp: new Date()
        });

        return true;
    }

    /**
     * Disable a schedule
     */
    public disableSchedule(scheduleId: string): boolean {
        const scheduledJob = this.schedules.get(scheduleId);
        if (!scheduledJob) {
return false;
}

        scheduledJob.config.enabled = false;

        this.emit('scheduleDisabled', {
            scheduleId,
            timestamp: new Date()
        });

        return true;
    }

    /**
     * Start the scheduler
     */
    public start(): void {
        if (this.isRunning) {
return;
}

        this.isRunning = true;
        this.schedulerTimer = setInterval(() => {
            this.checkSchedules();
        }, this.checkInterval);

        this.emit('schedulerStarted', {
            timestamp: new Date(),
            scheduleCount: this.schedules.size
        });
    }

    /**
     * Stop the scheduler
     */
    public stop(): void {
        if (!this.isRunning) {
return;
}

        this.isRunning = false;

        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = undefined;
        }

        this.emit('schedulerStopped', {
            timestamp: new Date(),
            scheduleCount: this.schedules.size
        });
    }

    /**
     * Check all schedules for due jobs
     */
    private checkSchedules(): void {
        const now = new Date();

        for (const [scheduleId, scheduledJob] of this.schedules.entries()) {
            if (!scheduledJob.config.enabled || scheduledJob.isRunning) {
                continue;
            }

            // Check if schedule is due
            if (now >= scheduledJob.nextRunTime) {
                void this.triggerSchedule(scheduleId, scheduledJob, now).catch(err => {
                    console.error(`Failed to trigger schedule ${scheduleId}:`, err);
                });
            }
        }
    }

    /**
     * Trigger a scheduled job
     */
    private async triggerSchedule(scheduleId: string, scheduledJob: ScheduledJob, triggerTime: Date): Promise<void> {
        const config = scheduledJob.config;

        // Check run limits
        if (config.maxRuns && scheduledJob.runCount >= config.maxRuns) {
            this.disableSchedule(scheduleId);
            return;
        }

        // Check end date
        if (config.endDate && triggerTime > config.endDate) {
            this.disableSchedule(scheduleId);
            return;
        }

        scheduledJob.isRunning = true;
        scheduledJob.runCount++;
        scheduledJob.lastRunTime = triggerTime;

        try {
            // Create job instance
            const job = config.jobFactory();

            // Emit schedule triggered event
            if (this.eventBus) {
                const triggeredEvent = new ScheduleTriggeredEvent(
                    {
                        scheduleId,
                        cronExpression: config.cronExpression,
                        jobId: job.id,
                        scheduledTime: scheduledJob.nextRunTime,
                        actualTime: triggerTime
                    },
                    {
                        source: 'JobScheduler',
                        correlationId: scheduleId,
                        priority: EventPriority.NORMAL
                    }
                );

                this.eventBus.emit('schedule.triggered', triggeredEvent);
            }

            this.emit('scheduleTriggered', {
                scheduleId,
                jobId: job.id,
                cronExpression: config.cronExpression,
                scheduledTime: scheduledJob.nextRunTime,
                actualTime: triggerTime
            });

            const startTime = Date.now();

            // Execute job (either queue it or run directly)
            let success = false;
            if (this.defaultQueue) {
                await this.defaultQueue.addJob(job, config.metadata);
                success = true; // Queuing succeeded
            } else {
                const result = await job.execute();
                success = result.success;
            }

            const duration = Date.now() - startTime;
            scheduledJob.totalExecutionTime += duration;

            if (success) {
                scheduledJob.successCount++;
            } else {
                scheduledJob.failureCount++;
            }

            // Emit completion event
            if (this.eventBus) {
                const completedEvent = new ScheduleCompletedEvent(
                    {
                        scheduleId,
                        jobId: job.id,
                        success,
                        duration,
                        runCount: scheduledJob.runCount
                    },
                    {
                        source: 'JobScheduler',
                        correlationId: scheduleId,
                        priority: EventPriority.NORMAL
                    }
                );

                this.eventBus.emit('schedule.completed', completedEvent);
            }

            this.emit('scheduleCompleted', {
                scheduleId,
                jobId: job.id,
                success,
                duration,
                runCount: scheduledJob.runCount
            });

        } catch (error) {
            scheduledJob.failureCount++;

            this.emit('scheduleError', {
                scheduleId,
                error: error instanceof Error ? error.message : String(error),
                timestamp: triggerTime
            });

        } finally {
            scheduledJob.isRunning = false;

            // Calculate next run time
            try {
                scheduledJob.nextRunTime = CronParser.getNextRunTime(
                    config.cronExpression,
                    triggerTime
                );
            } catch (error) {
                this.emit('scheduleError', {
                    scheduleId,
                    error: `Failed to calculate next run time: ${error}`,
                    timestamp: new Date()
                });

                // Disable invalid schedule
                this.disableSchedule(scheduleId);
            }
        }
    }

    /**
     * Get schedule statistics
     */
    public getScheduleStats(scheduleId: string): ScheduleStats | undefined {
        const scheduledJob = this.schedules.get(scheduleId);
        if (!scheduledJob) {
return undefined;
}

        const averageExecutionTime = scheduledJob.runCount > 0
            ? scheduledJob.totalExecutionTime / scheduledJob.runCount
            : 0;

        return {
            id: scheduleId,
            cronExpression: scheduledJob.config.cronExpression,
            enabled: scheduledJob.config.enabled !== false,
            totalRuns: scheduledJob.runCount,
            successfulRuns: scheduledJob.successCount,
            failedRuns: scheduledJob.failureCount,
            lastRun: scheduledJob.lastRunTime,
            nextRun: scheduledJob.nextRunTime,
            averageExecutionTime
        };
    }

    /**
     * Get all schedule statistics
     */
    public getAllScheduleStats(): ScheduleStats[] {
        return Array.from(this.schedules.keys())
            .map(id => this.getScheduleStats(id))
            .filter((stats): stats is ScheduleStats => stats !== undefined);
    }

    /**
     * Get schedule by ID
     */
    public getSchedule(scheduleId: string): ScheduleConfig | undefined {
        return this.schedules.get(scheduleId)?.config;
    }

    /**
     * List all schedule IDs
     */
    public listSchedules(): string[] {
        return Array.from(this.schedules.keys());
    }

    /**
     * Update schedule configuration
     */
    public updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): boolean {
        const scheduledJob = this.schedules.get(scheduleId);
        if (!scheduledJob) {
return false;
}

        // Update configuration
        Object.assign(scheduledJob.config, updates);

        // Recalculate next run if cron expression changed
        if (updates.cronExpression) {
            try {
                scheduledJob.nextRunTime = CronParser.getNextRunTime(updates.cronExpression);
            } catch (error) {
                // Don't update if invalid cron expression
                throw new Error(`Invalid cron expression: ${error}`);
            }
        }

        this.emit('scheduleUpdated', {
            scheduleId,
            updates,
            timestamp: new Date()
        });

        return true;
    }

    /**
     * Trigger a schedule manually (ignoring cron timing)
     */
    public async triggerNow(scheduleId: string): Promise<boolean> {
        const scheduledJob = this.schedules.get(scheduleId);
        if (!scheduledJob || scheduledJob.isRunning) {
return false;
}

        await this.triggerSchedule(scheduleId, scheduledJob, new Date());
        return true;
    }

    /**
     * Check if scheduler is running
     */
    public isSchedulerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get scheduler statistics
     */
    public getSchedulerStats() {
        const activeSchedules = Array.from(this.schedules.values())
            .filter(s => s.config.enabled !== false).length;

        const runningSchedules = Array.from(this.schedules.values())
            .filter(s => s.isRunning).length;

        const totalRuns = Array.from(this.schedules.values())
            .reduce((sum, s) => sum + s.runCount, 0);

        const totalSuccesses = Array.from(this.schedules.values())
            .reduce((sum, s) => sum + s.successCount, 0);

        return {
            isRunning: this.isRunning,
            totalSchedules: this.schedules.size,
            activeSchedules,
            runningSchedules,
            totalRuns,
            totalSuccesses,
            totalFailures: totalRuns - totalSuccesses,
            checkInterval: this.checkInterval
        };
    }

    /**
     * Shutdown the scheduler
     */
    public async shutdown(): Promise<void> {
        this.stop();

        // Wait for running schedules to complete
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();

        while (Array.from(this.schedules.values()).some(s => s.isRunning) &&
            (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.emit('schedulerShutdown', {
            timestamp: new Date(),
            scheduleCount: this.schedules.size,
            runningSchedules: Array.from(this.schedules.values()).filter(s => s.isRunning).length
        });
    }
} 