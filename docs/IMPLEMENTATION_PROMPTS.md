# 🎯 IMAJIN-CLI IMPLEMENTATION PROMPTS

**Purpose:** Ready-to-use implementation prompts for each development task  
**Last Updated:** June 6, 2025  
**Total Tasks:** 14 prompts  
**Usage:** Copy prompt → Execute → Update progress tracker  

---

## 📋 **HOW TO USE THESE PROMPTS**

### **Workflow:**
1. **Check Progress:** Review `DEVELOPMENT_PROGRESS.md` for current task
2. **Copy Prompt:** Use the detailed prompt below for active task
3. **Execute:** Implement following the prompt guidelines
4. **Update Tracker:** Mark task complete and move to next
5. **Repeat:** Continue with next prompt in sequence

### **Prompt Structure:**
- **Context:** Architecture background and dependencies
- **Deliverables:** Specific files and functionality to create
- **Implementation:** Step-by-step technical guidance
- **Integration:** How this connects to other components
- **Testing:** Required test coverage
- **Completion:** Success criteria and next steps

---

## 🏗️ **PHASE 1: CORE ARCHITECTURE PATTERNS**

### **PROMPT 1: SERVICE PROVIDER SYSTEM** 🔄 **CURRENT TASK**

```markdown
# 🏗️ IMPLEMENT: Service Provider System

## CONTEXT
Create the foundational Service Provider architecture for imajin-cli that enables modular service registration, dependency management, and clean separation of concerns. This builds directly on the existing TSyringe DI container.

## ARCHITECTURAL VISION
Service Providers act as the "connective layer" between the DI container and business logic:
- Each major system component gets its own ServiceProvider
- Providers handle service registration, initialization, and lifecycle
- Enables hot-swapping and modular architecture
- Foundation for plugin system and service integrations

## DELIVERABLES
Create the following files with proper imajin header templates:

1. `src/core/providers/ServiceProvider.ts` - Base service provider interface
2. `src/core/providers/ServiceProviderManager.ts` - Provider orchestration
3. `src/core/providers/CoreServiceProvider.ts` - Core services provider
4. `src/core/providers/ConfigServiceProvider.ts` - Configuration provider
5. Update `src/core/Application.ts` - Integrate provider system

## IMPLEMENTATION REQUIREMENTS

### 1. Service Provider Interface
```typescript
interface ServiceProvider {
  readonly name: string;
  readonly dependencies: string[];
  
  register(container: DependencyContainer): Promise<void>;
  boot(container: DependencyContainer): Promise<void>;
  shutdown?(): Promise<void>;
}
```

### 2. Provider Manager
- Manages provider registration and lifecycle
- Handles dependency resolution between providers  
- Coordinates startup and shutdown sequences
- Error handling for failed providers

### 3. Core Service Provider
- Registers essential services (Logger, Config, etc.)
- Sets up basic application services
- Provides foundation for other providers

## FILE HEADERS
Use the imajin TypeScript header template for all files:
```typescript
/**
 * [ClassName] - [Brief Description]
 * 
 * @package     @imajin/cli
 * @subpackage  core/providers
 * @author      [Author]
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - TSyringe DI container integration
 * - Application lifecycle management
 * - Service registration and bootstrapping
 */
```

## INTEGRATION POINTS
- Must work with existing TSyringe DI container
- Should enable easy service registration for future components
- Prepare for Command Pattern, Event System, and Service Layer
- Support for lazy loading and conditional service registration

## TESTING REQUIREMENTS
Create tests for:
- ServiceProvider registration and boot lifecycle
- ServiceProviderManager coordination
- Error handling for failed providers
- Integration with Application class

## SUCCESS CRITERIA
- Service providers can be registered and booted reliably
- Application.ts uses provider system for initialization
- Foundation ready for Command Pattern and other systems
- Clean separation between registration and business logic
- Ready for plugin system integration
```

### **PROMPT 2: COMMAND PATTERN FRAMEWORK**

