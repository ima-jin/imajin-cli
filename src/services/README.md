# Services Layer

## Overview

The services layer provides a robust architecture for managing external integrations and business logic within the imajin CLI application. Built on proven design patterns including service registry, factory, and strategy patterns for modularity and maintainability.

## Architecture

- **BaseService**: Abstract base providing lifecycle management, error handling, and logging
- **ServiceRegistry**: Centralized service discovery and health monitoring
- **ServiceFactory**: Dynamic service instantiation with dependency injection
- **ServiceStrategyManager**: Flexible execution strategies and fallback handling

## Current Services

### ✅ Stripe Service
**Status**: Successfully implemented  
**Purpose**: Payment processing and subscription management  
**Features**: Customer management, payment processing, subscription handling, webhook integration

### 🚧 Contentful Service
**Status**: Currently under development  
**Purpose**: Content management system integration  
**Integration**: Designed to manage content models, providing real-time updates and engagement content management

**Features**:
- List content entries across types
- Retrieve specific entries by ID
- Search content with filtering
- Fetch upcoming events
- Retrieve track releases by genre
- Multi-platform content distribution

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

## Development

### Adding New Services
1. Extend `BaseService` with your implementation
2. Implement required service interfaces
3. Create service provider for dependency injection
4. Register with `ServiceRegistry`
5. Add comprehensive tests

### Testing Strategy
- Interface-based contracts for mocking
- Health check endpoints for integration testing
- Event emission for behavior verification
- Dependency injection for test isolation

---

Licensed under the .fair LICENSING AGREEMENT
