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
 * @author      Generated
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
 * @author      Generated
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

### **PROMPT 7: ETL PIPELINE SYSTEM WITH GRAPH TRANSLATION**

```markdown
# 📊 IMPLEMENT: Enhanced ETL Pipeline System with Graph-to-Graph Translation

## CONTEXT
Create a modern TypeScript ETL (Extract, Transform, Load) architecture for imajin-cli that enables:
1. **Traditional data processing** workflows and service integrations
2. **Graph-to-Graph translation** between standard graph models (social-commerce, creative-portfolio, professional-network)
3. **Context normalization** where users can translate any external graph into their chosen model
4. **Universal communication** between nodes using the same standard models

## ARCHITECTURAL VISION
**Dual-Purpose ETL System:**
- **Service ETL**: Traditional API service data transformations (Stripe → Internal, etc.)
- **Graph ETL**: Translation between standard graph models for user-to-user communication
- **Context ETL**: Normalize external graphs into user's chosen context/model
- **Bridge ETL**: Efficient communication paths between compatible models

## DELIVERABLES
1. `src/etl/core/` - ETL base abstractions (enhanced)
2. `src/etl/extractors/` - Data extraction components (services + graphs)
3. `src/etl/transformers/` - Data transformation logic (enhanced with graph translation)
4. `src/etl/loaders/` - Data loading components (enhanced)
5. `src/etl/Pipeline.ts` - ETL orchestration system (enhanced)
6. `src/etl/graphs/` - **NEW**: Graph model definitions and translators
7. `src/etl/bridges/` - **NEW**: Graph-to-graph bridge configurations
8. Integration with Command Pattern and Event System

## IMPLEMENTATION REQUIREMENTS

### 1. Enhanced ETL Abstractions
```typescript
// Base ETL interfaces (existing)
interface Extractor<TInput, TOutput> {
  extract(input: TInput): Promise<TOutput>;
  validate(input: TInput): boolean;
}

interface Transformer<TInput, TOutput> {
  transform(input: TInput): Promise<TOutput>;
  getSchema(): TransformationSchema;
}

interface Loader<TInput> {
  load(data: TInput): Promise<LoadResult>;
  getBatchSize(): number;
}

// NEW: Graph translation interfaces
interface GraphTranslator<TSource extends GraphModel, TTarget extends GraphModel> {
  translate(sourceGraph: TSource): Promise<TTarget>;
  canTranslate(sourceModel: string, targetModel: string): boolean;
  getBridgeConfig(): BridgeConfiguration;
  getEfficiencyScore(): number; // Higher = less transformation needed
}

interface GraphModel {
  readonly modelType: 'social-commerce' | 'creative-portfolio' | 'professional-network' | 'community-hub';
  readonly version: string;
  readonly schema: GraphSchema;
  readonly compatibilityMap: CompatibilityMatrix;
}
```

### 2. Standard Graph Model System
```typescript
// Define standard graph models
interface SocialCommerceGraph extends GraphModel {
  identity: PersonalProfile;
  catalog: {
    products: Product[];
    services: Service[];
    events: Event[];
  };
  social: {
    connections: Connection[];
    reputation: ReputationScore;
  };
  commerce: {
    payments: PaymentMethod[];
    transactions: Transaction[];
  };
}

interface CreativePortfolioGraph extends GraphModel {
  identity: ArtistProfile;
  portfolio: {
    artworks: Artwork[];
    collections: Collection[];
    exhibitions: Exhibition[];
  };
  professional: {
    commissions: Commission[];
    availability: Availability;
  };
}

interface ProfessionalNetworkGraph extends GraphModel {
  identity: ProfessionalProfile;
  experience: {
    positions: Position[];
    skills: Skill[];
    certifications: Certification[];
  };
  network: {
    connections: ProfessionalConnection[];
    recommendations: Recommendation[];
  };
}
```

### 3. Graph Translation Engine
```typescript
export class GraphTranslationEngine {
  // Direct communication (same models - no ETL needed)
  canCommunicateDirectly(modelA: string, modelB: string): boolean;
  