```markdown
# ⚡ IMPLEMENT: Command Pattern Framework

## CONTEXT
Create a comprehensive Command Pattern framework for imajin-cli that enables modular command registration, execution, and management. This builds on the Service Provider system.

## ARCHITECTURAL VISION
Commands are the primary interaction interface:
- Each CLI command maps to a Command class
- Commands are registered through service providers
- Supports nested command groups and complex arguments
- Foundation for plugin-generated commands

## DELIVERABLES
1. `src/core/commands/Command.ts` - Base command interface
2. `src/core/commands/CommandManager.ts` - Command registration and execution
3. `src/core/commands/CommandServiceProvider.ts` - Command system provider
4. `src/commands/` - Directory for core commands
5. Update existing Application.ts - Integrate command system

## IMPLEMENTATION REQUIREMENTS

### 1. Command Interface
```typescript
interface Command {
  readonly name: string;
  readonly description: string;
  readonly arguments: ArgumentDefinition[];
  readonly options: OptionDefinition[];
  
  execute(args: any[], options: any): Promise<CommandResult>;
  validate?(args: any[], options: any): ValidationResult;
}
```

### 2. Command Manager
- Dynamic command registration through providers
- Command discovery and help system
- Argument parsing and validation
- Error handling and user feedback

### 3. Integration Points
- Must work with Service Provider system
- Should support plugin-generated commands
- Prepare for credential management integration
- Foundation for service-specific command groups

## SUCCESS CRITERIA
- Commands can be registered dynamically through service providers
- CLI supports nested command groups and help system
- Arguments and options are properly validated
- Ready for plugin-generated command integration
- Foundation prepared for service connectors
```

### **PROMPT 3: TYPE COLLISION PREVENTION SYSTEM**

```markdown
# 🔧 IMPLEMENT: Type Collision Prevention System

## CONTEXT
Create a comprehensive type management system that prevents type collisions between multiple services, enables cross-service data transformations, and provides universal entity schemas for seamless integration as the system scales to dozens of service connectors.

## ARCHITECTURAL VISION
As imajin-cli scales to integrate with many services (Stripe, Salesforce, HubSpot, Shopify, etc.), we need to prevent type name collisions and enable safe cross-service data flows:
- Universal entity schemas for common business objects
- Service adapter pattern for bi-directional transformations
- Type collision detection and namespace management
- Cross-service workflow type safety

## DELIVERABLES
1. `src/types/Core.ts` - Universal entity schemas and type management
2. `src/types/adapters/` - Service adapter interfaces and utilities
3. `src/services/[service]/adapters/` - Service-specific adapter implementations
4. Type collision detection and warning system
5. Integration with ETL Pipeline for automatic transformations

## IMPLEMENTATION REQUIREMENTS

### 1. Universal Entity Schemas
```typescript
// Create universal schemas that ALL services map to
export const UniversalCustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional(),
  serviceData: z.record(z.any()).optional(), // Service-specific fields
  sourceService: z.string(),
});

export const UniversalPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
  customerId: z.string().optional(),
  // ... additional universal fields
});
```

### 2. Service Adapter Pattern
```typescript
export interface ServiceAdapter<TServiceEntity, TUniversalEntity> {
  toUniversal(serviceEntity: TServiceEntity): TUniversalEntity;
  fromUniversal(universalEntity: TUniversalEntity): TServiceEntity;
  validate(entity: unknown): entity is TServiceEntity;
  getNamespace(): ServiceNamespace;
}
```

### 3. Type Collision Detection
```typescript
export class TypeRegistry {
  static register(typeName: string, namespace: ServiceNamespace): void;
  static hasCollision(typeName: string): boolean;
  static getServices(typeName: string): ServiceNamespace[];
}
```

### 4. Service Namespace System
- Registered namespace for each service (stripe, salesforce, hubspot, etc.)
- Automatic collision warnings during development
- Namespaced type utilities and helpers

## FILE HEADERS
Use the imajin TypeScript header template for all files:
```typescript
/**
 * [ClassName] - [Brief Description]
 * 
 * @package     @imajin/cli
 * @subpackage  types/core
 * @author      [Author]
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Universal entity schemas for cross-service mapping
 * - Type collision prevention via namespacing
 * - Service adapter type definitions
 * - ETL pipeline type transformations
 */
