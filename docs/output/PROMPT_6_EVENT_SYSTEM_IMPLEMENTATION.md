# Event-Driven System Implementation

## Overview

The event-driven system for imajin-cli provides a comprehensive foundation for real-time communication, progress tracking, and loose coupling between components. This implementation enables LLM-friendly communication patterns and enterprise-grade event handling.

## Architecture Components

### 1. Core Event System (`src/core/events/`)

#### Event.ts - Base Event Interface and Types
- **IEvent<T>**: Core event interface with type safety
- **EventMetadata**: Rich metadata for tracking and processing
- **EventPriority**: Priority levels (LOW, NORMAL, HIGH, CRITICAL)
- **SystemEventType**: Built-in system event types
- **BaseEvent**: Abstract base class for custom events
- **Built-in Events**: Progress, Command lifecycle, Error events

#### EventEmitter.ts - Enhanced Event Emitter
- **ImajinEventEmitter**: Extends Node.js EventEmitter with type safety
- **EventMiddleware**: Pipeline for event processing
- **EventMetrics**: Performance monitoring and metrics
- **Dead Letter Queue**: Failed event handling
- **Timeout Support**: Listener execution timeouts

#### EventManager.ts - Event Registration and Coordination
- **EventManager**: Central event management system
- **Listener Registration**: Type-safe listener management
- **Subscriber Support**: Multi-event listener registration
- **Middleware Pipeline**: Event processing middleware
- **Global Instance**: Singleton pattern for application-wide access

#### EventServiceProvider.ts - Service Provider Integration
- **EventServiceProvider**: Integrates with service provider system
- **Container Registration**: Dependency injection integration
- **Global Listeners**: Default system event listeners
- **Factory Functions**: Event creation helpers

## Key Features

### 1. Type-Safe Event System
```typescript
// Define custom events with type safety
interface CustomEventPayload {
    userId: string;
    action: string;
    data: any;
}

// Emit events with full type checking
await eventManager.emit<CustomEventPayload>('user.action', {
    userId: '123',
    action: 'login',
    data: { timestamp: new Date() }
});
```

### 2. Real-Time Progress Tracking
```typescript
// Commands can emit progress updates
await this.emitProgress('Processing files', 3, 10, 'Validating file 3 of 10');
// Results in: [30%] Processing files: Validating file 3 of 10
```

### 3. Command Lifecycle Events
```typescript
// Automatic command lifecycle tracking
await command.executeWithEvents(args, options);
// Emits: command.started, progress.updated, command.completed/failed
```

### 4. Error Handling and Recovery
```typescript
// Structured error events with context
await this.emitError(error, { step: 'validation' }, 'high');
// Includes retry logic and dead letter queue
```

### 5. Event Middleware Pipeline
```typescript
// Add middleware for logging, metrics, retry logic
eventManager.use(async (event, next) => {
    console.log(`Processing event: ${event.type}`);
    await next();
});
```

## Integration Points

### 1. Command Pattern Integration
- **BaseCommand**: Enhanced with event emission capabilities
- **executeWithEvents()**: Automatic lifecycle event tracking
- **Progress Methods**: Built-in progress tracking
- **Error Events**: Structured error emission

### 2. Service Provider System
- **EventServiceProvider**: Registers event system with container
- **Dependency Injection**: EventManager available throughout application
- **Global Listeners**: Default system event handlers
- **Factory Registration**: Event creation helpers in container

### 3. Plugin System Foundation
- **Event Subscribers**: Plugins can register for multiple events
- **Loose Coupling**: Plugins communicate through events
- **Hot-Swappable**: Event listeners can be added/removed dynamically

### 4. LLM Communication Ready
- **JSON-Native**: All events serialize to JSON
- **Structured Metadata**: Rich context for AI processing
- **Real-Time Updates**: WebSocket-ready event streaming
- **Introspection**: Event types and listeners discoverable

## Usage Examples

### Basic Event Emission
```typescript
import { getEventManager, SystemEventType } from './core/events/index.js';

const eventManager = getEventManager();
await eventManager.initialize();

// Emit a simple event
await eventManager.emit('user.login', { userId: '123' });

// Emit with metadata
await eventManager.emit('data.processed', 
    { records: 100 }, 
    { correlationId: 'batch-001', priority: EventPriority.HIGH }
);
```

