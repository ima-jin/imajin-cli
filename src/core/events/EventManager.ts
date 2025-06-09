/**
 * EventManager - Event registration and coordination system
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
 * - Event listener registration and lifecycle
 * - Event middleware pipeline
 * - Error handling and dead letter queues
 * - Performance monitoring and metrics
 */

import type { EventMetadata, IEvent, IEventListener, IEventSubscriber } from './Event.js';
import { SystemEventType } from './Event.js';
import { ImajinEventEmitter, type EventMiddleware, type ListenerOptions } from './EventEmitter.js';

/**
 * Event manager configuration
 */
export interface EventManagerConfig {
    maxListeners?: number;
    defaultTimeout?: number;
    enableMetrics?: boolean;
    enableDeadLetterQueue?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
}

/**
 * Event listener registration result
 */
export interface ListenerRegistration {
    id: string;
    listener: IEventListener;
    eventType: string;
    options: ListenerOptions;
    registeredAt: Date;
}

/**
 * Central event management system
 */
export class EventManager {
    private emitter: ImajinEventEmitter;
    private registrations: Map<string, ListenerRegistration> = new Map();
    private config: Required<EventManagerConfig>;
    private isInitialized: boolean = false;
    private shutdownPromise: Promise<void> | null = null;

    constructor(config: EventManagerConfig = {}) {
        this.config = {
            maxListeners: config.maxListeners || 100,
            defaultTimeout: config.defaultTimeout || 30000,
            enableMetrics: config.enableMetrics !== false,
            enableDeadLetterQueue: config.enableDeadLetterQueue !== false,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000
        };

        this.emitter = new ImajinEventEmitter();
        this.setupDefaultMiddleware();
    }

    /**
     * Initialize the event manager
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        // Set up error handling
        this.emitter.on('error', this.handleSystemError.bind(this));

        // Emit initialization event
        await this.emit(SystemEventType.SERVICE_STARTED, {
            serviceName: 'EventManager',
            version: '0.1.0'
        });

        this.isInitialized = true;
    }

    /**
     * Shutdown the event manager
     */
    public async shutdown(): Promise<void> {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        this.shutdownPromise = this.performShutdown();
        return this.shutdownPromise;
    }

    /**
     * Register an event listener
     */
    public registerListener<T = any>(
        listener: IEventListener<T>,
        options: ListenerOptions = {}
    ): string {
        const registrationId = this.generateRegistrationId();

        const registration: ListenerRegistration = {
            id: registrationId,
            listener: listener as IEventListener,
            eventType: listener.eventType,
            options,
            registeredAt: new Date()
        };

        this.registrations.set(registrationId, registration);
        this.emitter.registerListener(listener, options);

        return registrationId;
    }

    /**
     * Register multiple listeners from a subscriber
     */
    public registerSubscriber(subscriber: IEventSubscriber): string[] {
        const subscriptions = subscriber.getSubscribedEvents();
        const registrationIds: string[] = [];

        for (const [eventType, handlerNames] of Object.entries(subscriptions)) {
            const handlers = Array.isArray(handlerNames) ? handlerNames : [handlerNames];

            for (const handlerName of handlers) {
                const handler = (subscriber as any)[handlerName];
                if (typeof handler === 'function') {
                    const listener: IEventListener = {
                        name: `${subscriber.constructor.name}.${handlerName}`,
                        eventType,
                        handle: handler.bind(subscriber)
                    };

                    const registrationId = this.registerListener(listener);
                    registrationIds.push(registrationId);
                }
            }
        }

        return registrationIds;
    }

    /**
     * Unregister a listener by registration ID
     */
    public unregisterListener(registrationId: string): boolean {
        const registration = this.registrations.get(registrationId);
        if (!registration) {
            return false;
        }

        this.emitter.unregisterListener(registration.listener);
        this.registrations.delete(registrationId);

        return true;
    }

    /**
     * Unregister all listeners for an event type
     */
    public unregisterAllListeners(eventType: string): number {
        const removed: string[] = [];

        for (const [id, registration] of this.registrations) {
            if (registration.eventType === eventType) {
                this.emitter.unregisterListener(registration.listener);
                removed.push(id);
            }
        }

        removed.forEach(id => this.registrations.delete(id));
        return removed.length;
    }

