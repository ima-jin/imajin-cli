# Project Context: imajin-cli

## Core Mission

**Build a TypeScript CLI framework that generates domain-specific service integrations from OpenAPI/GraphQL specifications.**

Instead of generic API clients, generate CLIs that speak your business language:
- `blog:create` instead of `POST /api/v1/entries`
- `customer:update` instead of generic CRUD operations  
- Type-safe commands with your actual field names and relationships

**The Problem We're Solving:**
```bash
# Today: Manual API hell
curl -X POST https://api.notion.com/v1/pages -H "Authorization: Bearer secret_xyz" -H "Content-Type: application/json" -d '{"parent":{"database_id":"abc"},"properties":{...}}'

# Tomorrow: AI-friendly domain CLIs
my-notion-cli create-project --title "Q1 Goals" --assign-to "team-leads" --due "2024-03-31"
```

## Technical Architecture

### 1. TypeScript CLI Generation Engine
Core innovation: Generate TypeScript CLIs that understand YOUR business domain, not just the platform's API.

```bash
imajin generate stripe --spec https://api.stripe.com/openapi.json
# Generates: @my-org/stripe-cli with domain commands
# Commands: customer:create, subscription:cancel, payment:process
# Not: generic POST/GET/PUT operations
```

**Benefits:**
- **Type-safe commands** map to business concepts
- **JSON-native** for perfect LLM communication
- **Real-time feedback** with EventEmitter patterns
- **Context-aware validation** with Zod schemas
- **Auto-completion** knows your field names
- **Enterprise patterns** built into generated code

### 2. Service Provider Architecture
Modular, injectable service architecture built on TSyringe:

```typescript
// Each generated service gets its own provider
class StripeServiceProvider implements ServiceProvider {
  register(container: DependencyContainer) {
    container.register<StripeService>(TOKENS.StripeService, StripeService);
    container.register<StripeCredentials>(TOKENS.StripeCredentials, StripeCredentials);
  }
}
```

### 3. Enterprise Patterns Integration
Generated CLIs include enterprise-grade capabilities:
- **Rate limiting** and circuit breakers
- **Credential management** (Keychain/Windows Credential Manager)
- **Exception handling** with recovery strategies  
- **Event-driven architecture** for real-time operations
- **ETL pipelines** for data synchronization
- **Webhook processing** for real-time updates
- **Background job processing** for long-running operations

### 4. LLM-Friendly Design
Everything designed for AI orchestration:
- **JSON output modes** for all commands
- **Introspection APIs** for command discovery
- **Real-time progress tracking** via WebSocket
- **Structured error messages** with recovery suggestions
- **Schema export** for LLM understanding

## Implementation Strategy

### Phase 1: Foundation (Current - 18 Prompts)
Building the core TypeScript architecture:
1. Service Provider System
2. Command Pattern Framework  
3. Credential Management
4. Plugin Generator (Basic)
5. Event-Driven System
6. Exception System & Error Handling
7. Rate Limiting & API Management
8. Media Processing System
9. Webhooks & HTTP Layer
10. ETL Pipeline System
11. Service Layer
12. Repository Pattern
13. Background Job Processing
14. Monitoring & Diagnostics
15. Comprehensive Logging System
16. Stripe Connector (Reference Implementation)
17. Real-time Progress Tracking
18. LLM Introspection APIs

### Phase 2: Generation Engine
OpenAPI/GraphQL → TypeScript CLI generation:
- Parse API specifications
- Extract domain models and operations
- Generate type-safe command classes
- Create service provider integrations
- Build credential management
- Add enterprise patterns

### Phase 3: Service Ecosystem
Reference implementations and templates:
- Stripe payment processing
- Notion workspace management
- GitHub repository operations
- Shopify store management
- Template system for new services

## Technical Principles

1. **Type Safety First** - Compile-time validation prevents runtime errors
2. **Enterprise Patterns** - Rate limiting, error handling, monitoring built-in
3. **Domain-Centric** - Business language, not API endpoints
4. **LLM-Native** - JSON APIs, introspection, real-time communication
5. **Modular Architecture** - Service providers enable clean composition
6. **Developer Experience** - Auto-completion, helpful error messages, documentation
7. **Security by Design** - Credential management, input validation, audit logging
8. **Real-time Capable** - WebSocket support, event streaming, progress tracking

## Current Development Status

**Active:** Service Provider System (Prompt 1 of 18)  
**Framework:** TypeScript with TSyringe DI, Commander.js, Zod validation  
**Target:** Professional CLI generation engine with enterprise capabilities  

## Success Criteria

- **Technical:** Generate working TypeScript CLIs from OpenAPI specs
- **Developer Experience:** Generated CLIs feel native and professional
- **Enterprise Ready:** Built-in patterns for security, monitoring, reliability
- **LLM Integration:** Perfect JSON APIs for AI orchestration
- **Extensible:** Template system for new service types

## Why TypeScript Architecture

### Developer Ecosystem Benefits
- **Largest programming community** (62.3% Stack Overflow usage)
- **Rich tooling ecosystem** (VS Code, TypeScript compiler, npm)
- **Modern development practices** (hot reload, type checking, auto-completion)
- **Enterprise adoption** (most Fortune 500 companies use Node.js/TypeScript)

### Technical Advantages
- **JSON-native** perfect for LLM communication
- **Type safety** prevents API integration errors
- **Async/await** natural for API coordination
- **Event-driven** architecture built into runtime
- **Package ecosystem** ready for distribution
- **Cross-platform** runs everywhere Node.js does

### AI Integration Benefits
- **JSON first** - all data structures native to LLM processing
- **Introspection** - runtime type information for AI discovery
- **Real-time** - WebSocket/EventEmitter for live coordination
- **Schema export** - TypeScript types → JSON Schema for LLM understanding
- **Error handling** - structured errors with recovery suggestions

This architecture positions imajin-cli as the **professional foundation for LLM-orchestrated service integrations** while maintaining enterprise-grade reliability and developer experience.

## Next Steps

1. **Complete Phase 1** - Execute all 18 implementation prompts
2. **Build Generation Engine** - OpenAPI → TypeScript CLI generator
3. **Create Reference Services** - Stripe, Notion, GitHub connectors
4. **LLM Integration Testing** - Validate AI orchestration patterns
5. **Community Templates** - Extensible service generation system

The goal is a **production-ready TypeScript CLI generation framework** that makes any API service LLM-orchestrable while maintaining enterprise standards for security, reliability, and developer experience.