```

## INTEGRATION POINTS
- Must work with existing Service Provider system
- Should integrate with ETL Pipeline for automatic transformations
- Prepare for plugin-generated service connectors
- Support for real-time cross-service workflows

## EXAMPLE IMPLEMENTATION
Create a Stripe Customer Adapter as reference:
```typescript
export class StripeCustomerAdapter implements ServiceAdapter<StripeCustomer, UniversalCustomer> {
  toUniversal(stripeCustomer: StripeCustomer): UniversalCustomer {
    return {
      id: stripeCustomer.id,
      email: stripeCustomer.email || '',
      sourceService: 'stripe',
      serviceData: {
        balance: stripeCustomer.balance,
        delinquent: stripeCustomer.delinquent,
        // ... other Stripe-specific fields
      },
      // ... map other universal fields
    };
  }
  // ... implement other methods
}
```

## TESTING REQUIREMENTS
Create tests for:
- Universal schema validation with various service data
- Adapter transformations (to/from universal formats)
- Type collision detection system
- Cross-service data flow scenarios

## SUCCESS CRITERIA
- Universal entity schemas work with multiple service types
- Service adapters enable bi-directional transformations
- Type collision system detects and warns about conflicts
- Ready for unlimited service connector scaling
- Integration with ETL Pipeline for automatic cross-service workflows
- Foundation prepared for plugin-generated service adapters
```

### **PROMPT 4: CREDENTIAL MANAGEMENT SYSTEM**

```markdown
# 🔐 IMPLEMENT: Credential Management System

## CONTEXT
Implement a secure credential management system for imajin-cli that safely stores and retrieves API keys, OAuth tokens, and other authentication data for generated plugins. This must be secure, cross-platform, and easy to use.

## ARCHITECTURAL VISION
Generated plugins need secure access to credentials without hardcoding secrets:
- Platform-native credential storage (Keychain, Credential Manager, libsecret)
- Environment variable fallback for CI/CD environments
- Encrypted storage for portable configurations
- Plugin-specific credential isolation

## DELIVERABLES
1. `src/core/credentials/CredentialManager.ts` - Core credential management
2. `src/core/credentials/KeychainProvider.ts` - macOS Keychain integration
3. `src/core/credentials/WindowsCredentialProvider.ts` - Windows Credential Manager
4. `src/core/credentials/LinuxSecretProvider.ts` - Linux libsecret integration
5. `src/core/credentials/EnvironmentProvider.ts` - Environment variable fallback
6. `src/core/credentials/EncryptedFileProvider.ts` - Encrypted file storage

## IMPLEMENTATION REQUIREMENTS

### 1. Credential Manager Interface
```typescript
interface CredentialManager {
  store(service: string, credentials: any): Promise<void>;
  retrieve(service: string): Promise<any>;
  delete(service: string): Promise<void>;
  list(): Promise<string[]>;
  test(service: string): Promise<boolean>;
}
```

### 2. Platform-Specific Providers
- Auto-detect platform and use appropriate provider
- Graceful fallback to environment variables
- Consistent interface across all platforms
- Proper error handling for permission issues

### 3. Security Features
- Never store credentials in plaintext
- Plugin isolation (one plugin can't access another's credentials)
- Master password option for encrypted file storage
- Automatic credential validation and expiry handling

### 4. CLI Integration
```bash
imajin auth:setup stripe --api-key
imajin auth:setup github --oauth
imajin auth:list
imajin auth:test stripe
imajin auth:remove github
```

## SUCCESS CRITERIA
- Credentials stored securely on all platforms
- Generated plugins can access their credentials safely
- Zero plaintext secrets in generated code
- Easy setup and management through CLI commands
- Ready for plugin generator integration
```

### **PROMPT 5: PLUGIN GENERATOR ENGINE (SIMPLIFIED)**

