# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**imajin-cli** is a CLI generation system that transforms OpenAPI/GraphQL specifications into business-focused CLI tools with enterprise-grade patterns. It enables multi-service orchestration through Universal Elements and generates professional CLI tools with no subscription dependencies.

**Critical Context:** This is part of the imajin ecosystem (see `https://github.com/ima-jin/imajin-os`), which includes distributed LED hardware devices that form peer-to-peer networks. The generated CLIs will be used by **AI agents** to coordinate operations across these distributed systems. The event-driven architecture ensures AI agents can trigger complex multi-step workflows declaratively, preventing inconsistent state from forgotten steps or network failures.

**See:** [docs/architecture/AI_SAFE_INFRASTRUCTURE.md](docs/architecture/AI_SAFE_INFRASTRUCTURE.md) for architectural rationale.

## Common Development Commands

### Building and Testing
```bash
# Development server with hot reload
npm run dev

# Build the project (includes TypeScript compilation and import fixing)
npm run build

# Start production build
npm start

# Run the CLI directly
npm run cli

# Build and run CLI
npm run cli:dev

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Project Management
```bash
# Clean build artifacts
npm run clean

# Full clean (including node_modules)
npm run clean:all

# Complete rebuild
npm run rebuild

# Nuclear option (Windows PowerShell script)
npm run git-nuke

# Update task dates in documentation
npm run update-dates
```

### Testing Commands
- Main test config: `jest.config.cjs`
- Service-specific tests: `jest.config.service.js`
- Test files located in: `src/**/__tests__/*.test.ts` and `src/test/**/*.test.ts`

## Architecture Overview

### Core Application Structure
- **Application bootstrap**: `src/index.ts` → `src/core/Application.ts`
- **Service Provider pattern**: All functionality organized as providers (15+ implemented)
- **Container-based dependency injection**: `src/container/Container.ts`
- **Business Context system**: Domain-specific command generation via `src/context/`

### Key Architectural Patterns

#### Service Provider System
Located in `src/providers/` and service-specific directories. All services extend the base `ServiceProvider` class:
```typescript
export abstract class ServiceProvider {
    public abstract register(): Promise<void>;
    public abstract boot(): Promise<void>;
}
```

#### Event-Driven Architecture (AI-Safe Infrastructure)
**Critical:** EventManager (`src/core/events/`) provides distributed systems infrastructure for AI agents:
- **Declarative Operations**: AI runs ONE command → infrastructure triggers ALL side effects
- **Dead Letter Queue**: Network failures don't cause data loss
- **Middleware Pipeline**: Auth, rate limiting, validation happen automatically
- **Subscriber Pattern**: Services react to events without AI coordination
- **Why It's Complex**: AI agents can't be trusted to remember multi-step workflows; infrastructure ensures consistency

**See:** [docs/architecture/AI_SAFE_INFRASTRUCTURE.md](docs/architecture/AI_SAFE_INFRASTRUCTURE.md) - explains why EventManager is enterprise-grade for distributed systems.

#### Universal Elements System
Cross-service compatibility layer in `src/etl/` that enables multi-service workflows:
- **Graph Translation**: `src/etl/graphs/` - converts between service-specific data models
- **Business Model Factory**: Maps service entities to universal business concepts
- **ETL Pipeline**: Handles data transformation across services

#### Command Pattern Framework
All CLI commands follow the pattern in `src/commands/`:
- **BaseCommand**: Foundation class with event emission for AI-safe operations
- **Generated Commands**: Business-context-driven command generation
- **Service-specific Commands**: Located in respective service directories (e.g., `src/services/stripe/commands/`)
- **Pattern**: Commands emit events rather than calling services directly (prevents AI agents from leaving inconsistent state)

### Directory Structure Deep Dive

**Core Infrastructure:**
- `src/core/` - Application, ServiceProvider, PluginManager, ErrorHandler
- `src/providers/` - Service provider implementations
- `src/container/` - Dependency injection container

**Business Logic:**
- `src/context/` - Business context processing and management
- `src/commands/` - CLI command implementations
- `src/services/` - Service integrations (Stripe, Contentful, etc.)

**Enterprise Patterns:**
- `src/exceptions/` - Structured error handling
- `src/logging/` - Winston-based logging system
- `src/jobs/` - Background job processing
- `src/repositories/` - Data access abstraction
- `src/etl/` - Extract-Transform-Load pipeline

**Supporting Systems:**
- `src/generators/` - Plugin/CLI generation engine
- `src/schemas/` - Type generation and validation
- `src/media/` - Multi-provider media processing
- `src/webhooks/` - HTTP/webhook infrastructure

## Development Workflow

### Prompt-Based Development System
This project uses structured prompts in `docs/prompts/` for systematic development:
- **Phase 1**: Core Architecture (✅ Complete)
- **Phase 2**: Infrastructure Components (🔄 85% Complete)
- **Phase 3**: AI-Enhanced Generation (⏳ Planned)

Check `docs/prompts/README.md` for current implementation status.

### TypeScript Configuration
- **Target**: ES2022 with ESNext modules
- **Path mapping**: Uses `@/*` aliases for clean imports
- **Strict mode**: Enabled with comprehensive type checking
- **Output**: `dist/` directory with source maps and declarations

### Testing Strategy
- **Jest**: Primary testing framework with ts-jest preset
- **Service Testing**: Dedicated test infrastructure in `src/test/framework/`
- **Integration Tests**: Multi-service coordination testing
- **Mock Management**: HTTP mocking for external services

## Service Integration Patterns

### Adding New Services
1. Create service directory in `src/services/[service-name]/`
2. Implement `[Service]ServiceProvider` extending base `ServiceProvider`
3. Add service-specific commands in `commands/` subdirectory
4. Register provider in `src/index.ts`
5. Add Universal Elements mapping in `src/etl/graphs/`

### Credential Management
Secure cross-platform credential storage:
- **Keychain** (macOS), **Windows Credential Manager**, **Linux Secret Service**
- Located in `src/core/credentials/`
- Automatic provider selection based on platform

### Business Context Processing
Commands are generated based on business context rather than raw API endpoints:
- **Business Schema Registry**: `src/context/BusinessSchemaRegistry.ts`
- **Context Processor**: `src/context/BusinessContextProcessor.ts`
- **Recipe System**: Template-based business workflow generation

## Key Implementation Notes

### Multi-Service Transactions
The system supports coordinated operations across multiple services with rollback capabilities through the ETL pipeline system.

### Rate Limiting
Intelligent API throttling implemented in `src/core/ratelimit/` with multiple strategies:
- Fixed Window, Sliding Window, Token Bucket strategies

### Error Handling
Comprehensive exception system in `src/exceptions/` with:
- Structured error types (ApiError, ValidationError, SystemError, etc.)
- Error recovery mechanisms in `src/core/ErrorRecovery.ts`
- Business-context-aware error messages

### Event System
Real-time coordination via `src/core/events/` supporting:
- Cross-service event propagation
- Progress tracking for long-running operations
- Event-driven workflow orchestration

## Build Process

The build process includes several steps:
1. **TypeScript compilation** (`tsc`)
2. **Import path fixing** (`npm run fix-imports`) - resolves ES module import paths
3. **Optional watch mode** (`npm run watch`) - file system monitoring

## Important Development Considerations

- **Enterprise Focus**: All patterns follow enterprise-grade practices
- **Type Safety**: Comprehensive TypeScript throughout with strict checking
- **Business Context**: Commands map to business workflows, not technical APIs
- **Multi-Service**: Architecture enables cross-service operations impossible with single-service CLIs
- **User Ownership**: Generated tools are fully owned by users with no platform dependencies