  // Translation required (different models)
  async translateGraph<T extends GraphModel, U extends GraphModel>(
    sourceGraph: T, 
    targetModel: string
  ): Promise<U>;
  
  // Bridge generation for common translation paths
  generateBridge(sourceModel: string, targetModel: string): BridgeConfig;
  
  // Context normalization - translate ANY external graph to user's model
  async normalizeToContext<T extends GraphModel>(
    externalGraph: unknown,
    userContextModel: string
  ): Promise<T>;
}
```

### 4. Enhanced Extractor System
- **Service Extractors**: HTTP API data extraction (existing)
- **Graph Extractors**: Extract data from user graph endpoints
- **Model Detectors**: Automatically detect which standard model a graph uses
- **Compatibility Analyzers**: Determine translation requirements

### 5. Enhanced Transformer System
- **Service Transformers**: Data mapping for API services (existing)
- **Graph Transformers**: Transform between standard graph models
- **Context Normalizers**: Normalize external graphs to user's chosen context
- **Bridge Optimizers**: Optimize translation paths for efficiency

### 6. Enhanced Loader System
- **Service Loaders**: Load to external API services (existing)
- **Graph Loaders**: Load translated data into user's graph context
- **Bridge Loaders**: Efficiently load between compatible models
- **Context Loaders**: Load normalized external data

## FILE HEADERS
Use the imajin TypeScript header template:
```typescript
/**
 * [ClassName] - [Brief Description]
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Graph-to-graph translation for user communication
 * - Standard model compatibility and bridging
 * - Context normalization for external graphs
 * - Service ETL integration for traditional workflows
 */
```

## GRAPH TRANSLATION EXAMPLES

### Example 1: Same Model Communication (No ETL)
```typescript
// John and Sarah both use social-commerce model
const johnGraph: SocialCommerceGraph = await extractUserGraph('john.example.com');
const sarahGraph: SocialCommerceGraph = await extractUserGraph('sarah.example.com');

// Direct communication - no translation needed
const compatibility = engine.canCommunicateDirectly('social-commerce', 'social-commerce'); // true
const events = await johnGraph.social.connections.getEvents(sarahGraph.identity.id);
```

### Example 2: Cross-Model Translation (ETL Required)
```typescript
// Mike uses creative-portfolio, John uses social-commerce
const mikeGraph: CreativePortfolioGraph = await extractUserGraph('mike.example.com');

// Translation required
const mikeInJohnsContext: SocialCommerceGraph = await engine.translateGraph(
  mikeGraph, 
  'social-commerce'
);

// Now John can see Mike's exhibitions as "events" in his social-commerce context
const mikeEvents = mikeInJohnsContext.catalog.events; // Mike's exhibitions → John's events
```

### Example 3: Context Normalization
```typescript
// External graph with unknown/custom model
const externalGraph = await extractUserGraph('linda.example.com'); // Custom model

// Normalize to John's social-commerce context
const lindaInJohnsContext: SocialCommerceGraph = await engine.normalizeToContext(
  externalGraph,
  'social-commerce'
);
```

## CLI INTEGRATION EXAMPLES
```bash
# Traditional service ETL
imajin etl extract stripe-customers | transform to-universal | load my-crm

# NEW: Graph translation
imajin graph:translate mikes-portfolio --to social-commerce --output events
imajin graph:normalize lindas-custom-api --context my-social-commerce  
imajin graph:bridge creative-portfolio social-commerce --optimize

