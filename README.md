# 🌟 imajin-cli

**Free, Open Source TypeScript CLI Generator That Democratizes Professional API Integration**

[![License: .fair](https://img.shields.io/badge/License-.fair-blue.svg)](docs/.fair-license.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Status: Service Provider Development](https://img.shields.io/badge/Status-Service%20Provider%20Development-green.svg)](#development-status)

---

## 🎯 **The Democratic Revolution**

**Break free from expensive middleware layers and vendor lock-in.**  
**Generate professional-grade CLI tools that you own forever.**

While others build subscription-based API middleware that costs money every month, we generate **professional CLI tools that belong to you** - no ongoing costs, no vendor dependencies, no limits.

## 🆚 **The Alternative to Expensive Middleware**

**❌ Traditional Approach:**
- Pay monthly for MCP servers or API platforms
- Vendor lock-in with ongoing hosting costs
- Generic API wrappers that don't understand your business
- Middleware complexity that adds failure points

**✅ Our Democratic Approach:**
```bash
# Generate once, own forever
imajin generate stripe --spec openapi.json
imajin generate notion --spec graphql.schema  
imajin generate github --spec api-docs.json

# Result: Professional tools with NO ongoing costs
# No subscriptions, no hosting, no vendor lock-in
```

## 🚀 **Vision: Democratize Platform Access**

Transform how developers interact with APIs by generating **domain-specific CLIs** that speak your business language, not generic endpoints.

**Instead of paying for middleware:**
```bash
# Expensive SaaS API platform monthly fee: $99/month
curl -X POST https://api-platform.com/proxy/stripe/customers \
  -H "X-API-Key: your-monthly-subscription"
```

**Generate professional tools for FREE:**
```bash
my-stripe-cli customer:create --name "John Doe" --email "john@example.com"
my-stripe-cli subscription:start --customer cus_123 --plan pro-monthly  
my-stripe-cli payment:refund --charge ch_456 --reason "duplicate"
```

## 🏆 **Why We're Different**

### **🆓 Completely Free**
- **No subscriptions** - Generate tools once, use forever
- **No hosting costs** - Tools are self-contained executables  
- **No vendor lock-in** - Generated code belongs to you
- **No API limits** - Only the original service's limits apply

### **🏢 Enterprise-Grade Quality**
Every generated CLI includes professional patterns that usually cost thousands:
- **Credential Management** - Secure cross-platform storage
- **Rate Limiting** - Intelligent API throttling
- **Error Handling** - Structured exceptions with recovery
- **Real-time Events** - Progress tracking and coordination
- **Background Jobs** - Long-running operations
- **Comprehensive Logging** - Complete audit trails
- **Health Monitoring** - Service diagnostics

### **🤖 Perfect LLM Integration**
- **JSON-native output** - AI agents can parse everything
- **Introspection APIs** - AI can discover capabilities
- **Real-time progress** - Live coordination with AI systems
- **Structured errors** - AI understands and responds to failures

### **🌍 Community-Driven**
- **Open source foundation** - No corporate gatekeepers
- **Community templates** - Share service integrations
- **Transparent development** - Follow our progress in real-time
- **Fair attribution** - Contributors get proper credit

## 🎯 **Core Purpose**

**For Solo Developers**: Get enterprise-grade tools without enterprise budgets  
**For Small Teams**: Professional service integration without recurring costs  
**For Large Organizations**: Generate custom tools that match your workflows  
**For AI Systems**: Perfect JSON interfaces for seamless orchestration  

## 🏗️ **Current Architecture Status**

### **✅ Phase 1: Foundation Architecture** *(In Active Development)*

**✅ COMPLETED:**
- ✅ **Project Structure** - Professional TypeScript setup with ESM modules
- ✅ **Application Bootstrap** - Core app with Commander.js and dependency injection
- ✅ **Basic CLI Framework** - Working executable with command registration
- ✅ **Documentation System** - Implementation prompts and progress tracking
- ✅ **Development Workflow** - Structured approach with 18 implementation prompts

**🔄 CURRENTLY IMPLEMENTING:**
- 🔄 **Service Provider System** - Modular service registration and lifecycle management
  - ✅ Base ServiceProvider interface designed
  - ✅ Container integration patterns established
  - 🔄 Provider registration and boot sequence
  - ⏳ Command registration from providers
  - ⏳ Dependency resolution and injection

**⏳ UPCOMING (17 Remaining Prompts):**
1. ⏳ **Command Pattern Framework** - Type-safe command architecture
2. ⏳ **Credential Management** - Secure cross-platform storage
3. ⏳ **Plugin Generator Engine** - Basic service generation
4. ⏳ **Event-Driven System** - Real-time coordination
5. ⏳ **Exception System** - Enterprise error handling
6. ⏳ **Rate Limiting & API Management** - Intelligent throttling
7. ⏳ **Media Processing** - File and content handling
8. ⏳ **Webhooks & HTTP Layer** - Real-time API integration
9. ⏳ **ETL Pipeline System** - Data synchronization
10. ⏳ **Service Layer** - Business logic abstraction
11. ⏳ **Repository Pattern** - Data access layer
12. ⏳ **Background Job Processing** - Long-running operations
13. ⏳ **Monitoring & Diagnostics** - Health and performance
14. ⏳ **Comprehensive Logging** - Structured audit trails
15. ⏳ **Stripe Connector** - Reference implementation
16. ⏳ **Real-time Progress Tracking** - Live operation feedback
17. ⏳ **LLM Introspection APIs** - AI capability discovery

### **📋 Phase 2: Generation Engine** *(Planned)*
- OpenAPI/GraphQL specification parsing
- TypeScript CLI code generation with domain context
- Enterprise pattern integration
- Template system for new services

### **🌐 Phase 3: Service Ecosystem** *(Planned)*
- Reference implementations (Stripe, Notion, GitHub, Shopify)
- Community contribution framework
- Service template marketplace

## 💻 **Technology Stack**

**Core Framework:**
- **TypeScript 5.0+** - Type safety and modern language features
- **Node.js 20+** - Latest runtime with native TypeScript support
- **TSyringe** - Dependency injection container
- **Commander.js** - CLI framework and argument parsing
- **Zod** - Runtime type validation and schema generation

**Enterprise Libraries:**
- **Winston/Pino** - Structured logging
- **Keytar** - Cross-platform credential storage
- **axios** - HTTP client with interceptors
- **EventEmitter** - Real-time event coordination
- **chalk** - Console styling and colors

## 🎯 **Generated CLI Examples**

### **Professional Payment Processing** *(Target Output)*
```bash
# Domain-specific commands, not API endpoints
stripe customer:create --name "Jane Doe" --email "jane@company.com" --json
stripe subscription:start --customer cus_123 --plan pro-monthly --trial-days 14
stripe payment:refund --charge ch_456 --amount 2500 --reason "duplicate" --notify
```

### **Content Management** *(Target Output)*
```bash
# Business language, not technical operations
notion page:create --title "Project Plan" --database proj_db --assign-to team
notion database:query --filter '{"Status": "In Progress"}' --format table --export csv
notion block:append --page page_123 --type "paragraph" --text "Updated status"
```

### **Repository Operations** *(Target Output)*
```bash
# Developer workflows, not REST endpoints
github issue:create --title "Bug Report" --body "Description" --labels bug,priority-high
github pr:merge --number 42 --strategy squash --delete-branch --notify-team
github release:create --tag v1.2.0 --notes "Latest improvements" --auto-deploy
```

## 🤖 **Perfect AI Integration** *(No Middleware Required)*

**Direct CLI Execution by AI:**
```bash
# AI agents can execute our CLIs directly - no middleware needed
my-stripe-cli customer:create --name "John" --email "john@co.com" --json
my-notion-cli page:create --title "New Customer: John" --json  
my-github-cli issue:create --title "Follow up with John" --assign-to sales --json
```

**Built-in AI Features:**
- **JSON output mode** - Perfect for AI parsing (`--json` flag)
- **Introspection APIs** - AI can discover commands and capabilities
- **Structured errors** - AI understands failures and recovery options
- **Real-time progress** - AI can monitor long-running operations
- **Schema export** - AI understands command structures and validation

## 🛠️ **Installation & Usage**

### **Current Development Usage**
```bash
# Clone and explore the foundation
git clone https://github.com/imajin/imajin-cli
cd imajin-cli
npm install

# Build and run current CLI
npm run build
node bin/imajin --help
node bin/imajin banner
node bin/imajin diagnose
```

### **Future Usage** *(Coming Q2 2025)*
```bash
# Install globally (when ready)
npm install -g @imajin/cli

# Generate your first professional CLI tool
imajin generate stripe --spec https://api.stripe.com/openapi.json
imajin generate notion --spec https://api.notion.com/openapi.json

# Use your generated tools
cd stripe-cli && npm install
./bin/stripe customer:create --help
```

## 📁 **Project Structure**

```
imajin-cli/
├── src/
│   ├── core/                     # Foundation patterns ✅
│   │   ├── Application.ts        # Main app bootstrap ✅
│   │   └── providers/            # Service provider system 🔄
│   ├── commands/                 # Command pattern (planned)
│   ├── services/                 # Service integrations (planned)
│   ├── credentials/              # Credential management (planned) 
│   ├── events/                   # Event-driven architecture (planned)
│   ├── exceptions/               # Error handling system (planned)
│   ├── http/                     # HTTP layer & webhooks (planned)
│   ├── media/                    # Media processing (planned)
│   ├── etl/                      # ETL pipeline system (planned)
│   ├── jobs/                     # Background processing (planned)
│   ├── diagnostics/              # Health monitoring (planned)
│   └── logging/                  # Structured logging (planned)
├── docs/                         # Implementation documentation ✅
│   ├── IMPLEMENTATION_PROMPTS.md # 18 detailed development tasks ✅
│   └── DEVELOPMENT_PROGRESS.md   # Real-time progress tracking ✅
├── ai/                           # Context for development ✅
│   ├── project-context.md        # Strategic vision ✅
│   └── dev-context.md            # Technical implementation ✅
├── bin/imajin                    # CLI executable ✅
├── package.json                  # NPM configuration ✅
└── tsconfig.json                 # TypeScript configuration ✅
```

## 🚧 **Live Development Status**

**📍 Current Focus:** Service Provider System (Prompt 1 of 18)  
**⏱️ Started:** Foundation architecture implementation  
**🎯 Target:** Professional CLI generation framework  

### **This Week's Progress:**
- ✅ Core Application class with dependency injection
- ✅ Basic CLI commands (banner, diagnose, list-services)
- ✅ Service provider registration system
- 🔄 Provider lifecycle management (register → boot)
- 🔄 Command registration from providers

### **Next Sprint:**
- Complete service provider boot sequence
- Implement command pattern framework
- Add credential management system
- Begin event-driven architecture

**📊 Overall Progress:** 4 of 18 foundation prompts completed (~22%)

**Detailed Tracking:** See [DEVELOPMENT_PROGRESS.md](docs/DEVELOPMENT_PROGRESS.md)

## 🔗 **Revolutionary Advantages**

### **🆓 Economic Democracy**
- **Zero recurring costs** - Generate once, own forever
- **No vendor lock-in** - Tools work independently
- **Community-driven** - Not controlled by profit-seeking corporations
- **Fair attribution** - Contributors get proper recognition

### **🏢 Enterprise Without Enterprise Costs**
- **Professional quality** - Same patterns Fortune 500 companies use
- **Production-ready** - Security, monitoring, reliability built-in
- **Type-safe** - Prevent integration errors at compile time
- **Scalable architecture** - Handles growth from day one

### **🤖 AI-Native Design**
- **No middleware complexity** - AI calls CLIs directly
- **Perfect JSON integration** - Native AI communication
- **Real-time coordination** - Live progress and event streams
- **Self-documenting** - AI can discover capabilities dynamically

### **🛠️ Developer Experience**
- **Familiar TypeScript** - Use existing skills and tooling
- **Modern DevEx** - Hot reload, auto-completion, type checking
- **Business language** - Commands that make sense to domain experts
- **Extensible** - Easy to customize and extend generated tools

## 🌍 **The Bigger Picture**

We're not just building another CLI framework. We're **democratizing access to professional tooling** that's typically locked behind expensive enterprise contracts.

**Today's Reality:**
- Professional API integration tools cost $99-999/month
- Small teams can't afford enterprise-grade patterns
- Vendor lock-in limits innovation and flexibility
- Middleware layers add complexity and failure points

**Our Democratic Future:**
- Generate professional tools for any API, completely free
- Small teams get the same quality as Fortune 500 companies
- Own your tools forever with no ongoing dependencies
- Direct integration without middleware complexity

## 📚 **Documentation**

- **[Implementation Prompts](docs/IMPLEMENTATION_PROMPTS.md)** - 18 detailed development tasks
- **[Development Progress](docs/DEVELOPMENT_PROGRESS.md)** - Live progress tracking
- **[Project Context](ai/project-context.md)** - Strategic vision and architecture
- **[Development Context](ai/dev-context.md)** - Technical implementation guidance
- **[.fair License](docs/.fair-license.md)** - Community-driven attribution framework

## 🤝 **Join the Democratic Revolution**

imajin-cli is built by the community, for the community. No corporate gatekeepers, no profit-driven decisions that hurt users.

### **How to Contribute:**
1. **Follow our structured development** - Use prompts in `IMPLEMENTATION_PROMPTS.md`
2. **Maintain professional standards** - TypeScript patterns and documentation
3. **Track your contributions** - Update progress in `DEVELOPMENT_PROGRESS.md`
4. **Get proper attribution** - All work credited under .fair protocol

### **Contribution Areas:**
- **🏗️ Core Architecture** - Implementing the 18 foundation prompts
- **🔒 Enterprise Patterns** - Security, monitoring, reliability features
- **🔌 Service Connectors** - Integration templates for popular APIs
- **📖 Documentation** - Guides, examples, and developer resources
- **🎨 Community** - Templates, examples, and ecosystem growth

## 📄 **Fair & Open License**

This project operates under the [.fair licensing framework](docs/.fair-license.md) - ensuring **transparent attribution**, **sustainable development**, and **community ownership**.

**Key Principles:**
- **🆓 Open Foundation** - Core framework is completely free with attribution
- **⚖️ Fair Credit** - All contributions tracked and credited transparently
- **💚 Sustainable Growth** - Community-driven development model
- **🚫 No Corporate Control** - Decisions made by contributor community

## 🌟 **Vision Statement**

**We're building the infrastructure that makes professional API integration accessible to everyone.**

Not just for Fortune 500 companies with enterprise budgets.  
Not with vendor lock-in and recurring subscription fees.  
Not with complex middleware that breaks when you need it most.

**But truly democratic tooling:**
- Generate professional CLI tools from any API specification
- Own your tools forever with no ongoing costs
- Enterprise-grade patterns without enterprise pricing
- Perfect AI integration without middleware complexity
- Community-driven development without corporate control

This is **economic democracy for developers** - professional tooling that belongs to the community, not shareholders.

---

**🚀 Status:** Service Provider System in Active Development  
**⏳ Next Milestone:** Command Pattern Framework Complete  
**🎯 Mission:** Democratize Professional API Integration  

*Built with TypeScript • Powered by Community • Owned by You*

**[⭐ Star on GitHub](https://github.com/imajin/imajin-cli) • [📖 Read the Docs](docs/) • [🤝 Join Development](docs/IMPLEMENTATION_PROMPTS.md)** 