### Event Listener Registration
```typescript
// Register a simple listener
eventManager.registerListener({
    name: 'UserLoginHandler',
    eventType: 'user.login',
    handle: async (event) => {
        console.log(`User ${event.payload.userId} logged in`);
    }
});

// Register with options
eventManager.registerListener(listener, {
    once: true,        // Execute only once
    timeout: 5000,     // 5 second timeout
    priority: 1        // High priority
});
```

### Command with Events
```typescript
class ProcessDataCommand extends BaseCommand {
    public readonly name = 'process-data';
    public readonly description = 'Process data with progress tracking';

    public async execute(args: any[], options: any): Promise<any> {
        const files = args[0] as string[];
        
        for (let i = 0; i < files.length; i++) {
            // Emit progress
            await this.emitProgress(
                'Processing files', 
                i + 1, 
                files.length, 
                `Processing ${files[i]}`
            );
            
            try {
                // Process file
                await this.processFile(files[i]);
            } catch (error) {
                // Emit error with context
                await this.emitError(error as Error, { file: files[i] }, 'medium');
                throw error;
            }
        }
        
        return { processed: files.length };
    }
}
```

### Event Subscriber Pattern
```typescript
class DataProcessor implements IEventSubscriber {
    getSubscribedEvents() {
        return {
            'data.received': 'handleDataReceived',
            'data.validated': 'handleDataValidated',
            'data.error': ['handleDataError', 'logDataError']
        };
    }
    
    async handleDataReceived(event: IEvent) {
        // Process received data
    }
    
    async handleDataValidated(event: IEvent) {
        // Handle validated data
    }
    
    async handleDataError(event: IEvent) {
        // Handle data errors
    }
    
    async logDataError(event: IEvent) {
        // Log data errors
    }
}

// Register all subscriber events
const processor = new DataProcessor();
eventManager.registerSubscriber(processor);
```

## Performance and Monitoring

### Event Metrics
```typescript
const metrics = eventManager.getMetrics().getSummary();
console.log({
    totalEmissions: metrics.totalEmissions,
    averageExecutionTime: metrics.averageExecutionTime,
    successRate: metrics.successRate,
    eventTypes: metrics.eventTypes
});
```

### Dead Letter Queue
```typescript
// Check failed events
const failedEvents = eventManager.getDeadLetterQueue();
console.log(`${failedEvents.length} events failed processing`);

// Clear dead letter queue
eventManager.clearDeadLetterQueue();
```

## Built-in System Events

| Event Type | Description | Payload |
|------------|-------------|---------|
| `application.started` | Application initialization | `{ version, config }` |
| `application.stopped` | Application shutdown | `{ uptime, reason }` |
| `command.started` | Command execution begins | `{ commandName, args, options }` |
| `command.completed` | Command execution succeeds | `{ commandName, result, duration }` |
| `command.failed` | Command execution fails | `{ commandName, error, duration }` |
| `progress.updated` | Progress tracking update | `{ step, current, total, percent }` |
| `error.occurred` | Error event | `{ error, context, severity }` |
| `service.registered` | Service provider registered | `{ serviceName, version }` |
| `service.started` | Service started | `{ serviceName }` |
| `service.stopped` | Service stopped | `{ serviceName }` |

## Configuration Options

### EventManager Configuration
```typescript
const eventManager = new EventManager({
    maxListeners: 100,           // Maximum listeners per event
    defaultTimeout: 30000,       // Default listener timeout (ms)
    enableMetrics: true,         // Enable performance metrics
    enableDeadLetterQueue: true, // Enable failed event queue
    retryAttempts: 3,           // Default retry attempts
    retryDelay: 1000            // Retry delay (ms)
});
```

### EventServiceProvider Configuration
```typescript
const eventProvider = new EventServiceProvider(container, program, {
    autoInitialize: true,           // Auto-initialize on boot
    registerGlobalListeners: true, // Register default listeners
    enableMetrics: true,           // Enable metrics collection
    retryAttempts: 2              // Retry failed events
});
```

## Next Steps

The event-driven system provides the foundation for:

1. **Background Job Processing** - Event-driven job queues
2. **Real-time Progress Tracking** - WebSocket event streaming
3. **Plugin Communication** - Event-based plugin architecture
4. **LLM Integration** - Structured event communication
5. **Monitoring & Diagnostics** - Event-based health monitoring

This implementation completes **Prompt 6** of the imajin-cli foundation architecture, providing a robust event-driven system that enables real-time communication, progress tracking, and loose coupling between components. 