# Discovery based on model compatibility
imajin discover --model social-commerce --direct-compatible
imajin discover --model creative-portfolio --translatable-to social-commerce
```

## INTEGRATION POINTS
- Must work with existing Service Provider system
- Should integrate with Type Collision Prevention system
- Prepare for user API exposition capabilities
- Support for real-time graph synchronization
- Foundation for social graph discovery and networking

## SUCCESS CRITERIA
- **Traditional ETL**: Service data flows work (existing functionality preserved)
- **Graph Translation**: Can translate between all standard graph models
- **Direct Communication**: Same-model graphs communicate without ETL overhead
- **Context Normalization**: External graphs can be normalized to user's context
- **Bridge Optimization**: Common translation paths are optimized for efficiency
- **CLI Integration**: Graph operations are accessible via intuitive commands
- **Real-time Capable**: Graph translations can happen in real-time for live workflows
- **Foundation Ready**: Prepared for user API exposition and social graph features
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

## 🤖 **PHASE 2.5: AI-ASSISTED CLI GENERATION** *(The Game Changer)*

### **PROMPT 18: AI CONTEXT ANALYSIS ENGINE**

```markdown
# 🧠 IMPLEMENT: AI Context Analysis Engine

## CONTEXT
Create an AI-powered context analysis system that understands business domains, API relationships, and user workflows to generate intelligent, business-aware CLI commands instead of generic CRUD operations.

## ARCHITECTURAL VISION
**The breakthrough insight:** Professional CLIs aren't just API wrappers - they're business workflow tools that understand context, relationships, and user intent.

**AI-Powered Analysis:**
- Business domain understanding from API documentation
- Workflow pattern recognition across endpoint relationships
- Context-aware command naming and organization
- Intent-driven parameter inference and validation
- Intelligent error handling with business context

## DELIVERABLES
1. `src/ai/ContextAnalyzer.ts` - Core AI context analysis
2. `src/ai/BusinessDomainDetector.ts` - Industry/domain classification
3. `src/ai/WorkflowDiscoverer.ts` - Multi-step process identification
4. `src/ai/ContextPromptBuilder.ts` - Dynamic AI prompt generation
5. `src/ai/providers/` - LLM provider integrations (OpenAI, Claude, etc.)

## IMPLEMENTATION REQUIREMENTS

### 1. Business Context Analysis
```typescript
interface BusinessContext {
  domain: 'ecommerce' | 'fintech' | 'saas' | 'healthcare' | 'creative' | 'general';
  workflows: BusinessWorkflow[];
  entities: BusinessEntity[];
  relationships: EntityRelationship[];
  terminology: DomainTerminology;
}

interface ContextAnalyzer {
  analyzeAPI(spec: OpenAPISpec, hints?: string[]): Promise<BusinessContext>;
  identifyWorkflows(endpoints: APIEndpoint[]): Promise<BusinessWorkflow[]>;
  generateCommandNames(workflow: BusinessWorkflow): Promise<string[]>;
  optimizeForDomain(context: BusinessContext): Promise<OptimizationSuggestions>;
}
```

### 2. Workflow Discovery System
```typescript
interface BusinessWorkflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  commonParameters: Parameter[];
  errorScenarios: ErrorScenario[];
  businessValue: string;
}

// Example: Instead of separate API calls for customer creation
// AI identifies the "Customer Onboarding" workflow:
// 1. Create customer record
// 2. Set up billing
// 3. Send welcome email
// 4. Notify sales team
// → Single command: customer:onboard
```

### 3. Intelligence Integration
```typescript
interface AIProvider {
  analyzeBusinessContext(apiSpec: string, domain?: string): Promise<BusinessContext>;
  generateCommandDescriptions(workflow: BusinessWorkflow): Promise<CommandDocumentation>;
  improveErrorMessages(error: APIError, context: BusinessContext): Promise<string>;
  suggestWorkflowOptimizations(usage: UsageAnalytics): Promise<OptimizationSuggestions>;
}
```

### 4. Context-Aware Command Generation
- **Smart naming**: `customer:onboard` not `POST /customers`
- **Parameter inference**: Auto-detect required vs optional based on business context
- **Validation rules**: Business-logic validation beyond just schema validation
- **Help generation**: Context-aware examples and documentation

