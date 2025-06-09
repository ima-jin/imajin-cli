/**
 * Events - Event system exports
 * 
 * @package     @imajin/cli
 * @subpackage  core/events
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

// Core event interfaces and types
export type {
    CommandEventPayload,
    ErrorEventPayload, EventMetadata, IEvent,
    IEventListener,
    IEventSubscriber, PluginEventPayload, ProgressEventPayload, ServiceEventPayload
} from './Event.js';

export {
    BaseEvent, CommandCompletedEvent,
    CommandFailedEvent, CommandStartedEvent, ErrorEvent, EventPriority, ProgressEvent, SystemEventType
} from './Event.js';

// Event emitter
export type {
    EmitOptions, EventMetricsSummary, EventMiddleware, ListenerOptions
} from './EventEmitter.js';

export {
    EventMetrics, ImajinEventEmitter
} from './EventEmitter.js';

// Event manager
export type {
    EventManagerConfig,
    ListenerRegistration
} from './EventManager.js';

export {
    EventManager,
    getEventManager,
    setEventManager
} from './EventManager.js';

// Service provider
export type {
    EventServiceProviderConfig
} from './EventServiceProvider.js';

export {
    EventServiceProvider
} from './EventServiceProvider.js';
