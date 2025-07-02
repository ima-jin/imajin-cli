# Imajin-CLI Development Context

## 🛠️ Technical Foundation

### Current Architecture: Professional TypeScript CLI Framework

This document provides the technical development context for imajin-cli, a TypeScript CLI framework that generates domain-specific service integrations from OpenAPI/GraphQL specifications.

## 🔒 AI Assistant Security Constraints

### Git Command Limiter - MANDATORY COMPLIANCE

**⚠️ CRITICAL: All AI assistants working on this project MUST follow git command restrictions defined in `.ai.gitallowed`**

This project implements a **Git Command Limiter** security system that prevents unauthorized repository modifications by AI assistants. The system is **ACTIVE** and all AI interactions are filtered.

#### ✅ ALLOWED Git Commands (Read-Only Operations Only)

```bash
# Status and information commands
git status *                     # Check repository status
git log --oneline *              # View commit history
git log --graph --oneline *      # Visual commit tree
git branch -a                    # List all branches
git branch -r                    # List remote branches
git remote -v                    # Show remote repositories
git diff --name-only             # Show changed files
git diff --stat                  # Show diff statistics
git show --name-only *           # Show commit files

# Safe diagnostic commands
git config --get *               # Read configuration values
git config --list --local        # Show local config
git config --list --global       # Show global config
```

#### ❌ BLOCKED Git Commands (Repository Modifications)

```bash
# These commands are FORBIDDEN and will be blocked:
git add *                        # Stage files
git commit *                     # Create commits
git push *                       # Push to remote
git pull *                       # Pull from remote
git merge *                      # Merge branches
git reset *                      # Reset repository state
git checkout *                   # Switch branches/restore files
git rebase *                     # Rewrite history
git stash *                      # Stash changes
git tag *                        # Create tags
```

#### How AI Assistants Should Work

1. **Analysis & Code Review**: Use allowed `git status`, `git diff`, `git log` commands
2. **Information Gathering**: Check repository state with read-only commands
3. **Code Changes**: Create/modify files directly, let user handle git operations
4. **Documentation**: Update files and docs as needed
5. **Commits**: **NEVER** attempt to commit - inform user to commit manually

#### Security Rationale

- **Prevent Unauthorized Changes**: AI cannot accidentally modify repository history
- **Audit Trail**: All modifications go through human review and approval
- **Safe Collaboration**: AI can analyze and suggest without repository risks
- **Compliance**: Ensures AI follows organizational security policies

#### Example Workflow

```bash
# ✅ Allowed: Check current status
git status --porcelain

# ✅ Allowed: Review recent changes
git log --oneline -10

# ✅ Allowed: See what files changed
git diff --name-only

# ❌ Blocked: DO NOT attempt to commit
# git add . && git commit -m "changes"  # This will be blocked

# Instead: Inform user to commit manually
# "Changes are ready. Please review and commit manually."
```

#### Managing the Security System

```bash
# Check limiter status
imajin limiter status

# List allowed patterns
imajin limiter list

# Test if a command is allowed
imajin limiter test "git status --porcelain"

# Initialize default configuration
imajin limiter init
```

**📖 Full Documentation**: See `docs/security/GIT_COMMAND_LIMITER.md` for complete details.

---

## 📁 Project Structure

```
imajin-cli/
├── src/
│   ├── core/                     # Foundation patterns
│   │   ├── Application.ts        # Main app bootstrap
│   │   └── providers/            # Service provider system
│   ├── commands/                 # Command pattern implementation
│   ├── services/                 # Service integrations (Stripe, etc.)
│   ├── credentials/              # Secure credential management
│   ├── events/                   # Event-driven architecture
│   ├── exceptions/               # Error handling system
│   ├── http/                     # HTTP layer & webhooks
│   ├── media/                    # Media processing
│   ├── etl/                      # ETL pipeline system
│   ├── jobs/                     # Background processing
│   ├── diagnostics/              # Health monitoring
│   └── logging/                  # Structured logging
├── bin/imajin                    # CLI executable
├── docs/                         # Implementation documentation
├── package.json                  # NPM configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🏗️ Implementation Phases

### Phase 1: Foundation Architecture (18 Prompts)

**Current Status:** Implementing core patterns in order

1. **Service Provider System** ← **Currently Active**
2. Command Pattern Framework
3. Credential Management System
4. Plugin Generator Engine (Basic)
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
16. Stripe Connector (Reference)
17. Real-time Progress Tracking
18. LLM Introspection APIs

### Phase 2: Generation Engine

- OpenAPI/GraphQL specification parsing
- TypeScript CLI code generation
- Domain-specific command creation
- Enterprise pattern integration

### Phase 3: Service Ecosystem

- Multiple service connectors
- Template system for new services
- Community contribution framework

## 🔧 Core Development Patterns

### 1. Service Provider Pattern

**Foundation for modular architecture:**

```typescript
/**
 * ServiceProvider - Base service provider interface
 * Enables modular service registration and lifecycle management
 */
interface ServiceProvider {
  readonly name: string;
  readonly dependencies: string[];

  register(container: DependencyContainer): Promise<void>;
  boot(container: DependencyContainer): Promise<void>;
  shutdown?(): Promise<void>;
}
```

**Key Benefits:**

- Clean separation of concerns
- Dependency management
- Hot-swappable services
- Plugin architecture foundation

### 2. Command Pattern with TypeScript

**Type-safe CLI command structure:**

```typescript
/**
 * Command - Base command interface
 * Enables dynamic command registration and execution
 */