## AI INTEGRATION EXAMPLES

### Example 1: Stripe Context Analysis
```typescript
// Input: Stripe OpenAPI spec
// AI Analysis Output:
{
  domain: 'fintech',
  workflows: [
    {
      name: 'Customer Onboarding',
      steps: ['create_customer', 'setup_payment_method', 'create_subscription'],
      command: 'customer:onboard',
      description: 'Complete customer setup with billing and subscription'
    },
    {
      name: 'Payment Processing',
      steps: ['create_payment_intent', 'confirm_payment', 'handle_webhook'],
      command: 'payment:process',
      description: 'Process payment with automatic confirmation and webhook handling'
    }
  ]
}
```

### Example 2: Context-Aware Error Messages
```typescript
// Instead of: "HTTP 402 Payment Required"
// AI generates: "Customer's payment method has expired. Update it with: stripe billing:update-card --customer cus_123"
```

## SUCCESS CRITERIA
- Can analyze OpenAPI specs and identify business workflows
- Generated commands use business language, not technical endpoints
- AI understands domain context (fintech vs ecommerce vs healthcare)
- Workflow discovery finds meaningful multi-step processes
- Context-aware error messages and help text
- Foundation ready for intelligent CLI generation
```

### **PROMPT 19: INTELLIGENT COMMAND GENERATOR**

```markdown
# ⚡ IMPLEMENT: Intelligent Command Generator

## CONTEXT
Transform the basic Plugin Generator into an AI-powered intelligent system that creates professional, workflow-aware CLI commands based on business context analysis and user domain understanding.

## ARCHITECTURAL VISION
**Beyond Basic CRUD:** Generate commands that match how business users actually think and work, not just mirror API endpoints.

**Intelligence Features:**
- Business workflow automation in single commands
- Smart parameter defaults and inference
- Context-aware validation and error handling
- Progressive enhancement based on usage patterns
- Domain-specific terminology and conventions

## DELIVERABLES
1. `src/generators/IntelligentGenerator.ts` - AI-enhanced CLI generation
2. `src/generators/WorkflowCommandBuilder.ts` - Multi-step workflow automation
3. `src/generators/SmartParameterEngine.ts` - Intelligent parameter handling
4. `src/generators/templates/intelligent/` - AI-generated command templates
5. Enhanced Plugin Generator with AI integration

## IMPLEMENTATION REQUIREMENTS

### 1. Intelligent Command Generation
```typescript
interface IntelligentGenerator extends PluginGenerator {
  generateFromContext(
    spec: OpenAPISpec, 
    context: BusinessContext
  ): Promise<IntelligentPlugin>;
  
  optimizeWorkflows(
    workflows: BusinessWorkflow[]
  ): Promise<WorkflowCommand[]>;
  
  enhanceWithAI(
    basicPlugin: GeneratedPlugin,
    context: BusinessContext
  ): Promise<IntelligentPlugin>;
}

interface IntelligentPlugin extends GeneratedPlugin {
  workflowCommands: WorkflowCommand[];
  smartValidation: ValidationRule[];
  contextualHelp: ContextualDocumentation;
  errorRecovery: ErrorRecoveryStrategy[];
}
```

### 2. Workflow Command Builder
```typescript
interface WorkflowCommand extends Command {
  workflow: BusinessWorkflow;
  automatedSteps: AutomatedStep[];
  progressTracking: ProgressDefinition;
  rollbackCapability: RollbackStrategy;
  
  // Example: customer:onboard command that:
  // 1. Creates customer
  // 2. Sets up billing
  // 3. Sends welcome email
  // 4. Notifies sales team
  // All in one intelligent command
}
```

