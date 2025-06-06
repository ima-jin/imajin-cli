# 🎯 imajin-cli

**A TypeScript CLI framework that generates domain-specific service integrations from OpenAPI/GraphQL specifications.**

[![License: .fair](https://img.shields.io/badge/License-.fair-blue.svg)](docs/.fair-license.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Status: Foundation Development](https://img.shields.io/badge/Status-Foundation%20Development-orange.svg)](#development-status)

---

## 🚀 **Vision**

Transform how developers interact with APIs by generating **domain-specific CLIs** that speak your business language, not generic API endpoints.

**Instead of this:**
```bash
curl -X POST https://api.stripe.com/v1/customers \
  -H "Authorization: Bearer sk_..." \
  -d "name=John Doe&email=john@example.com"
```

**Generate this:**
```bash
my-stripe-cli customer:create --name "John Doe" --email "john@example.com"
my-stripe-cli subscription:start --customer cus_123 --plan pro-monthly
my-stripe-cli payment:refund --charge ch_456 --reason "duplicate"
```

## 🎯 **Core Purpose**

**For Developers**: Generate professional, type-safe CLIs from any API specification  
**For LLMs**: Perfect JSON-native interfaces for AI orchestration  
**For Businesses**: Domain-specific commands that match your actual workflows  
**For Teams**: Enterprise-grade patterns built into every generated CLI  

## 🏗️ **Architecture Overview**

### **Phase 1: Foundation Architecture** *(Currently In Development)*
Building the core TypeScript framework with enterprise patterns:

- ✅ **Project Structure** - Professional TypeScript setup
- 🔄 **Service Provider System** - *Currently implementing*
- ⏳ **Command Pattern Framework** - Modular command architecture
- ⏳ **Credential Management** - Secure cross-platform credential storage
- ⏳ **Event-Driven System** - Real-time progress and coordination
- ⏳ **Enterprise Patterns** - Rate limiting, error handling, monitoring
- ⏳ **LLM Integration** - JSON APIs and introspection capabilities

### **Phase 2: Generation Engine** *(Planned)*
- OpenAPI/GraphQL specification parsing
- TypeScript CLI code generation
- Domain-specific command creation
- Enterprise pattern integration

### **Phase 3: Service Ecosystem** *(Future)*
- Multiple service connectors (Stripe, Notion, GitHub, etc.)
- Template system for new services
- Community contribution framework

## 💻 **Technology Stack**

**Core Framework:**
- **TypeScript 5.0+** - Type safety and modern language features
- **Node.js 20+** - Latest runtime with native TypeScript support
- **TSyringe** - Dependency injection container
- **Commander.js** - CLI framework and argument parsing
- **Zod** - Runtime type validation and schema generation

**Enterprise Capabilities:**
- **Winston/Pino** - Structured logging
- **Keytar** - Cross-platform credential storage
- **axios** - HTTP client with interceptors
- **EventEmitter** - Real-time event coordination
- **chalk** - Console styling and colors

## 📁 **Project Structure**

```
imajin-cli/
├── src/
│   ├── core/                     # Foundation patterns
│   │   ├── Application.ts        # Main app bootstrap  
│   │   └── providers/            # Service provider system
│   ├── commands/                 # Command pattern implementation
│   ├── services/                 # Service integrations
│   ├── credentials/              # Secure credential management
│   ├── events/                   # Event-driven architecture
│   ├── exceptions/               # Error handling system
│   └── ...                       # Additional enterprise components
├── docs/                         # Implementation documentation
│   ├── IMPLEMENTATION_PROMPTS.md # Detailed development tasks
│   ├── DEVELOPMENT_PROGRESS.md   # Current progress tracking
│   └── .fair-license.md          # Universal attribution license
├── bin/imajin                    # CLI executable
├── package.json                  # NPM configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🎯 **Generated CLI Examples**

### **Stripe Payment Processing**
```bash
stripe customer:create --name "Jane Doe" --email "jane@company.com"
stripe subscription:start --customer cus_123 --plan pro-monthly
stripe payment:refund --charge ch_456 --amount 2500 --reason "duplicate"
```

### **Notion Content Management**
```bash
notion page:create --title "Project Plan" --database proj_db --assign-to team
notion database:query --filter '{"Status": "In Progress"}' --format table
notion block:append --page page_123 --type "paragraph" --text "Updated status"
```

### **GitHub Repository Operations**
```bash
github issue:create --title "Bug Report" --body "Description" --labels bug,priority-high
github pr:merge --number 42 --strategy squash --delete-branch
github release:create --tag v1.2.0 --notes "Latest improvements"
```

## 🤖 **LLM Integration Features**

**JSON-Native APIs:**
- All commands support `--json` output for perfect AI parsing
- Structured error messages with recovery suggestions
- Real-time progress updates via WebSocket/EventEmitter

**AI Discovery:**
- Introspection APIs for command and service discovery
- Schema export for LLM understanding
- Self-documenting system capabilities

**Example LLM Workflow:**
```bash
# AI can discover available commands
imajin --list-services --json
imajin stripe --describe --json

# AI can orchestrate multi-service workflows
stripe customer:create --name "John" --email "john@co.com" --json | \
notion page:create --title "New Customer: John" --json
```

## 🛠️ **Installation & Usage**

### **Installation** *(Coming Soon)*
```bash
# Install globally
npm install -g @imajin/cli

# Or use npx
npx @imajin/cli --help
```

### **Generate Your First CLI** *(Planned)*
```bash
# Generate from OpenAPI specification
imajin generate stripe --spec https://api.stripe.com/openapi.json
imajin generate notion --spec https://api.notion.com/openapi.json

# Install and use generated CLI
cd stripe-cli && npm install
./bin/stripe customer:create --help
```

### **Current Usage** *(Development)*
```bash
# Clone and explore the foundation
git clone https://github.com/imajin/imajin-cli
cd imajin-cli
npm install

# Build and run current CLI
npm run build
node bin/imajin --help
```

## 🚧 **Development Status**

**Current Phase:** Foundation Architecture (Phase 1 of 3)  
**Active Task:** Service Provider System (Prompt 1 of 18)  
**Progress:** Core TypeScript framework and enterprise patterns  

### **Completed:**
- ✅ Project structure and TypeScript configuration
- ✅ Basic CLI bootstrap with Commander.js
- ✅ Documentation framework and implementation prompts
- ✅ .fair licensing framework for creative asset attribution

### **In Progress:**
- 🔄 Service Provider System (dependency injection and lifecycle)

### **Next Up:**
- ⏳ Command Pattern Framework
- ⏳ Credential Management System
- ⏳ Event-Driven Architecture
- ⏳ Enterprise Error Handling

**Detailed Progress:** See [DEVELOPMENT_PROGRESS.md](docs/DEVELOPMENT_PROGRESS.md)

## 🔗 **Key Advantages**

### **For Developers**
- **Familiar TypeScript** - Leverage existing skills and tooling
- **Enterprise Patterns** - Production-ready from the start
- **Modern DevEx** - Hot reload, type checking, auto-completion
- **Professional Quality** - Generated CLIs feel hand-crafted

### **For LLM Integration**
- **JSON-Native** - Perfect for AI communication
- **Real-time Updates** - Live progress and coordination
- **Structured Errors** - AI can understand and respond to failures
- **Introspection APIs** - AI can discover capabilities dynamically

### **For Generated CLIs**
- **Domain-Specific** - Commands use business language, not API endpoints
- **Type-Safe** - Full TypeScript support with compile-time validation
- **Enterprise-Ready** - Built-in security, monitoring, and reliability
- **Extensible** - Easy to add new commands and capabilities

## 📚 **Documentation**

- **[Implementation Prompts](docs/IMPLEMENTATION_PROMPTS.md)** - Detailed development tasks and architecture
- **[Development Progress](docs/DEVELOPMENT_PROGRESS.md)** - Current status and completed milestones
- **[Project Context](ai/project-context.md)** - Strategic vision and technical architecture
- **[Development Context](ai/dev-context.md)** - Technical implementation guidance
- **[.fair License](docs/.fair-license.md)** - Universal creative asset attribution framework

## 🤝 **Contributing**

imajin-cli is built with community contribution in mind, following the .fair protocol for transparent attribution and sustainable development.

### **Current Development Process:**
1. **Follow Implementation Prompts** - Use detailed prompts in `docs/IMPLEMENTATION_PROMPTS.md`
2. **Maintain Standards** - Follow TypeScript patterns and file header templates
3. **Update Progress** - Track completion in `docs/DEVELOPMENT_PROGRESS.md`
4. **Attribution** - All contributions tracked under .fair protocol

### **Contribution Areas:**
- **Core Architecture** - Implementing the 18 foundation prompts
- **Enterprise Patterns** - Security, monitoring, reliability features
- **Service Connectors** - Integration templates for popular APIs
- **Documentation** - Guides, examples, and developer resources

**Note:** During foundation development, we're following a structured prompt-based approach. See [IMPLEMENTATION_PROMPTS.md](docs/IMPLEMENTATION_PROMPTS.md) for current tasks.

## 📄 **License**

This project operates under the [.fair licensing framework](docs/.fair-license.md) - ensuring transparent attribution, sustainable revenue sharing, and community-driven development for all creative assets.

**Key Principles:**
- **Open Foundation** - Core framework is open source with attribution requirements
- **Fair Attribution** - All contributions tracked and credited transparently  
- **Sustainable Economics** - Revenue sharing for generated tools and improvements
- **Community Driven** - Governance and development guided by contributor community

## 🌟 **Vision Statement**

We're building the foundational layer that makes AI integration with existing platforms reliable, economically sustainable, and community-driven - all while speaking the language of business domains, not technical APIs.

This isn't just tooling - it's infrastructure for **human-centric organizations** that use AI as a force multiplier, not a replacement.

---

**Status:** 🚧 Foundation Development  
**Next Milestone:** Service Provider System Complete  
**Target:** Professional CLI generation framework with enterprise capabilities  

*Built with TypeScript, powered by community, designed for the future of AI-human collaboration.* 