    /**
     * Add middleware to the event processing pipeline
     */
    public use(middleware: EventMiddleware): void {
        this.emitter.use(middleware);
    }

    /**
     * Emit an event
     */
    public async emit<T = any>(
        eventType: string,
        payload: T,
        metadata?: Partial<EventMetadata>
    ): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('EventManager must be initialized before emitting events');
        }

        return this.emitter.emitTypedEvent(eventType, payload, metadata);
    }

    /**
     * Emit a full event object
     */
    public async emitEvent<T = any>(event: IEvent<T>): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('EventManager must be initialized before emitting events');
        }

        return this.emitter.emitEvent(event);
    }

    /**
     * Get registered listeners for an event type
     */
    public getListeners(eventType: string): IEventListener[] {
        return this.emitter.getEventListeners(eventType);
    }

    /**
     * Get all registered event types
     */
    public getEventTypes(): string[] {
        return this.emitter.getEventTypes();
    }

    /**
     * Get listener registrations
     */
    public getRegistrations(): ListenerRegistration[] {
        return Array.from(this.registrations.values());
    }

    /**
     * Get registration by ID
     */
    public getRegistration(registrationId: string): ListenerRegistration | undefined {
        return this.registrations.get(registrationId);
    }

    /**
     * Get event metrics
     */
    public getMetrics() {
        return this.emitter.getMetrics();
    }

    /**
     * Get dead letter queue
     */
    public getDeadLetterQueue(): IEvent[] {
        return this.emitter.getDeadLetterQueue();
    }

    /**
     * Clear dead letter queue
     */
    public clearDeadLetterQueue(): void {
        this.emitter.clearDeadLetterQueue();
    }

    /**
     * Check if event manager is initialized
     */
    public isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Get configuration
     */
    public getConfig(): Required<EventManagerConfig> {
        return { ...this.config };
    }

    /**
     * Set up default middleware
     */
    private setupDefaultMiddleware(): void {
        // Logging middleware
        if (this.config.enableMetrics) {
            this.use(async (event: IEvent, next: () => Promise<void>) => {
                const _startTime = Date.now();
                try {
                    await next();
                } catch (error) {
                    this.emitter.getMetrics().recordError();
                    throw error;
                }
            });
        }

        // Retry middleware
        this.use(async (event: IEvent, next: () => Promise<void>) => {
            const retryCount = event.metadata.retryCount || 0;
            const maxRetries = event.metadata.maxRetries || this.config.retryAttempts;

            try {
                await next();
            } catch (error) {
                if (retryCount < maxRetries) {
                    // Schedule retry
                    setTimeout(async () => {
                        const retryEvent: IEvent = {
                            ...event,
                            metadata: {
                                ...event.metadata,
                                retryCount: retryCount + 1
                            }
                        };
                        await this.emitEvent(retryEvent);
                    }, this.config.retryDelay);
                } else {
                    throw error;
                }
            }
        });
    }

    /**
     * Handle system errors
     */
    private handleSystemError(errorData: any): void {
        console.error('EventManager system error:', errorData);

        // Emit error event if it's not already an error event (prevent loops)
        if (errorData.event?.type !== SystemEventType.ERROR_OCCURRED) {
            this.emit(SystemEventType.ERROR_OCCURRED, {
                error: errorData.error,
                context: errorData,
                severity: 'medium'
            }).catch(err => {
                console.error('Failed to emit error event:', err);
            });
        }
    }

    /**
     * Perform shutdown sequence
     */
    private async performShutdown(): Promise<void> {
        // Emit shutdown event
        await this.emit(SystemEventType.SERVICE_STOPPED, {
            serviceName: 'EventManager'
        });

        // Unregister all listeners
        const registrationIds = Array.from(this.registrations.keys());
        registrationIds.forEach(id => this.unregisterListener(id));

        // Remove all event emitter listeners
        this.emitter.removeAllListeners();

        this.isInitialized = false;
    }

    /**
     * Generate unique registration ID
     */
    private generateRegistrationId(): string {
        return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Global event manager instance
 */
let globalEventManager: EventManager | null = null;

/**
 * Get the global event manager instance
 */
export function getEventManager(): EventManager {
    if (!globalEventManager) {
        globalEventManager = new EventManager();
    }
    return globalEventManager;
}

/**
 * Set the global event manager instance
 */
export function setEventManager(manager: EventManager): void {
    globalEventManager = manager;
} 