### 3. Smart Parameter Engine
```typescript
interface SmartParameterEngine {
  inferDefaults(context: BusinessContext, command: Command): Promise<ParameterDefaults>;
  validateBusinessRules(params: any, context: BusinessContext): Promise<ValidationResult>;
  suggestParameters(partialInput: any, context: BusinessContext): Promise<ParameterSuggestion[]>;
  
  // Examples:
  // - Auto-infer customer timezone from email domain
  // - Suggest product SKUs based on category
  // - Validate business hours for appointment scheduling
}
```

### 4. Progressive Enhancement
```typescript
interface UsageAnalytics {
  commandUsage: Map<string, UsageStats>;
  errorPatterns: ErrorPattern[];
  workflowEfficiency: EfficiencyMetrics;
}

interface CommandOptimizer {
  analyzeUsage(analytics: UsageAnalytics): Promise<OptimizationOpportunities>;
  suggestNewWorkflows(patterns: UsagePattern[]): Promise<WorkflowSuggestion[]>;
  improveErrorHandling(errorPatterns: ErrorPattern[]): Promise<ErrorImprovement[]>;
}
```

## GENERATED CLI EXAMPLES

### Before (Basic Generator):
```bash
stripe create-customer --email user@example.com
stripe create-payment-method --customer cus_123 --type card
stripe create-subscription --customer cus_123 --items '[{"price":"price_123"}]'
stripe send-webhook --endpoint webhook_url --event customer.created
```

### After (Intelligent Generator):
```bash
# Single intelligent command handles entire workflow
stripe customer:onboard \
  --email "user@example.com" \
  --name "Jane Doe" \
  --plan "pro-monthly" \
  --notify-sales \
  --send-welcome-email

# AI infers missing parameters and handles complex workflows
# Provides real-time progress: "Creating customer... Setting up billing... Sending notifications..."
```

## SUCCESS CRITERIA
- Generated CLIs feel professionally crafted, not auto-generated
- Commands match business workflows, not just API endpoints
- Smart parameter inference reduces user typing
- Error messages are helpful and actionable
- CLI evolves and improves based on usage patterns
- Ready for domain-specific optimizations
```

### **PROMPT 20: ADAPTIVE CLI OPTIMIZER**

```markdown
# 🔄 IMPLEMENT: Adaptive CLI Optimizer

## CONTEXT
Create a learning system that continuously improves generated CLIs based on usage patterns, error analysis, and user feedback to evolve from good tools into indispensable business workflow automation.

## ARCHITECTURAL VISION
**CLIs that get smarter over time:** Learn from real usage to optimize workflows, reduce errors, and automate common patterns that emerge from actual business operations.

**Adaptive Intelligence:**
- Usage pattern analysis for workflow optimization
- Error pattern recognition for improved handling
- Parameter optimization based on common values
- Automatic workflow discovery from usage sequences
- Performance optimization through predictive caching

## DELIVERABLES
1. `src/optimization/UsageAnalyzer.ts` - Usage pattern analysis
2. `src/optimization/WorkflowOptimizer.ts` - Automatic workflow improvements
3. `src/optimization/ErrorLearningEngine.ts` - Error pattern learning
4. `src/optimization/PredictiveEngine.ts` - Parameter and workflow prediction
5. `src/optimization/AdaptiveUpdater.ts` - Safe automatic CLI improvements

## IMPLEMENTATION REQUIREMENTS

### 1. Usage Pattern Analysis
```typescript
interface UsageAnalyzer {
  trackCommandUsage(command: string, params: any, result: CommandResult): Promise<void>;
  identifyWorkflowPatterns(timeWindow: TimeRange): Promise<WorkflowPattern[]>;
  analyzeParameterUsage(command: string): Promise<ParameterAnalytics>;
  detectInefficiencies(workflows: WorkflowPattern[]): Promise<OptimizationOpportunity[]>;
}

interface WorkflowPattern {
  commands: string[];
  frequency: number;
  averageDuration: number;
  commonParameters: ParameterPattern[];
  errorRate: number;
  suggestedOptimization: WorkflowOptimization;
}
```