interface Command {
  readonly name: string;
  readonly description: string;
  readonly arguments: ArgumentDefinition[];
  readonly options: OptionDefinition[];

  execute(args: any[], options: any): Promise<CommandResult>;
  validate?(args: any[], options: any): ValidationResult;
}
```

**Generated CLI Example:**

```bash
# Instead of generic API calls:
curl -X POST https://api.stripe.com/v1/customers

# Generate domain-specific commands:
my-stripe-cli customer:create --name "John Doe" --email "john@example.com"
my-stripe-cli subscription:cancel --id "sub_123" --reason "requested"
```

### 3. Enterprise Patterns Integration

**Professional-grade capabilities built into every generated CLI:**

- **Credential Management**: Secure storage (Keychain/Windows Credential Manager)
- **Rate Limiting**: Respect API limits with intelligent throttling
- **Error Handling**: Structured exceptions with recovery strategies
- **Real-time Events**: Progress tracking and live updates
- **Background Jobs**: Long-running operations with progress
- **Health Monitoring**: Service status and diagnostics
- **Structured Logging**: Complete audit trail

### 4. LLM-Native Design

**Perfect AI integration throughout:**

```typescript
// JSON-first API design
interface CommandResult {
  success: boolean;
  data?: any;
  error?: StructuredError;
  metadata: {
    duration: number;
    timestamp: string;
    command: string;
  };
}

// Real-time progress for LLM coordination
interface ProgressUpdate {
  step: string;
  percent: number;
  message: string;
  data?: any;
}
```

## 💻 Development Stack

### Core Technologies

- **TypeScript 5.0+** - Type safety and modern language features
- **Node.js 20+** - Latest runtime with native TypeScript support
- **TSyringe** - Dependency injection container
- **Commander.js** - CLI framework and argument parsing
- **Zod** - Runtime type validation and schema generation

### Development Tools

- **ESM Modules** - Modern import/export throughout
- **Strict TypeScript** - Maximum type safety
- **Hot Reload** - Development efficiency
- **Built-in Testing** - Jest or Vitest for testing

### Enterprise Libraries

- **Winston/Pino** - Structured logging
- **Keytar** - Cross-platform credential storage
- **axios** - HTTP client with interceptors
- **EventEmitter** - Real-time event coordination
- **chalk** - Console styling and colors

## 🎯 Development Workflow

### Implementation Process

1. **Copy Implementation Prompt** from `docs/IMPLEMENTATION_PROMPTS.md`
2. **Follow Prompt Guidelines** exactly as specified
3. **Create Required Files** with proper TypeScript headers
4. **Implement Integration Points** as described
5. **Update Progress Tracker** in `docs/DEVELOPMENT_PROGRESS.md`

### File Header Template

```typescript
/**
 * [ClassName] - [Brief Description]
 *
 * @package     @imajin/cli
 * @subpackage  [subdirectory]
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - [Key integration point 1]
 * - [Key integration point 2]
 * - [Key integration point 3]
 */
```

### Success Criteria for Each Implementation

- All deliverable files created
- Integration points working correctly
- TypeScript compilation without errors
- Tests passing (where specified)
- Ready for next prompt in sequence

## 🚀 Architectural Goals

### Generated CLI Characteristics

- **Domain-Specific**: Commands use business language, not API endpoints
- **Type-Safe**: Full TypeScript support with compile-time validation
- **Enterprise-Ready**: Built-in patterns for security, monitoring, reliability
- **LLM-Friendly**: JSON APIs, structured responses, real-time progress
- **Professional**: Auto-completion, help system, error messages

### Example Generated Commands

```bash
# Stripe payment processing
stripe customer:create --name "Jane Doe" --email "jane@company.com"
stripe subscription:start --customer cus_123 --plan pro-monthly
stripe payment:refund --charge ch_456 --amount 2500 --reason "duplicate"

# Notion content management
notion page:create --title "Project Plan" --database proj_db --assign-to team
notion database:query --filter '{"Status": "In Progress"}' --format table
notion block:append --page page_123 --type "paragraph" --text "Updated status"

# GitHub repository operations
github issue:create --title "Bug Report" --body "Description" --labels bug,priority-high
github pr:merge --number 42 --strategy squash --delete-branch
github release:create --tag v1.2.0 --notes "Latest improvements"
```

## 🔍 Key Advantages

### For Developers

- **Familiar TypeScript** - Leverage existing skills and tooling
- **Modern Patterns** - Service providers, dependency injection, event-driven
- **Great DevEx** - Hot reload, type checking, auto-completion
- **Enterprise Patterns** - Production-ready from the start

### For LLM Integration

- **JSON-Native** - Perfect for AI communication
- **Real-time Updates** - Live progress and coordination
- **Structured Errors** - AI can understand and respond to failures
- **Introspection APIs** - AI can discover capabilities dynamically

### For Generated CLIs

- **Business Language** - Commands that make sense to domain experts
- **Professional Quality** - Feel like native, hand-crafted CLIs
- **Reliable** - Enterprise patterns prevent common failure modes
- **Extensible** - Easy to add new commands and capabilities

This development context ensures we build a **professional TypeScript CLI generation framework** that creates high-quality, enterprise-ready service integrations while maintaining perfect LLM compatibility.