```markdown
# 🤖 IMPLEMENT: Plugin Generator Engine (Foundation)

## CONTEXT
Create a basic Plugin Generator system that can create simple CLI plugins from OpenAPI specifications. This is the FOUNDATION version - focused on core functionality without advanced features like auto-healing.

## ARCHITECTURAL VISION
Start simple and build up:
- OpenAPI spec → Basic CLI plugin with CRUD operations
- Generated plugins use the Command Pattern framework
- Plugins integrate with Credential Management system
- Foundation for future auto-healing and advanced features

## DELIVERABLES
1. `src/generators/PluginGenerator.ts` - Core plugin generation
2. `src/generators/OpenAPIParser.ts` - OpenAPI spec parsing
3. `src/generators/templates/` - Basic code generation templates
4. `src/core/PluginManager.ts` - Plugin loading and management
5. Generated plugin example (for validation)

## IMPLEMENTATION REQUIREMENTS

### 1. Plugin Generator (Basic Version)
```typescript
interface PluginGenerator {
  generateFromOpenAPI(spec: OpenAPISpec): Promise<GeneratedPlugin>;
  validateSpec(spec: OpenAPISpec): ValidationResult;
  createPluginFiles(plugin: GeneratedPlugin): Promise<string[]>;
}
```

### 2. Generated Plugin Structure (Simplified)
```typescript
interface GeneratedPlugin {
  name: string;
  version: string;
  commands: CommandDefinition[];
  authType: 'api-key' | 'oauth2' | 'bearer';
  files: PluginFile[];
}
```

### 3. Basic Templates
- Simple command class template
- Basic authentication handling
- Standard error handling (no auto-healing yet)
- TypeScript interfaces from OpenAPI schemas

### 4. Integration Requirements
- Generated plugins must work with Command Pattern framework
- Must integrate with Credential Management system
- Should be loadable through Plugin Manager
- Prepare structure for future auto-healing features

## SUCCESS CRITERIA
- Can generate a working plugin from Stripe OpenAPI spec
- Generated plugin integrates with existing command system
- Basic CRUD operations work (create, read, update, delete)
- Authentication works with credential management
- Foundation ready for advanced features in later phases
```

### **PROMPT 6: EVENT-DRIVEN SYSTEM**

```markdown
# 🚀 IMPLEMENT: Event-Driven System

## CONTEXT
Create a comprehensive event-driven architecture for imajin-cli that enables real-time communication, progress tracking, and loose coupling between components. This builds on Service Providers and Command Pattern.

## ARCHITECTURAL VISION
Events enable loose coupling and real-time communication:
- Components communicate through events rather than direct calls
- Real-time progress tracking for CLI operations
- Foundation for LLM communication and monitoring
- Integration with plugin system for event-driven workflows

## DELIVERABLES
1. `src/core/events/Event.ts` - Base event interface and types
2. `src/core/events/EventEmitter.ts` - Enhanced event emitter
3. `src/core/events/EventManager.ts` - Event registration and coordination
4. `src/core/events/EventServiceProvider.ts` - Event system provider
5. Integration with Command Pattern for event-driven commands

## IMPLEMENTATION REQUIREMENTS

### 1. Event System Foundation
- Type-safe event definitions
- Event metadata and serialization
- Event versioning and backward compatibility
- Integration with Node.js EventEmitter

### 2. Event Management
- Event listener registration and lifecycle
- Event middleware pipeline
- Error handling and dead letter queues
- Performance monitoring and metrics

### 3. Integration Points
- Commands can emit events during execution
- Plugins can subscribe to system events
- Foundation for real-time progress tracking
- Preparation for LLM communication

## SUCCESS CRITERIA
- Events can be emitted and consumed reliably
- Real-time updates work for CLI operations
- Plugin system can use events for communication
- Foundation ready for background jobs and monitoring
```

---

## 🔧 **PHASE 2: INFRASTRUCTURE COMPONENTS**

### **PROMPT 7: ETL PIPELINE SYSTEM**

```markdown
# 📊 IMPLEMENT: ETL Pipeline System

## CONTEXT
Create a modern TypeScript ETL (Extract, Transform, Load) architecture for imajin-cli that enables data processing workflows, service integrations, and automated data transformations between different API services.

## ARCHITECTURAL VISION
Modern TypeScript ETL patterns:
- Composable Extract → Transform → Load pipeline
- Async/await patterns for API operations
- Type-safe data transformations with Zod
- Stream processing for large datasets
- Pluggable architecture for different data sources

## DELIVERABLES
1. `src/etl/core/` - ETL base abstractions
2. `src/etl/extractors/` - Data extraction components
3. `src/etl/transformers/` - Data transformation logic
4. `src/etl/loaders/` - Data loading components
5. `src/etl/Pipeline.ts` - ETL orchestration system
6. Integration with Command Pattern and Event System

## IMPLEMENTATION REQUIREMENTS

### 1. ETL Abstractions
- Generic Extractor, Transformer, Loader interfaces
- Pipeline composition and execution
- Data validation and error handling
- Progress tracking through events

### 2. Extractor System
- HTTP API data extraction
- Rate limiting and authentication
- Data pagination and streaming
- Error recovery and retries

### 3. Transformer System
- Data mapping and transformation rules
- Field-level transformation functions
- Validation and sanitization
- Business logic processing

### 4. Loader System
- Multi-target data loading
- Batch and streaming operations
- Conflict resolution and upserts
- Transaction management

## SUCCESS CRITERIA
- ETL pipelines can be composed and executed
- Data flows through Extract → Transform → Load stages
- Progress is tracked and reported via events
- Ready for Stripe integration and other connectors
- Integrates with Command Pattern for CLI operations
```