### 2. Intelligent Error Learning
```typescript
interface ErrorLearningEngine {
  analyzeErrorPatterns(errors: CommandError[]): Promise<ErrorInsight[]>;
  generateBetterErrorMessages(error: CommandError): Promise<string>;
  suggestPreventiveValidation(errorPatterns: ErrorPattern[]): Promise<ValidationRule[]>;
  learnRecoveryStrategies(recoveryActions: RecoveryAction[]): Promise<AutoRecoveryRule[]>;
}

// Example: Learning that "invalid API key" errors are often due to
// expired credentials → auto-suggest credential refresh workflow
```

### 3. Predictive Optimization
```typescript
interface PredictiveEngine {
  predictNextCommand(context: CommandContext): Promise<CommandSuggestion[]>;
  suggestParameterValues(command: string, context: any): Promise<ParameterSuggestion[]>;
  optimizeWorkflowOrder(workflow: BusinessWorkflow): Promise<OptimizedWorkflow>;
  cacheCommonOperations(usage: UsageAnalytics): Promise<CacheStrategy>;
}
```

### 4. Safe Adaptive Updates
```typescript
interface AdaptiveUpdater {
  proposeOptimizations(analysis: UsageAnalysis): Promise<OptimizationProposal[]>;
  testOptimizations(proposals: OptimizationProposal[]): Promise<TestResult[]>;
  rolloutImprovements(tested: TestResult[]): Promise<UpdateResult>;
  rollbackIfNeeded(metrics: PerformanceMetrics): Promise<RollbackResult>;
}
```

## OPTIMIZATION EXAMPLES

### Example 1: Workflow Discovery
```typescript
// AI notices this common sequence:
// 1. stripe customer:create
// 2. stripe subscription:create  
// 3. slack notify:sales
// 4. hubspot contact:create

// Suggests new compound command:
// stripe customer:onboard-with-crm --slack-channel sales --hubspot-pipeline new-customers
```

### Example 2: Parameter Optimization
```typescript
// Learns that 90% of customers use "pro-monthly" plan
// Auto-suggests as default: stripe customer:create --plan [pro-monthly]

// Learns common email domains → auto-infer company names
// user@acme.com → suggests --company "Acme Corp"
```

### Example 3: Error Prevention
```typescript
// Learns that attempts to create customers with duplicate emails fail
// Adds automatic duplicate check: "Customer with this email exists. Update instead? [Y/n]"
```

## ADAPTIVE FEATURES

### 1. Smart Defaults Evolution
- Parameters become smarter based on usage patterns
- Context-aware suggestions improve over time
- Common workflows get streamlined automatically

### 2. Proactive Error Prevention
- Validate common failure scenarios before API calls
- Suggest fixes based on previous successful recoveries
- Auto-retry with learned parameters

### 3. Workflow Automation Discovery
- Identify repeated command sequences
- Propose new compound commands
- Optimize multi-step processes

## SUCCESS CRITERIA
- CLIs improve automatically based on real usage
- Error rates decrease over time through learning
- New workflow optimizations emerge from usage patterns
- Parameter defaults become more intelligent
- User efficiency increases measurably over time
- System learns domain-specific optimizations
```

### **PROMPT 21: BUSINESS WORKFLOW DETECTOR**

```markdown
# 🔍 IMPLEMENT: Business Workflow Detector

## CONTEXT
Create an advanced system that discovers, maps, and optimizes real business workflows by analyzing API usage patterns, business documentation, and cross-service integrations to automatically generate sophisticated workflow automation commands.

## ARCHITECTURAL VISION
**Beyond Single-Service Commands:** Detect and automate complex business processes that span multiple services, understand business timing and dependencies, and create intelligent workflow orchestration.

**Cross-Service Intelligence:**
- Multi-service workflow pattern recognition
- Business process timing and dependency mapping
- Intelligent workflow orchestration and error handling
- Cross-platform integration workflow automation
- Business rule extraction and enforcement

