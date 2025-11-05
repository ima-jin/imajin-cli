# Project Context: imajin-cli

## Overview

**An open-source CLI generation system for API integration.**

Generate professional CLI tools from API specifications with enterprise-grade patterns, universal graph translation, and LLM integration support.

**Problem Statement:**

```bash
# Challenge: Middleware platforms require ongoing subscriptions
$99/month for API platform subscription
Platform-dependent access and pricing
Additional middleware layers increase complexity
Generic wrappers lack business context

# Solution: Self-contained CLI generation
imajin generate stripe --spec openapi.json
# Result: Enterprise-grade CLI tools with no runtime dependencies
```

## Core Objectives

### What We're Building:

- ✅ **Open-source CLI generation engine** with no runtime dependencies
- ✅ **Enterprise patterns** (rate limiting, monitoring, error handling)
- ✅ **Universal graph translation** for cross-service compatibility
- ✅ **Direct LLM integration** support without middleware layers
- ✅ **Business-context-aware** command generation

## Technical Architecture

### **1. Universal Elements Foundation**

**Core concept:** Business entities across services can be mapped to universal elements.

```typescript
// Universal business objects that ALL services map to
Customer, Payment, Event, Product, Service, Order, Invoice;
Contact, Organization, Location, Media, Document, Transaction;
```

**Benefits:**

- **Cross-service compatibility** - Stripe customers map to Salesforce contacts
- **Type safety everywhere** - Compile-time validation across all integrations
- **LLM understanding** - AI can work with consistent business concepts
- **Community standards** - Shared schemas that evolve together

### **2. Graph Translation Engine**

**Design approach:** Standard graph models enable cross-service compatibility.

```typescript
// Standard graph models for different use cases
SocialCommerceGraph; // Products, events, connections, transactions
CreativePortfolioGraph; // Artworks, exhibitions, commissions, availability
ProfessionalNetwork; // Experience, skills, connections, recommendations
CommunityHubGraph; // Groups, discussions, events, resources
```

**Communication Matrix:**