### **PROMPT 8: EXCEPTION SYSTEM & ERROR HANDLING**

```markdown
# ⚠️ IMPLEMENT: Exception System & Error Handling

## CONTEXT
Create a comprehensive exception hierarchy and error handling system that provides clear error classification, recovery strategies, and user-friendly error messages for all system components.

## ARCHITECTURAL VISION
Enterprise-grade error handling:
- Custom exception hierarchy for different error types
- Error classification and severity levels
- Automatic error recovery strategies
- User-friendly error messages for CLI users
- Structured error reporting for LLM consumption

## DELIVERABLES
1. `src/exceptions/BaseException.ts` - Base exception class
2. `src/exceptions/` - Exception hierarchy (ValidationError, ApiError, etc.)
3. `src/core/ErrorHandler.ts` - Global error handling
4. `src/core/ErrorRecovery.ts` - Error recovery strategies
5. Integration with all existing components

## IMPLEMENTATION REQUIREMENTS

### 1. Exception Hierarchy
```typescript
interface ImajinException {
  readonly code: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'validation' | 'api' | 'auth' | 'system' | 'user';
  readonly recoverable: boolean;
  readonly userMessage: string;
  readonly technicalDetails: any;
}
```

### 2. Error Recovery System
- Automatic retry mechanisms with exponential backoff
- Graceful degradation strategies
- Error context preservation
- Recovery suggestion engine

### 3. User Experience
- Clear, actionable error messages
- Suggested fixes and workarounds
- Progress preservation during errors
- Error reporting to support systems

## SUCCESS CRITERIA
- All system components use structured error handling
- Users receive clear, actionable error messages
- LLM can understand and respond to error contexts
- System can automatically recover from transient failures
```

### **PROMPT 9: RATE LIMITING & API MANAGEMENT**

```markdown
# 🚦 IMPLEMENT: Rate Limiting & API Management

## CONTEXT
Create sophisticated rate limiting and API management capabilities that respect service limits, prevent abuse, and ensure reliable operation across all integrated services.

## ARCHITECTURAL VISION
Professional API management:
- Per-service rate limiting with different strategies
- Request queuing and throttling
- Circuit breaker patterns for API failures
- Connection pooling and management
- API health monitoring and fallback strategies

## DELIVERABLES
1. `src/core/ratelimit/RateLimiter.ts` - Core rate limiting
2. `src/core/ratelimit/strategies/` - Different limiting strategies
3. `src/core/api/ApiManager.ts` - API connection management
4. `src/core/api/CircuitBreaker.ts` - Circuit breaker implementation
5. Integration with all service connectors

## IMPLEMENTATION REQUIREMENTS

### 1. Rate Limiting Strategies
```typescript
interface RateLimitStrategy {
  readonly name: string;
  canMakeRequest(serviceId: string): boolean;
  recordRequest(serviceId: string): void;
  getWaitTime(serviceId: string): number;
  getStatus(serviceId: string): RateLimitStatus;
}

// Implementations: TokenBucket, SlidingWindow, FixedWindow
```

### 2. Circuit Breaker Pattern
- Automatic failure detection
- Service degradation modes
- Recovery testing and restoration
- Fallback strategy execution

### 3. API Health Management
- Connection pooling and reuse
- Health check scheduling
- Automatic reconnection logic
- Performance metrics collection

## SUCCESS CRITERIA
- No API rate limit violations across all services
- Graceful handling of API outages and failures
- Automatic recovery from transient issues
- Performance optimization through connection pooling
```

### **PROMPT 10: MEDIA PROCESSING SYSTEM**

