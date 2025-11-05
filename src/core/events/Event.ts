/**
 * Event - Base event interface and types for event-driven architecture
 * 
 * @package     @imajin/cli
 * @subpackage  core/events
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Type-safe event definitions
 * - Event metadata and serialization
 * - Event versioning and backward compatibility
 * - Foundation for real-time communication
 */

/**
 * Base event interface that all events must implement
 */
export interface IEvent<T = any> {
    readonly type: string;
    readonly id: string;
    readonly timestamp: Date;
    readonly version: string;
    readonly payload: T;
    readonly metadata: EventMetadata;
}

/**
 * Event metadata for tracking and processing
 */
export interface EventMetadata {
    readonly source: string;
    readonly correlationId?: string;
    readonly userId?: string;
    readonly sessionId?: string;
    readonly tags?: Record<string, string>;
    readonly priority?: EventPriority;
    readonly retryCount?: number;
    readonly maxRetries?: number;
}

/**
 * Event priority levels
 */
export enum EventPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Event listener interface
 */
export interface IEventListener<T = any> {
    readonly name: string;
    readonly eventType: string;
    readonly priority?: number;
    handle(event: IEvent<T>): Promise<void> | void;
}

/**
 * Event subscriber interface for multiple event types
 */
export interface IEventSubscriber {
    getSubscribedEvents(): Record<string, string | string[]>;
}

/**
 * Base abstract event class
 */
export abstract class BaseEvent<T = any> implements IEvent<T> {
    public readonly id: string;
    public readonly timestamp: Date;
    public readonly version: string = '1.0.0';

    constructor(
        public readonly type: string,
        public readonly payload: T,
        public readonly metadata: EventMetadata
    ) {
        this.id = this.generateId();
        this.timestamp = new Date();
    }

    /**
     * Generate unique event ID
     */
    private generateId(): string {
        return `${this.type}_${Date.now()}_${(()=>{const{randomBytes}=require("crypto");const b=randomBytes(6);return b.toString("base64").replace(/[^a-z0-9]/gi,"").toLowerCase().substring(0,9);})()}`;
    }

    /**
     * Serialize event to JSON
     */
    public toJSON(): string {
        return JSON.stringify({
            type: this.type,
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            version: this.version,
            payload: this.payload,
            metadata: this.metadata
        });
    }

    /**
     * Create event from JSON
     */
    public static fromJSON<T>(json: string): IEvent<T> {
        const data = JSON.parse(json);
        return {
            type: data.type,
            id: data.id,
            timestamp: new Date(data.timestamp),
            version: data.version,
            payload: data.payload,
            metadata: data.metadata
        };
    }
}

/**
 * System event types
 */
export enum SystemEventType {
    APPLICATION_STARTED = 'application.started',
    APPLICATION_STOPPING = 'application.stopping',
    APPLICATION_STOPPED = 'application.stopped',
    COMMAND_STARTED = 'command.started',
    COMMAND_COMPLETED = 'command.completed',
    COMMAND_FAILED = 'command.failed',
    PROGRESS_UPDATED = 'progress.updated',
    ERROR_OCCURRED = 'error.occurred',
    WARNING_OCCURRED = 'warning.occurred',
    SERVICE_REGISTERED = 'service.registered',
    SERVICE_STARTED = 'service.started',
    SERVICE_STOPPED = 'service.stopped',
    PLUGIN_LOADED = 'plugin.loaded',
    PLUGIN_UNLOADED = 'plugin.unloaded'
}

/**
 * Progress event payload
 */
export interface ProgressEventPayload {
    step: string;
    current: number;
    total: number;
    percent: number;
    message?: string;
    data?: any;
}

/**
 * Command event payload
 */
export interface CommandEventPayload {
    commandName: string;
    args: any[];
    options: any;
    result?: any;
    error?: Error;
    duration?: number;
}

/**
 * Error event payload
 */
export interface ErrorEventPayload {
    error: Error;
    context?: any;
    stack?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Service event payload
 */
export interface ServiceEventPayload {
    serviceName: string;
    version?: string;
    metadata?: any;
}

/**
 * Plugin event payload
 */
export interface PluginEventPayload {
    pluginName: string;
    version?: string;
    path?: string;
    metadata?: any;
}

/**
 * Built-in system events
 */
export class ProgressEvent extends BaseEvent<ProgressEventPayload> {
    constructor(payload: ProgressEventPayload, metadata: EventMetadata) {
        super(SystemEventType.PROGRESS_UPDATED, payload, metadata);
    }
}

export class CommandStartedEvent extends BaseEvent<CommandEventPayload> {
    constructor(payload: CommandEventPayload, metadata: EventMetadata) {
        super(SystemEventType.COMMAND_STARTED, payload, metadata);
    }
}

export class CommandCompletedEvent extends BaseEvent<CommandEventPayload> {
    constructor(payload: CommandEventPayload, metadata: EventMetadata) {
        super(SystemEventType.COMMAND_COMPLETED, payload, metadata);
    }
}

export class CommandFailedEvent extends BaseEvent<CommandEventPayload> {
    constructor(payload: CommandEventPayload, metadata: EventMetadata) {
        super(SystemEventType.COMMAND_FAILED, payload, metadata);
    }
}

export class ErrorEvent extends BaseEvent<ErrorEventPayload> {
    constructor(payload: ErrorEventPayload, metadata: EventMetadata) {
        super(SystemEventType.ERROR_OCCURRED, payload, metadata);
    }
} 