## DELIVERABLES
1. `src/workflows/WorkflowDetector.ts` - Cross-service workflow discovery
2. `src/workflows/BusinessProcessMapper.ts` - Business logic flow mapping
3. `src/workflows/CrossServiceOrchestrator.ts` - Multi-service workflow execution
4. `src/workflows/WorkflowTemplateGenerator.ts` - Reusable workflow templates
5. `src/workflows/BusinessRuleEngine.ts` - Workflow business rule enforcement

## IMPLEMENTATION REQUIREMENTS

### 1. Cross-Service Workflow Detection
```typescript
interface WorkflowDetector {
  analyzeMultiServicePatterns(
    services: GeneratedPlugin[],
    usageData: CrossServiceUsage[]
  ): Promise<BusinessWorkflow[]>;
  
  mapBusinessProcesses(
    workflows: BusinessWorkflow[],
    businessContext: BusinessContext
  ): Promise<BusinessProcess[]>;
  
  detectIntegrationOpportunities(
    services: ServiceIntegration[]
  ): Promise<IntegrationWorkflow[]>;
}

interface BusinessProcess {
  name: string;
  description: string;
  services: string[];
  steps: ProcessStep[];
  businessRules: BusinessRule[];
  successCriteria: SuccessCriteria[];
  rollbackStrategy: RollbackStrategy;
}
```

### 2. Intelligent Workflow Orchestration
```typescript
interface CrossServiceOrchestrator {
  executeWorkflow(
    workflow: BusinessProcess,
    parameters: WorkflowParameters
  ): Promise<WorkflowResult>;
  
  handleFailures(
    failedStep: ProcessStep,
    context: WorkflowContext
  ): Promise<RecoveryAction>;
  
  optimizeExecution(
    workflow: BusinessProcess
  ): Promise<OptimizedWorkflow>;
}

// Example: "Customer Churn Prevention" workflow
// 1. Detect at-risk customer (analytics service)
// 2. Create personalized offer (pricing service)
// 3. Send targeted email (marketing service)
// 4. Schedule follow-up call (CRM service)
// 5. Track engagement (analytics service)
```

### 3. Business Rule Engine
```typescript
interface BusinessRuleEngine {
  extractRules(
    businessDocumentation: string[],
    workflowHistory: WorkflowExecution[]
  ): Promise<BusinessRule[]>;
  
  validateWorkflow(
    workflow: BusinessProcess,
    rules: BusinessRule[]
  ): Promise<ValidationResult>;
  
  enforceCompliance(
    execution: WorkflowExecution,
    complianceRules: ComplianceRule[]
  ): Promise<ComplianceResult>;
}
```

### 4. Workflow Template Generation
```typescript
interface WorkflowTemplateGenerator {
  generateTemplate(
    workflow: BusinessProcess,
    industry: string
  ): Promise<WorkflowTemplate>;
  
  customizeForDomain(
    template: WorkflowTemplate,
    domainContext: DomainContext
  ): Promise<CustomizedWorkflow>;
  
  createReusablePatterns(
    workflows: BusinessProcess[]
  ): Promise<WorkflowPattern[]>;
}
```

## DETECTED WORKFLOW EXAMPLES

### Example 1: E-commerce Order Fulfillment
```typescript
// Detected workflow across multiple services:
const orderFulfillmentWorkflow = {
  name: "Complete Order Fulfillment",
  services: ["shopify", "stripe", "shipstation", "slack", "hubspot"],
  steps: [
    { service: "shopify", action: "order:validate", timing: "immediate" },
    { service: "stripe", action: "payment:authorize", timing: "immediate" },
    { service: "shipstation", action: "shipment:create", timing: "after_payment" },
    { service: "slack", action: "notify:fulfillment-team", timing: "after_shipping" },
    { service: "hubspot", action: "deal:update-stage", timing: "after_delivery" }
  ],
  businessRules: [
    "High-value orders require manual approval",
    "International orders need customs documentation",
    "Subscription orders follow different fulfillment rules"
  ]
};

// Generated command:
// commerce order:fulfill --order-id 12345 --auto-approve-under 500 --notify-team fulfillment
```