```markdown
# 🎨 IMPLEMENT: Media Processing System

## CONTEXT
Create a comprehensive media processing system that handles image/video uploads, transformations, optimization, and metadata management for generated plugins and direct CLI usage.

## ARCHITECTURAL VISION
Modern media processing pipeline:
- Multi-provider support (Cloudinary, AWS S3, local storage)
- Automatic image/video optimization
- Metadata extraction and management
- Transformation pipelines for different use cases
- CDN integration and cache management

## DELIVERABLES
1. `src/media/MediaProcessor.ts` - Core media processing
2. `src/media/providers/` - Provider implementations
3. `src/media/transformations/` - Image/video transformations
4. `src/media/metadata/` - Metadata extraction
5. `src/commands/media/` - Media CLI commands

## IMPLEMENTATION REQUIREMENTS

### 1. Media Provider Interface
```typescript
interface MediaProvider {
  upload(file: Buffer, options: UploadOptions): Promise<MediaAsset>;
  transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset>;
  delete(assetId: string): Promise<void>;
  getMetadata(assetId: string): Promise<MediaMetadata>;
}
```

### 2. Transformation Pipeline
- Image resizing and optimization
- Format conversion (WebP, AVIF)
- Video transcoding and compression
- Thumbnail generation
- Watermarking and overlays

### 3. CLI Integration
```bash
imajin media upload ./image.jpg --optimize --resize 1920x1080
imajin media transform asset123 --format webp --quality 85
imajin media batch-optimize ./images/ --output ./optimized/
```

## SUCCESS CRITERIA
- Can process images and videos through multiple providers
- Automatic optimization reduces file sizes significantly
- Metadata extraction works for common formats
- CLI commands provide intuitive media management
- Ready for integration with generated plugins
```

### **PROMPT 11: WEBHOOKS & HTTP LAYER**

```markdown
# 🔗 IMPLEMENT: Webhooks & HTTP Layer

## CONTEXT
Create a robust HTTP layer that can receive webhooks from external services, manage HTTP servers for real-time communication, and provide HTTP utilities for all system components.

## ARCHITECTURAL VISION
Production-ready HTTP infrastructure:
- Webhook receiver server for external integrations
- HTTP utilities for outbound requests
- Request/response middleware pipeline
- Security features (signature validation, CORS)
- Integration with event system for webhook processing

## DELIVERABLES
1. `src/http/WebhookServer.ts` - Webhook receiving server
2. `src/http/HttpClient.ts` - Enhanced HTTP client
3. `src/http/middleware/` - Request/response middleware
4. `src/http/security/` - Security utilities
5. `src/commands/webhook/` - Webhook management commands

## IMPLEMENTATION REQUIREMENTS

### 1. Webhook Server
```typescript
interface WebhookServer {
  start(port: number): Promise<void>;
  registerHandler(path: string, handler: WebhookHandler): void;
  validateSignature(payload: string, signature: string, secret: string): boolean;
  processWebhook(request: WebhookRequest): Promise<WebhookResponse>;
}
```

### 2. HTTP Client Enhancement
- Built-in retry logic with exponential backoff
- Request/response interceptors
- Automatic error handling and logging
- Integration with rate limiting system

### 3. Security Features
- Webhook signature validation
- IP whitelist/blacklist support
- CORS configuration
- Request size limits

## SUCCESS CRITERIA
- Can receive and process webhooks from external services
- HTTP client provides reliable outbound communication
- Security features prevent abuse and unauthorized access
- Integration with event system enables webhook-driven workflows
```

### **PROMPT 12: ETL PIPELINE SYSTEM**

```markdown
# 📊 IMPLEMENT: ETL Pipeline System

## CONTEXT
Create a modern TypeScript ETL (Extract, Transform, Load) architecture for imajin-cli that enables data processing workflows, service integrations, and automated data transformations between different API services.

## ARCHITECTURAL VISION
Modern TypeScript ETL patterns:
- Composable Extract → Transform → Load pipeline
- Async/await patterns for API operations
- Type-safe data transformations with Zod
- Stream processing for large datasets
- Pluggable architecture for different data sources

## DELIVERABLES
1. `src/etl/core/` - ETL base abstractions
2. `src/etl/extractors/` - Data extraction components
3. `src/etl/transformers/` - Data transformation logic
4. `src/etl/loaders/` - Data loading components
5. `src/etl/Pipeline.ts` - ETL orchestration system
6. Integration with Command Pattern and Event System

## IMPLEMENTATION REQUIREMENTS

### 1. ETL Abstractions
- Generic Extractor, Transformer, Loader interfaces
- Pipeline composition and execution
- Data validation and error handling
- Progress tracking through events

### 2. Extractor System
- HTTP API data extraction
- Rate limiting and authentication
- Data pagination and streaming
- Error recovery and retries

### 3. Transformer System
- Data mapping and transformation rules
- Field-level transformation functions
- Validation and sanitization
- Business logic processing

### 4. Loader System
- Multi-target data loading
- Batch and streaming operations
- Conflict resolution and upserts
- Transaction management

## SUCCESS CRITERIA
- ETL pipelines can be composed and executed
- Data flows through Extract → Transform → Load stages
- Progress is tracked and reported via events
- Ready for Stripe integration and other connectors
  - Integrates with Command Pattern for CLI operations
```

