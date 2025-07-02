# Services Layer

## Overview

The services layer provides a robust architecture for managing external integrations and business logic within the imajin CLI application. Built on proven design patterns including service registry, factory, and strategy patterns for modularity and maintainability.

## Architecture

- **BaseService**: Abstract base providing lifecycle management, error handling, and logging
- **ServiceRegistry**: Centralized service discovery and health monitoring
- **ServiceFactory**: Dynamic service instantiation with dependency injection
- **ServiceStrategyManager**: Flexible execution strategies and fallback handling

## Current Services

### ✅ Contentful Service
**Status**: ✅ COMPLIANT - Fully BaseService compliant  
**Purpose**: Content management system integration  
**Features**: Universal content management, real-time updates, business context mapping

### ✅ Stripe Service
**Status**: ✅ COMPLIANT - Recently upgraded to BaseService compliance  
**Purpose**: Payment processing and subscription management  
**Features**: Customer management, payment processing, subscription handling, business context mapping
- Health checks and API connectivity monitoring
- Metrics tracking for all operations
- Event-driven coordination
- Structured error handling with recovery

### ✅ Cloudinary Service  
**Status**: ✅ COMPLIANT - New BaseService implementation  
**Purpose**: Cloud-based media management and transformation  
**Features**: Media upload, advanced transformations, CDN delivery, metadata extraction
- Auto-optimization and format conversion
- Real-time progress tracking
- Health monitoring and diagnostics

### ✅ LocalFile Service
**Status**: ✅ COMPLIANT - New BaseService implementation  
**Purpose**: Local filesystem media storage and management  
**Features**: Local storage, basic transformations, URL generation
- Filesystem health checks
- Directory management and file validation
- Cross-platform compatibility

## Service Interfaces

Core contracts in `./interfaces/`:
- `IService` - Base service contract with lifecycle methods
- `ServiceConfig` - Configuration and health monitoring
- `ServiceFactory` - Dynamic service creation
- `ServiceRegistry` - Service discovery and management

## Usage

### Service Registration
```typescript
import { ServiceRegistry, ServiceFactory } from './services';

const registry = new ServiceRegistry();
registry.register('stripe', factory.create('stripe', config));
```

### Basic Operations
```typescript
// Get service instance
const contentfulService = registry.get('contentful');

// Health monitoring
const healthStatus = await registry.checkHealth();
```

### CLI Integration
Services are accessible through CLI commands:
```bash
# List available services
imajin services list

# Check service health
imajin services health

# Service-specific operations
imajin stripe customers list
imajin contentful content search "events"
```

## Configuration

Each service requires specific configuration extending the base `ServiceConfig`:
```typescript
interface ServiceConfig {
    name: string;
    version: string;
    enabled: boolean;
    retryPolicy?: RetryPolicy;
    timeout?: number;
}
```

## Future Plans

### Plugin System
Abstract current connectors into a modular plugin structure for:
- Hot-swappable service implementations
- Third-party service integration
- Runtime service configuration

### Enhanced Tooling
- Advanced CLI commands for service management
- Automated service health monitoring
- Performance metrics and observability
- Service dependency mapping

## Service Architecture Compliance (Task 004)

**✅ COMPLETED**: All active services now comply with BaseService architecture

### Migration Summary
- **StripeService**: Migrated from EventEmitter to BaseService pattern
- **MediaProviders**: Converted CloudinaryProvider/LocalMediaProvider to proper services
- **Service Registration**: Updated all service providers for container-based dependency injection
- **Health Checks**: Implemented across all services for monitoring
- **Metrics Tracking**: Added operation tracking and performance monitoring
- **Event Coordination**: Unified event handling through BaseService

### Legacy Deprecation
- **MediaProvider Interface**: Marked as deprecated, use BaseService-based services instead
- **Direct Service Instantiation**: Use service providers and container registration

## Development

### Adding New Services
1. Extend `BaseService` with your implementation
2. Implement required lifecycle methods (`onInitialize`, `onShutdown`, `onHealthCheck`)
3. Use `this.execute()` wrapper for all operations to get metrics tracking
4. Create service provider for dependency injection
5. Register with container using `instance()` method
6. Add comprehensive tests

### Service Compliance Checklist
- ✅ Extends BaseService
- ✅ Implements IService interface  
- ✅ Has health check implementation
- ✅ Tracks metrics using execute() wrapper
- ✅ Uses event emitter for coordination
- ✅ Has proper service provider
- ✅ Registered in dependency injection container

### Testing Strategy
- Interface-based contracts for mocking
- Health check endpoints for integration testing
- Event emission for behavior verification
- Dependency injection for test isolation
- Metrics validation for operation tracking

---

Licensed under the .fair LICENSING AGREEMENT
