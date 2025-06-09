/**
 * Jobs - Type definitions for background job processing
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/jobs.md
 * 
 * Integration Points:
 * - Bull queue job status and progress tracking
 * - Real-time job progress updates via WebSocket
 * - LLM-friendly JSON job representations
 */

export type BullJobStatus = 'completed' | 'waiting' | 'active' | 'delayed' | 'failed' | 'stuck';

export interface JobDefinition {
    name: string;
    queue: string;
    description?: string;
    defaultOptions?: {
        attempts?: number;
        delay?: number;
        priority?: number;
        removeOnComplete?: number;
        removeOnFail?: number;
    };
}

export interface JobStatus {
    id: string;
    name: string;
    queue: string;
    state: BullJobStatus;
    progress: number;
    data: any;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
    attempts: number;
    maxAttempts: number;
}

export interface JobProgress {
    queueName: string;
    jobId: string;
    jobName: string;
    progress: number;
    message: string;
    timestamp: Date;
    data?: any;
}

export interface JobResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    duration: number;
    timestamp: Date;
    jobId: string;
    jobName: string;
}

export interface QueueStats {
    queueName: string;
    counts: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    timestamp: Date;
}

export interface JobEvent {
    type: 'progress' | 'completed' | 'failed' | 'active' | 'stalled';
    queueName: string;
    jobId: string;
    jobName: string;
    progress?: number;
    result?: any;
    error?: string;
    timestamp: Date;
}

// Specific job data types for common operations
export interface StripeJobData {
    operation: 'create-payment' | 'create-customer' | 'create-subscription' | 'cancel-subscription';
    parameters: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface WebhookJobData {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    retries?: number;
}

export interface ETLJobData {
    source: {
        type: 'api' | 'database' | 'file';
        config: Record<string, any>;
    };
    destination: {
        type: 'api' | 'database' | 'file';
        config: Record<string, any>;
    };
    transform?: {
        operations: Array<{
            type: 'map' | 'filter' | 'aggregate' | 'validate';
            config: Record<string, any>;
        }>;
    };
} 