### **PROMPT 13: SERVICE LAYER**

```markdown
# 🏢 IMPLEMENT: Service Layer

## CONTEXT
Create a comprehensive service layer architecture that provides business logic encapsulation, dependency management, and integration capabilities. This builds on Service Providers and Exception System.

## DELIVERABLES
1. `src/services/BaseService.ts` - Base service abstraction
2. `src/services/interfaces/` - Service interfaces and contracts
3. `src/services/ServiceRegistry.ts` - Service discovery and management
4. Factory and Strategy pattern implementations
5. Integration with ETL Pipeline and Event System

## SUCCESS CRITERIA
- Services can be registered, discovered, and injected
- Factory and Strategy patterns enable flexible object creation
- Clean business logic encapsulation
- Ready for connector integrations
- Proper integration with existing architecture
```

### **PROMPT 14: REPOSITORY PATTERN**

```markdown
# 🗄️ IMPLEMENT: Repository Pattern

## CONTEXT
Implement the Repository pattern for data access abstraction, enabling clean separation between business logic and data persistence. This supports multiple data sources and enables testability.

## DELIVERABLES
1. `src/repositories/Repository.ts` - Base repository interface
2. `src/repositories/BaseRepository.ts` - Common repository functionality
3. `src/repositories/implementations/` - Concrete repository implementations
4. Integration with Service Layer and ETL Pipeline

## SUCCESS CRITERIA
- Data access is abstracted through repositories
- Multiple data sources can be supported
- Clean integration with services and ETL
- Testable and mockable data layer
```

### **PROMPT 15: BACKGROUND JOB PROCESSING**

```markdown
# ⚙️ IMPLEMENT: Background Job Processing

## CONTEXT
Create a background job processing system for long-running operations, ETL pipelines, and asynchronous task management. Integrates with the Event System for progress tracking.

## DELIVERABLES
1. `src/jobs/Job.ts` - Base job interface
2. `src/jobs/JobQueue.ts` - Job queue management
3. `src/jobs/JobProcessor.ts` - Job execution engine
4. Integration with Event System for progress tracking

## SUCCESS CRITERIA
- Jobs can be queued and processed asynchronously
- Progress is tracked through events
- Error handling and retry mechanisms work
- Ready for ETL pipeline integration
```

### **PROMPT 16: MONITORING & DIAGNOSTICS**

```markdown
# 📊 IMPLEMENT: Monitoring & Diagnostics

## CONTEXT
Create comprehensive monitoring and diagnostics capabilities for system health, performance tracking, and operational insights. Enhanced with patterns from enterprise systems.

## DELIVERABLES
1. `src/diagnostics/HealthCheck.ts` - System health monitoring
2. `src/diagnostics/MetricsCollector.ts` - Performance metrics
3. `src/diagnostics/SystemMonitor.ts` - Overall system monitoring
4. `src/diagnostics/BulkOperationMonitor.ts` - High-volume operation tracking
5. Integration with all other components

## SUCCESS CRITERIA
- System health can be monitored and reported
- Performance metrics are collected
- Bulk operations are tracked and optimized
- Diagnostic information is available for troubleshooting
- LLM can query system status
```

### **PROMPT 17: COMPREHENSIVE LOGGING SYSTEM**

```markdown
# 📝 IMPLEMENT: Comprehensive Logging System

## CONTEXT
Create a sophisticated logging infrastructure that supports structured logging, multiple outputs, and integration with all system components.

## DELIVERABLES
1. `src/logging/Logger.ts` - Main logging service
2. `src/logging/LoggerConfig.ts` - Logging configuration
3. `src/logging/formatters/` - Log formatting utilities
4. Integration with all components

## SUCCESS CRITERIA
- Structured logging throughout the application
- Multiple log levels and outputs
- Integration with monitoring and diagnostics
- LLM-friendly log formats
```