### Example 2: SaaS Customer Onboarding
```typescript
const customerOnboardingWorkflow = {
  name: "Complete Customer Onboarding",
  services: ["stripe", "intercom", "notion", "slack", "mixpanel"],
  steps: [
    { service: "stripe", action: "customer:create-with-trial" },
    { service: "intercom", action: "user:create-and-tag" },
    { service: "notion", action: "customer-page:create" },
    { service: "slack", action: "notify:success-team" },
    { service: "mixpanel", action: "track:onboarding-complete" }
  ],
  timing: {
    trial_reminder: "day_7_before_expiry",
    success_check: "day_3_after_signup",
    upsell_opportunity: "day_14_if_active"
  }
};

// Generated command:
// saas customer:onboard --email user@company.com --plan pro-trial --assign-to sarah --auto-followup
```

### Example 3: Content Marketing Workflow
```typescript
const contentMarketingWorkflow = {
  name: "Content Creation and Distribution",
  services: ["notion", "canva", "twitter", "linkedin", "mailchimp"],
  steps: [
    { service: "notion", action: "content:plan-and-write" },
    { service: "canva", action: "graphics:create-social-variants" },
    { service: "twitter", action: "post:schedule-thread" },
    { service: "linkedin", action: "post:schedule-professional" },
    { service: "mailchimp", action: "newsletter:add-to-next-edition" }
  ],
  optimization: "schedule_for_peak_engagement_times"
};

// Generated command:
// marketing content:publish --topic "API Integration Best Practices" --channels all --optimize-timing
```

## SUCCESS CRITERIA
- Detects complex multi-service business workflows automatically
- Generates intelligent workflow orchestration commands
- Handles cross-service dependencies and error scenarios
- Creates reusable workflow templates for common business processes
- Enforces business rules and compliance requirements
- Optimizes workflow execution based on performance data
- Enables business users to automate complex processes with simple commands
```

---

## 🎯 **PHASE 3: SERVICE INTEGRATION**

### **PROMPT 22: STRIPE CONNECTOR**

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

### **PROMPT 23: REAL-TIME PROGRESS TRACKING**

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

### **PROMPT 24: LLM INTROSPECTION APIS**

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

### **PROMPT 25: CROSS-SERVICE WORKFLOWS**

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

## 🚀 **FUTURE PHASES** *(Post-Foundation)*

### **PHASE 4: INTERFACE LAYER** *(Separate Project)*
**Purpose:** User-friendly interface above generated CLIs
- **imajin-ui**: Web/Desktop application for CLI interaction
- Form-based interfaces that generate and execute CLI commands
- Visual workflow builders for complex multi-service operations
- Dashboard for monitoring and managing all services
- Template marketplace for common business workflows
- Real-time progress visualization for operations

### **PHASE 5: NETWORK COMMUNICATION LAYER** *(Separate Project)*
**Purpose:** Inter-node communication and networking
- **imajin-network**: Webhook receiving and processing infrastructure
- Graph discovery and node networking protocols
- Real-time communication between user nodes
- Social graph management and relationship tracking
- Distributed event coordination across user networks
- P2P communication protocols for direct node interaction

### **PHASE 6: SOCIAL DISCOVERY ECOSYSTEM** *(Separate Project)*
**Purpose:** Community and marketplace features
- **imajin-social**: User graph discovery and compatibility matching
- Reputation and trust systems for node networks
- API marketplace for user-generated services and data
- Community templates and workflow sharing
- Decentralized social commerce features
- Cross-node workflow orchestration and collaboration

**Note:** These future phases will be **separate complementary projects** that use imajin-cli as their foundation, maintaining our focus on excellent CLI generation with universal transformation capabilities.

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