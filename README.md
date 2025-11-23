# imajin-cli: AI-Safe Universal Command Layer

**The missing infrastructure layer between AI agents and distributed systems**

[![License: .fair](https://img.shields.io/badge/License-.fair-blue.svg)](docs/.fair-license.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Status: Phase 2 Active](https://img.shields.io/badge/Status-Phase%202%20Active%20(85%25)-brightgreen.svg)](#current-implementation-status)

---

## The Problem

**AI agents can't reliably control distributed systems:**

```bash
# AI agent tries to share content across device network:
❌ Step 1: Share album          # AI executes
❌ Step 2: Transcode patterns   # AI forgets
❌ Step 3: Sync to peers        # AI forgets
❌ Step 4: Notify subscribers   # AI forgets
❌ Step 5: Update cache         # AI forgets
❌ Step 6: Log for audit        # AI forgets

Result: Inconsistent state, silent failures, broken distributed systems
```

**Why AI fails:**
- Forgets multi-step workflows (high probability)
- Can't handle network failures gracefully
- Doesn't retry operations properly
- Leaves systems in partial/inconsistent state

---

## The Solution: AI-Safe Command Layer

**imajin-cli generates CLIs with guardrails built-in:**

```bash
# AI agent runs ONE command:
✅ device-cli content share --album sunset-patterns

# Infrastructure handles EVERYTHING automatically:
→ Event: content.shared emitted
  → ContentGroomer subscribes    → transcodes patterns automatically
  → PeerSyncService subscribes   → syncs with DLQ for offline devices
  → NotificationService subscribes → alerts subscribers automatically
  → CacheManager subscribes      → updates cache automatically
  → AuditLogger subscribes       → logs action automatically

Result: Consistent state guaranteed. AI can't forget steps.
```

**How It Works:**
1. AI declares intent: "share this album"
2. CLI emits event with complete context
3. Subscribers react automatically (AI never needs to call them)
4. Network failures → Dead Letter Queue (no data loss)
5. Retries happen automatically (exponential backoff)
6. System state stays consistent

---

## Core Architecture: Universal Adapter Pattern

**imajin-cli is the command layer. Everything attaches to it:**

```
┌─────────────────────────────────────────────┐
│         AI Agents (ChatGPT, Claude)         │
└──────────────────┬──────────────────────────┘
                   │ Natural language
                   ↓
┌─────────────────────────────────────────────┐
│              Web Interface                   │
│         (imajin-ai/web Next.js app)         │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
                   ↓
┌─────────────────────────────────────────────┐
│           imajin-cli (THIS)                  │
│   Universal AI-Safe Command Layer            │
│                                              │
│  • Event-driven (declarative operations)    │
│  • Dead Letter Queue (fault tolerance)      │
│  • Middleware pipeline (auto validation)    │
│  • Job queues (async operations)            │
│  • Structured errors (AI-readable)          │
└────┬──────────┬──────────┬──────────┬───────┘
     │          │          │          │
     ↓          ↓          ↓          ↓
  Stripe   Cloudinary  Database   Hardware
  (CLI)      (CLI)      (CLI)     Devices
                                  (imajin-os
                                   LED units)
```

**Key Insight:** The CLI isn't just "developer tooling" – it's the **universal command bus** that:
- AI agents send commands through (safely)
- Web interfaces send requests through (consistently)
- Hardware devices send events through (reliably)
- Services coordinate operations through (automatically)

**You can attach practically anything to it.**

---

## Why This Matters: Real Use Case

**Scenario:** User buys LED device from website, device ships, arrives, gets set up

**Traditional Approach (Fragile):**
```typescript
// Web backend handles order
await stripe.charge(payment);
await db.orders.create(order);
await email.send(confirmation);
await inventory.decrement(sku);
await shipping.createLabel(address);
// ... 12 more steps that might fail at any point
// If ANY step fails → partial state, data inconsistency
```

**imajin-cli Approach (Robust):**
```typescript
// Web sends ONE command through CLI:
await cli.execute('order create', orderData);

// CLI emits: order.created
//   → PaymentService handles Stripe automatically
//   → DatabaseService persists automatically
//   → EmailService sends confirmation automatically
//   → InventoryService decrements automatically
//   → ShippingService creates label automatically
//   → DeviceProvisionService queues NFT mint automatically
//   → All retries/failures handled via DLQ

// If network fails → DLQ queues retry
// If service is down → Retry with backoff
// State is ALWAYS consistent
```

---

## Key Features

### Core Capabilities

**AI-Safe by Design**
- **Declarative Commands** - AI states intent, infrastructure executes
- **Automatic Side Effects** - All operations trigger via events, not manual calls
- **Fault Tolerance** - Dead Letter Queue ensures no data loss on network failures
- **Consistent State** - Transactions succeed completely or roll back cleanly
- **Structured Errors** - Machine-readable codes with recovery suggestions

**Universal Adapter Pattern**
- **Generate from any API** - OpenAPI, GraphQL, or custom specs
- **Attach to anything** - Web, devices, databases, external services
- **No vendor lock-in** - Self-contained executables, no runtime dependencies
- **No subscriptions** - Generate once, use forever
- **Cross-service orchestration** - Coordinate operations across multiple APIs

**Enterprise Infrastructure Built-In**
- **Event System** - Middleware pipeline, subscribers, priority queues
- **Job Queues** - Background processing with progress tracking
- **Credential Management** - Secure cross-platform storage (Keychain/Windows)
- **Rate Limiting** - Intelligent API throttling with multiple strategies
- **Monitoring** - Health checks, metrics, audit trails
- **Error Recovery** - Automatic retry with exponential backoff
- **MCP Integration** - Expose all CLI commands to Claude Desktop via Model Context Protocol

---

## The imajin Ecosystem

**imajin-cli is part of a sovereign technology stack:**

1. **imajin-os** - Volumetric LED hardware (512+ LEDs per device, ESP32-controlled)
2. **imajin-ai/web** - E-commerce platform (Next.js, Stripe, device sales)
3. **mjn** - Solana token protocol (identity, settlement, escrow)
4. **.fair** - Attribution standard (contributor tracking, automated royalties)
5. **imajin-cli** - Universal command layer (THIS - the glue layer)

**Why CLI is central:**
- Web interface → sends commands through CLI
- Hardware devices → send events through CLI
- AI agents → send instructions through CLI
- Services → coordinate operations through CLI

**Everything goes through the AI-safe command layer.**

**Philosophy:**
- ❌ No subscriptions (you own it forever)
- ❌ No cloud dependency (self-hosted, privacy-first)
- ❌ No vendor lock-in (open source, standard protocols)
- ❌ No surveillance (your data stays yours)

**See:** [imajin-os ecosystem docs](../imajin-os/docs/governance/ECOSYSTEM.md) for full context

---

## 🏗️ **Current Implementation Status**

### **✅ Phase 1: Foundation Architecture** *(COMPLETE)*

**All core patterns implemented and tested:**

- ✅ **Service Provider System** - Modular architecture with 15+ concrete providers
- ✅ **Command Pattern Framework** - Type-safe CLI command system
- ✅ **Universal Elements & Type System** - Cross-service compatibility layer
- ✅ **Credential Management** - Secure storage (Keychain/Windows Credential Manager)
- ✅ **Plugin Generator Engine** - Basic CLI generation from OpenAPI specs
- ✅ **Event-Driven Architecture** - Real-time coordination and progress tracking

### **🔄 Phase 2: Infrastructure Components** *(85% COMPLETE)*

**Enterprise patterns implemented:**

- ✅ **ETL Pipeline with Graph Translation** - Universal data transformation
- ✅ **Exception System** - Comprehensive error handling with recovery
- ✅ **Rate Limiting & API Management** - Intelligent throttling and quota management
- ✅ **Media Processing System** - Multi-provider file handling with transformations
- ✅ **Webhooks & HTTP Infrastructure** - Real-time API integration
- ✅ **Service Layer** - Business logic abstraction
- ✅ **Repository Pattern** - Data access abstraction
- ✅ **Background Job Processing** - Long-running operations with progress
- ✅ **Monitoring & Diagnostics** - Health checks and performance metrics
- ✅ **Comprehensive Logging** - Structured audit trails
- ✅ **Stripe Connector** - Reference implementation with domain commands
- ✅ **External Schema System** - OpenAPI/GraphQL specification handling
- ✅ **Business Context Schema System** - Business-context-driven command generation
- ✅ **Business Context Cleanup** - Optimization and refinement
- 🔄 **Business Context Recipe System** - Currently implementing
- ⏳ **Multi-API Service Hardening** - Connect 5-6 APIs for practical testing
- ⏳ **Local Model Samples** - Build sample local model integrations

### **⏳ Phase 3: AI-Enhanced Generation** *(PLANNED)*

**Smart CLI generation with AI:**

- ⏳ **AI Context Analysis** - Business domain understanding
- ⏳ **Intelligent Command Generator** - Workflow-aware CLI creation
- ⏳ **Adaptive CLI Optimizer** - Learning-based improvements
- ⏳ **Business Workflow Detector** - Cross-service automation discovery
- ⏳ **Real-time Progress Tracking** - Live operation feedback
- ⏳ **LLM Introspection APIs** - AI capability discovery
- ⏳ **Cross-service Workflows** - Multi-API orchestration
- ⏳ **Integration Testing** - Comprehensive validation

## 🎯 **Generated CLI Examples**

### **Professional Payment Processing** *(Current Stripe Implementation)*
```bash
# Domain-specific business commands
my-stripe-cli customer:create --name "Jane Doe" --email "jane@company.com" --json
my-stripe-cli subscription:start --customer cus_123 --plan pro-monthly --trial-days 14
my-stripe-cli payment:refund --charge ch_456 --amount 2500 --reason "duplicate" --notify

# Enterprise patterns built-in
my-stripe-cli events:listen --webhook-url https://myapp.com/webhooks --log-level debug
my-stripe-cli jobs:status --job-id job_123 --format table
my-stripe-cli health:check --service payment-processing --monitor
```

### **Content Management** *(Target Implementation)*
```bash
# Business workflows, not technical operations
my-notion-cli page:create --title "Project Plan" --database proj_db --assign-to team
my-notion-cli database:query --filter '{"Status": "In Progress"}' --format table --export csv
my-notion-cli workflow:automate --trigger "page-created" --action "notify-team"
```

### **Repository Operations** *(Target Implementation)*
```bash
# Developer workflows, not REST endpoints
my-github-cli issue:create --title "Bug Report" --body "Description" --labels bug,priority-high
my-github-cli pr:merge --number 42 --strategy squash --delete-branch --notify-team
my-github-cli release:create --tag v1.2.0 --notes "Latest improvements" --auto-deploy
```

## 💻 **Current Architecture**

### **Modular Service Provider System**
```typescript
// Foundation: Service Provider Infrastructure + Stripe Integration
export abstract class ServiceProvider {
  abstract register(): void | Promise<void>;
  abstract boot(): void | Promise<void>;
  abstract getName(): string;
  registerCommands?(program: Command): void;
}

// Live Examples:
- StripeServiceProvider     // Full Stripe integration
- CredentialServiceProvider // Secure credential management
- MediaServiceProvider      // Multi-provider media processing
- MonitoringServiceProvider // Health and diagnostics
- EventServiceProvider      // Real-time coordination
- ETLServiceProvider        // Graph translation pipeline
```

### **Universal Elements & Graph Translation**
```typescript
// Cross-service compatibility layer
interface UniversalElement {
  id: string;
  type: string;
  metadata: Record<string, any>;
  relationships: Relationship[];
}

// Business Model Factory (Implemented)
const businessMapping = {
  'stripe_customer': 'Customer',
  'notion_page': 'Document',
  'github_issue': 'Task'
};
```

### **Enterprise-Grade Patterns**
```typescript
// All patterns implemented and tested
interface CommandResult {
  success: boolean;
  data?: any;
  error?: StructuredError;
  metadata: {
    duration: number;
    timestamp: string;
    command: string;
    rateLimitStatus: RateLimitInfo;
  };
}
```

## 🚀 **Quick Start: Business Context Setup**

### **1. Installation**
```bash
# Install the CLI generator
npm install -g @imajin/cli

# Verify installation
imajin --version
```

### **2. Generate Your First Business CLI**
```bash
# Generate Stripe CLI with business context
imajin generate stripe \
  --spec https://api.stripe.com/openapi.json \
  --business-context "payment-processing" \
  --output-name "my-payments-cli"

# Result: Professional CLI with business commands
./my-payments-cli customer:create --help
./my-payments-cli subscription:manage --help
./my-payments-cli revenue:analyze --help
```

### **3. Configure Business Context**
```bash
# Set up business-specific configuration
my-payments-cli config:init --business-type "saas" --currency "usd"
my-payments-cli credentials:set --api-key "sk_test_..." --environment "development"
my-payments-cli webhooks:setup --endpoint "https://myapp.com/webhooks"
```

### **4. Execute Business Operations**
```bash
# Run business-focused commands
my-payments-cli customer:create --name "John Doe" --email "john@company.com"
my-payments-cli subscription:start --customer cus_123 --plan "pro-monthly"
my-payments-cli revenue:report --period "last-month" --format csv
```

## Cost Considerations

### Traditional Middleware Platforms
```
Zapier Professional:     $240/year
Postman Team:           $348/year
MuleSoft Anypoint:    $3,000+/year
Custom Middleware:    $5,000+/year
```

### Self-Hosted CLI Approach
```
imajin-cli:              Open source
Generated CLIs:          No recurring costs
Hosting:                 Local execution
Dependencies:            Direct API access only
```

## AI Integration

**CLI Execution Examples:**
```bash
# AI systems can execute generated CLIs directly
ai-agent execute my-stripe-cli customer:create --name "{{customer.name}}" --json
ai-agent execute my-notion-cli page:create --title "{{task.title}}" --database "{{project.db}}"
ai-agent execute my-github-cli issue:create --title "{{bug.title}}" --priority high
```

**Structured JSON Output:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "cus_123",
      "name": "John Doe",
      "email": "john@company.com"
    }
  },
  "metadata": {
    "duration": 450,
    "timestamp": "2025-06-17T12:00:00Z",
    "command": "customer:create",
    "rateLimitStatus": {
      "remaining": 99,
      "resetTime": "2025-06-17T12:01:00Z"
    }
  }
}
```

## Project Advantages

### Economic Model
- One-time generation, independent usage
- Self-contained executables
- Direct API access (subject to original service limits)
- User-owned generated code

### Technical Quality
- Enterprise patterns: Rate limiting, monitoring, logging
- Secure credential management
- Structured exception handling with recovery
- Domain-focused commands, not generic endpoints

### Development Model
- Open source
- Fair attribution for contributors
- Community-driven service integrations
- Transparent development process

### AI-Friendly Design
- JSON-structured output for parsing
- Introspection APIs for capability discovery
- Real-time progress tracking
- Machine-readable error responses

## 🛠️ **Development & Contributing**

### **Current Development Status**
- **Phase 1**: ✅ Complete (6/6 prompts)
- **Phase 2**: 🔄 Active (17/19 prompts complete)
- **Next**: Business Context Recipe System (17.5)

### **Contributing Guidelines**
See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:
- Fair attribution model
- Service provider templates
- Development workflow
- Community standards

### **Technical Architecture**
See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for:
- Service provider system
- Universal elements mapping
- Enterprise pattern integration
- AI coordination layer

## 📚 **Documentation**

### **Architecture Documentation** ⭐ **Start Here**

- **[docs/architecture/AI_SAFE_INFRASTRUCTURE.md](docs/architecture/AI_SAFE_INFRASTRUCTURE.md)** - **Essential**
  - Why EventManager is complex (distributed systems + AI-safety)
  - How declarative commands prevent AI failures
  - Dead Letter Queue, middleware, event subscribers
  - Real use cases: content sharing, firmware updates, device coordination
- **[docs/architecture/README.md](docs/architecture/README.md)** - Architecture navigation
- **[CLAUDE.md](CLAUDE.md)** - Development guide with ecosystem context

### **Implementation Guides**

- **[Getting Started](docs/GETTING_STARTED.md)** - Business context setup guide
- **[Architecture](docs/ARCHITECTURE.md)** - Technical foundation
- **[Service Integration](docs/SERVICE_INTEGRATION.md)** - Adding new services
- **[Business Context](docs/BUSINESS_CONTEXT.md)** - Business-driven CLI generation
- **[Contributing](docs/CONTRIBUTING.md)** - Community guidelines
- **[Competitive Analysis](docs/COMPETITIVE_ANALYSIS.md)** - Market positioning

## Success Metrics

**User Experience:**
- Generate professional CLI in <15 minutes
- Business context → working CLI workflow
- Enterprise patterns work out-of-the-box
- AI integration requires minimal configuration

**Technical Achievement:**
- 85% of foundation architecture complete
- Complete service provider infrastructure (9 providers)
- Stripe reference implementation with business context
- Universal elements cross-service compatibility
- Real-time AI coordination capabilities

---

## Getting Started

**Install and generate your first CLI:**

```bash
npm install -g @imajin/cli
imajin generate your-service --business-context your-domain
```

---

*Built by the open source community.*
*Licensed under [.fair](docs/.fair-license.md) - Fair attribution for all contributors.* 