---

## 🎯 **PHASE 3: SERVICE INTEGRATION**

### **PROMPT 18: STRIPE CONNECTOR**

```markdown
# 💳 IMPLEMENT: Stripe Connector

## CONTEXT
Create the first service connector for Stripe integration, serving as the reference implementation for the imajin-cli pattern and enabling payment processing, subscription management, and financial workflow automation.

## DELIVERABLES
1. `src/services/stripe/StripeService.ts` - Core Stripe integration
2. `src/services/stripe/commands/` - Stripe-specific commands
3. `src/services/stripe/models/` - Stripe data models (Customer, Payment, Subscription)
4. `src/services/stripe/StripeServiceProvider.ts` - Service provider
5. CLI commands for Stripe operations

## SUCCESS CRITERIA
- Can create customers, process payments, manage subscriptions
- ETL pipeline can sync data to/from Stripe
- Real-time webhook event processing works
- LLM can interact with Stripe data through CLI
- Reference implementation for other connectors
```

### **PROMPT 19: REAL-TIME PROGRESS TRACKING**

```markdown
# ⚡ IMPLEMENT: Real-time Progress Tracking

## CONTEXT
Create comprehensive real-time progress tracking that enables LLM interaction, live operation monitoring, and responsive user experience.

## DELIVERABLES
1. `src/realtime/ProgressTracker.ts` - Progress tracking service
2. `src/realtime/WebSocketServer.ts` - Real-time communication
3. `src/realtime/ProgressEmitter.ts` - Progress event emission
4. Integration with all operations and ETL pipelines

## SUCCESS CRITERIA
- Operations can be tracked in real-time
- LLM can receive live progress updates
- WebSocket communication works reliably
- Integration with CLI and services
```

### **PROMPT 20: LLM INTROSPECTION APIS**

```markdown
# 🤖 IMPLEMENT: LLM Introspection APIs

## CONTEXT
Create comprehensive introspection capabilities that enable LLM discovery, interaction, and automation of the imajin-cli system.

## DELIVERABLES
1. `src/introspection/SchemaIntrospector.ts` - Schema discovery
2. `src/introspection/CommandIntrospector.ts` - Command discovery
3. `src/introspection/ServiceIntrospector.ts` - Service discovery
4. JSON APIs for LLM interaction

## SUCCESS CRITERIA
- LLM can discover all available commands and services
- JSON schemas are available for all operations
- Interactive help and documentation
- Self-documenting system capabilities
```

### **PROMPT 21: CROSS-SERVICE WORKFLOWS**

```markdown
# 🔄 IMPLEMENT: Cross-service Workflows

## CONTEXT
Create workflow orchestration capabilities that enable complex, multi-service operations and automated business processes.

## DELIVERABLES
1. `src/workflows/Workflow.ts` - Workflow definition and execution
2. `src/workflows/WorkflowOrchestrator.ts` - Workflow management
3. `src/workflows/steps/` - Workflow step implementations
4. Integration with all services and ETL pipelines

## SUCCESS CRITERIA
- Multi-service workflows can be defined and executed
- Error handling and recovery mechanisms
- Progress tracking through entire workflows
- LLM can trigger and monitor workflows
```

---

## 🎯 **USAGE INSTRUCTIONS**

### **For Each Session:**

1. **Setup Context:**
```bash
# Check current progress
cat docs/DEVELOPMENT_PROGRESS.md

# Find active task and copy corresponding prompt
# Example: Service Provider System = Prompt 1
```

2. **Execute Prompt:**
   - Copy the full prompt for the active task
   - Follow implementation requirements exactly  
   - Create all specified files with proper headers
   - Implement integration points as described

3. **Update Progress:**
```bash
# Move task from "In Progress" to "Completed"
# Update DEVELOPMENT_PROGRESS.md
# Set next task to "In Progress"
```

4. **Validate Completion:**
   - Check all deliverables are created
   - Verify integration points work
   - Run tests if specified
   - Confirm success criteria are met

### **Prompt Customization:**
- Replace `[Author]` with actual author name
- Update dates to current date
- Adjust file paths if needed
- Add specific requirements as discovered

This creates a **complete implementation workflow** where each task has detailed, actionable guidance for consistent, high-quality development! 🚀 