- **Same model = Direct communication** (no ETL needed)
- **Different models = Intelligent translation** (optimized ETL bridges)
- **Custom models = Context normalization** (translate to user's chosen context)

### **3. Enterprise-Grade CLI Generation**

**Key feature:** Generated CLIs include enterprise patterns built-in.

```bash
# Generated CLIs include enterprise capabilities
stripe customer:create --name "Jane" --email "jane@co.com" --json
# ✅ Secure credential management (Keychain/Windows Credential Manager)
# ✅ Rate limiting and circuit breakers
# ✅ Structured error handling with recovery strategies
# ✅ Real-time progress tracking via events
# ✅ Background job processing for long operations
# ✅ Comprehensive audit logging
# ✅ Health monitoring and diagnostics
```

### **4. LLM Integration Support**

**Integration model:** Direct CLI execution for AI agents.

```bash
# AI agents execute CLIs directly - simple and reliable
my-stripe-cli customer:create --name "John" --json
my-notion-cli page:create --title "New Customer: John" --json
my-github-cli issue:create --title "Follow up with John" --json

# No MCP servers, no subscription fees, no hosting complexity
# Just reliable CLI tools with JSON-native output
```

## 🔧 **Three-Tier Technical Architecture**

### **Tier 1: Service Ecosystem**

Traditional API service integration:

```
External APIs (Stripe, GitHub, Notion) → Service Adapters → Universal Elements
```

### **Tier 2: Graph Translation Layer**

User-to-user communication and networking:

```
User Graph A → Graph Translator → User Graph B (same/different models)
```

### **Tier 3: Universal Elements Core**

Foundational business concepts everything maps to:

```
Universal Customer, Payment, Event, Product → Type-safe operations everywhere
```

## 📋 **Implementation Strategy: Focused Excellence**

### **Phase 1: Foundation Architecture** _(Current - 21 Prompts)_

**Status:** Service Provider System in active development

**Core Systems:**

1. ✅ **Service Provider System** _(Current)_ - Modular architecture foundation
2. ✅ **Command Pattern Framework** - Type-safe CLI command system
3. ✅ **Universal Elements & Type System** - Cross-service compatibility layer
4. ✅ **Credential Management** - Secure cross-platform credential storage
5. ✅ **Plugin Generator Engine** - Basic CLI generation from OpenAPI specs
6. ✅ **Event-Driven System** - Real-time coordination and progress tracking
7. ✅ **ETL Pipeline with Graph Translation** - Universal data transformation
8. ✅ **Exception System** - Enterprise-grade error handling
9. ✅ **Rate Limiting & API Management** - Professional API interaction
10. ✅ **Media Processing** - Image/video handling across services
11. ⏳ **Webhooks & HTTP Layer** - Real-time API communication
12. ⏳ **Service Layer** - Business logic encapsulation
13. ⏳ **Repository Pattern** - Data access abstraction
14. ⏳ **Background Job Processing** - Long-running operation management
15. ⏳ **Monitoring & Diagnostics** - System health and performance
16. ⏳ **Comprehensive Logging** - Structured audit trails
17. ⏳ **Stripe Connector** - Reference implementation
18. ⏳ **Real-time Progress Tracking** - Live operation monitoring
19. ⏳ **LLM Introspection APIs** - AI capability discovery
20. ⏳ **Cross-service Workflows** - Multi-service operation orchestration

### **Phase 2: Generation Engine** _(Q2 2025)_

OpenAPI/GraphQL → Professional TypeScript CLI generation:

- Parse API specifications with business context understanding
- Generate domain-specific commands (not generic CRUD operations)
- Integrate enterprise patterns into generated code
- Create universal element mappings automatically
- Build graph model adapters for user communication

### **Phase 3: Service Ecosystem** _(Q3 2025)_

Reference implementations and community templates:

- Stripe payment processing (financial workflows)
- Notion workspace management (content and project workflows)
- GitHub repository operations (development workflows)
- Shopify store management (e-commerce workflows)
- Template system for community-contributed services

### **Future: Complementary Ecosystem** _(Separate Projects)_

- **Phase 4: imajin-ui** - Web/Desktop interface above CLIs
- **Phase 5: imajin-network** - Inter-node communication layer
- **Phase 6: imajin-social** - Community and marketplace features

## Architecture Benefits

### Economic Model

- One-time generation, independent usage
- Tools work independently of hosting platforms
- Open-source development model
- Fair attribution for contributors

### Technical Quality

- Enterprise-grade patterns throughout
- Type safety prevents integration errors at compile time
- Real-time capabilities: progress tracking and event coordination
- Comprehensive monitoring: health, performance, and operational insights

### AI Integration

- Direct CLI execution without middleware dependencies
- JSON-native output for agent consumption
- Self-documenting through introspection APIs
- Real-time coordination for orchestration

### Cross-Service Compatibility

- Seamless multi-API integration
- Graph translation for data transformation
- Community-driven compatibility standards
- Extensible universal element system

### Developer Experience

- TypeScript-based with familiar tooling
- Modern DevEx: hot reload, auto-completion, type checking
- Business-focused command language
- Customizable and extensible generated tools

## Project Vision

**Goal:** Build accessible infrastructure for professional API integration.

**Current Landscape:**

- Professional API tools typically require subscriptions ($99-999/month)
- Enterprise-grade patterns often unavailable to smaller teams
- Platform-dependent access models
- Additional middleware layers

**Our Approach:**

- Open-source tool generation for any API
- Enterprise-grade patterns accessible to all team sizes
- User-owned integration tools with minimal dependencies
- Direct integration without additional middleware

## 📊 **Current Development Status**

**📍 Active Focus:** Rate Limiting & API Management (Prompt 9 of 21)  
**⏱️ Timeline:** Infrastructure components completion Q1 2025  
**🎯 Milestone:** Professional CLI generation with universal graph translation  
**📈 Progress:** 43% complete (9/21 prompts - strong foundation with graph translation capabilities)

**Recently Completed:**

1. ✅ Service Provider System - Modular architecture foundation
2. ✅ Command Pattern Framework - Type-safe CLI command system
3. ✅ Universal Elements & Type System - Cross-service compatibility
4. ✅ Credential Management - Secure cross-platform storage
5. ✅ Plugin Generator Engine - Basic CLI generation from OpenAPI
6. ✅ Event-Driven System - Real-time coordination and progress tracking
7. ✅ ETL Pipeline with Graph Translation - Universal data transformation
8. ✅ Exception System - Enterprise-grade error handling

**Immediate Next Steps:**

1. ✅ Complete Rate Limiting & API Management implementation
2. ✅ Build Media Processing System
3. Implement Webhooks & HTTP Layer
4. Add Service Layer and Repository Pattern
5. Create Monitoring & Diagnostics capabilities

## Success Criteria

**Technical Excellence:**

- Generate working TypeScript CLIs from any OpenAPI specification
- Universal elements enable seamless cross-service workflows
- Graph translation enables efficient data transformation
- Enterprise patterns work reliably under production load

**Developer Experience:**

- Generated CLIs feel native and professionally crafted
- Business domain commands (not just technical API operations)
- Comprehensive auto-completion and helpful error messages
- Easy customization and extension capabilities

**Accessibility:**

- Open source with no runtime dependencies
- Professional quality accessible to teams of all sizes
- Community-driven development with transparent attribution
- Sustainable development through .fair protocol

**AI Integration:**

- Structured JSON APIs for LLM orchestration
- Real-time progress tracking for coordination
- Self-documenting capabilities through introspection
- Machine-readable error handling

---

**Mission:** Build accessible professional API integration tools
**Architecture:** Universal Elements + Graph Translation + Enterprise CLIs
**Status:** Foundation in Active Development
**Vision:** Professional API tooling for all team sizes
