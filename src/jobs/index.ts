/**
 * Jobs Module - Background job processing system
 * 
 * @package     @imajin/cli
 * @subpackage  jobs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Event System for progress tracking
 * - Service Layer for business logic
 * - Repository Pattern for data access
 * - ETL Pipeline system for data processing
 */

// Core job interfaces and implementations
export {
    BaseJob, DataProcessingJob, HttpRequestJob, Job, JobCompletedEvent, JobCompletedPayload, JobExecutionResult, JobFailedEvent, JobFailedPayload, JobMetadata, JobProgressEvent, JobProgressPayload
} from './Job.js';

// Job queue management
export {
    JobQueue,
    QueueConfig, QueueJobAddedEvent, QueueJobAddedPayload, QueueJobCompletedEvent, QueueJobCompletedPayload, QueueJobProcessingEvent, QueueJobProcessingPayload, QueueStats
} from './JobQueue.js';

// Job execution engine
export {
    JobProcessor, ProcessingContext, ProcessorConfig,
    ProcessorStats
} from './JobProcessor.js';

// Job scheduling system
export {
    JobScheduler, ScheduleCompletedEvent, ScheduleCompletedPayload, ScheduleConfig,
    ScheduleStats, ScheduleTriggeredEvent, ScheduleTriggeredPayload
} from './JobScheduler.js';

// Legacy job manager for backward compatibility
export { JobManager } from './JobManager.js';
