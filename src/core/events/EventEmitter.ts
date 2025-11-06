/**
 * EventEmitter - Enhanced event emitter with type safety and middleware
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
 * - Type-safe event emission and listening
 * - Middleware pipeline for event processing
 * - Error handling and dead letter queues
 * - Performance monitoring and metrics
 */

import { randomBytes } from 'node:crypto';
import { EventEmitter as NodeEventEmitter } from 'events';
import type { EventMetadata, IEvent, IEventListener } from './Event.js';
import { EventPriority } from './Event.js';
import { Logger } from '../../logging/Logger.js';

/**
 * Event middleware function type
 */
export type EventMiddleware = (event: IEvent, next: () => Promise<void>) => Promise<void>;

/**
 * Event emission options
 */
export interface EmitOptions {
    async?: boolean;
    timeout?: number;
    retries?: number;
    delay?: number;
}

/**
 * Event listener registration options
 */
export interface ListenerOptions {
    once?: boolean;
    priority?: number;
    timeout?: number;
    maxConcurrent?: number;
}

/**
 * Enhanced event emitter with type safety and middleware support
 */
export class ImajinEventEmitter extends NodeEventEmitter {
    private middleware: EventMiddleware[] = [];
    private eventListeners: Map<string, Set<IEventListener>> = new Map();
    private deadLetterQueue: IEvent[] = [];
    private metrics: EventMetrics = new EventMetrics();
    private maxListeners: number = 100;
    private defaultTimeout: number = 30000; // 30 seconds
    private logger: Logger;

    constructor() {
        super();
        this.setMaxListeners(this.maxListeners);
        this.logger = new Logger({ level: 'debug' });
    }

    /**
     * Add middleware to the event processing pipeline
     */
    public use(middleware: EventMiddleware): void {
        this.middleware.push(middleware);
    }

    /**
     * Register an event listener
     */
    public registerListener<T = any>(
        listener: IEventListener<T>,
        options: ListenerOptions = {}
    ): void {
        const eventType = listener.eventType;

        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }

        const listenersSet = this.eventListeners.get(eventType)!;
        listenersSet.add(listener as IEventListener);

        // Register with Node.js EventEmitter
        const handler = (event: IEvent<T>) => {
            void (async () => {
                try {
                    await this.executeListener(listener, event, options);
                } catch (error) {
                    this.handleListenerError(error as Error, event, listener);
                }
            })();
        };

        if (options.once) {
            this.once(eventType, handler);
        } else {
            this.on(eventType, handler);
        }
    }

    /**
     * Unregister an event listener
     */
    public unregisterListener(listener: IEventListener): void {
        const eventType = listener.eventType;
        const listenersSet = this.eventListeners.get(eventType);

        if (listenersSet) {
            listenersSet.delete(listener);
            if (listenersSet.size === 0) {
                this.eventListeners.delete(eventType);
            }
        }

        this.removeAllListeners(eventType);
    }

    /**
     * Emit an event with middleware processing
     */
    public async emitEvent<T = any>(
        event: IEvent<T>,
        _options: EmitOptions = {}
    ): Promise<boolean> {
        const _startTime = Date.now();

        try {
            // Process through middleware pipeline
            await this.processMiddleware(event);

            // Emit the event
            const result = this.emit(event.type, event);

            // Update metrics
            this.metrics.recordEmission(event.type, Date.now() - _startTime);

            return result;
        } catch (error) {
            this.handleEmissionError(error as Error, event);
            return false;
        }
    }

    /**
     * Create and emit a simple event
     */
    public async emitTypedEvent<T = any>(
        eventType: string,
        payload: T,
        metadata?: Partial<EventMetadata>,
        options: EmitOptions = {}
    ): Promise<boolean> {
        const event: IEvent<T> = {
            type: eventType,
            id: this.generateEventId(eventType),
            timestamp: new Date(),
            version: '1.0.0',
            payload,
            metadata: {
                source: 'imajin-cli',
                priority: EventPriority.NORMAL,
                ...metadata
            } as EventMetadata
        };

        return this.emitEvent(event, options);
    }

    /**
     * Get event listeners for a specific event type
     */
    public getEventListeners(eventType: string): IEventListener[] {
        const listenersSet = this.eventListeners.get(eventType);
        return listenersSet ? Array.from(listenersSet) : [];
    }

    /**
     * Get all registered event types
     */
    public getEventTypes(): string[] {
        return Array.from(this.eventListeners.keys());
    }

    /**
     * Get dead letter queue events
     */
    public getDeadLetterQueue(): IEvent[] {
        return [...this.deadLetterQueue];
    }

    /**
     * Clear dead letter queue
     */
    public clearDeadLetterQueue(): void {
        this.deadLetterQueue.length = 0;
    }

    /**
     * Get event emission metrics
     */
    public getMetrics(): EventMetrics {
        return this.metrics;
    }

    /**
     * Process event through middleware pipeline
     */
    private async processMiddleware(event: IEvent): Promise<void> {
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < this.middleware.length) {
                const middleware = this.middleware[index++];
                if (middleware) {
                    await middleware(event, next);
                }
            }
        };

        await next();
    }

    /**
     * Execute a single event listener
     */
    private async executeListener<T = any>(
        listener: IEventListener<T>,
        event: IEvent<T>,
        options: ListenerOptions
    ): Promise<void> {
        const timeout = options.timeout || this.defaultTimeout;

        const execution = Promise.resolve(listener.handle(event));

        if (timeout > 0) {
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error(`Listener ${listener.name} timed out`)), timeout);
            });

            await Promise.race([execution, timeoutPromise]);
        } else {
            await execution;
        }
    }

    /**
     * Handle listener execution errors
     */
    private handleListenerError(error: Error, event: IEvent, listener: IEventListener): void {
        this.logger.error('Error in event listener', error, { listenerName: listener.name, eventType: event.type });

        // Add to dead letter queue if retries exhausted
        const retryCount = event.metadata.retryCount || 0;
        const maxRetries = event.metadata.maxRetries || 3;

        if (retryCount >= maxRetries) {
            this.deadLetterQueue.push(event);
        }

        // Emit error event
        this.emit('error', {
            error,
            event,
            listener: listener.name
        });
    }

    /**
     * Handle event emission errors
     */
    private handleEmissionError(error: Error, event: IEvent): void {
        this.logger.error('Error emitting event', error, { eventType: event.type });
        this.deadLetterQueue.push(event);

        // Emit error event
        this.emit('error', {
            error,
            event
        });
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(eventType: string): string {
        const b = randomBytes(6);
        const randomPart = b.toString("base64").replace(/[^a-z0-9]/gi,"").toLowerCase().substring(0,9);
        return `${eventType}_${Date.now()}_${randomPart}`;
    }
}

/**
 * Event metrics tracking
 */
export class EventMetrics {
    private emissions: Map<string, number> = new Map();
    private totalEmissions: number = 0;
    private totalExecutionTime: number = 0;
    private errors: number = 0;
    private startTime: Date = new Date();

    /**
     * Record an event emission
     */
    public recordEmission(eventType: string, executionTime: number): void {
        this.emissions.set(eventType, (this.emissions.get(eventType) || 0) + 1);
        this.totalEmissions++;
        this.totalExecutionTime += executionTime;
    }

    /**
     * Record an error
     */
    public recordError(): void {
        this.errors++;
    }

    /**
     * Get emissions count for event type
     */
    public getEmissions(eventType: string): number {
        return this.emissions.get(eventType) || 0;
    }

    /**
     * Get total emissions
     */
    public getTotalEmissions(): number {
        return this.totalEmissions;
    }

    /**
     * Get average execution time
     */
    public getAverageExecutionTime(): number {
        return this.totalEmissions > 0 ? this.totalExecutionTime / this.totalEmissions : 0;
    }

    /**
     * Get error count
     */
    public getErrorCount(): number {
        return this.errors;
    }

    /**
     * Get success rate
     */
    public getSuccessRate(): number {
        const total = this.totalEmissions + this.errors;
        return total > 0 ? (this.totalEmissions / total) * 100 : 100;
    }

    /**
     * Get uptime
     */
    public getUptime(): number {
        return Date.now() - this.startTime.getTime();
    }

    /**
     * Get metrics summary
     */
    public getSummary(): EventMetricsSummary {
        return {
            totalEmissions: this.totalEmissions,
            averageExecutionTime: this.getAverageExecutionTime(),
            errorCount: this.errors,
            successRate: this.getSuccessRate(),
            uptime: this.getUptime(),
            eventTypes: Array.from(this.emissions.keys()),
            emissionsByType: Object.fromEntries(this.emissions)
        };
    }
}

/**
 * Event metrics summary interface
 */
export interface EventMetricsSummary {
    totalEmissions: number;
    averageExecutionTime: number;
    errorCount: number;
    successRate: number;
    uptime: number;
    eventTypes: string[];
    emissionsByType: Record<string, number>;
} 