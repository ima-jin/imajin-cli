---
# Metadata
title: "31 CommandManager Integration Throughout CLI"
created: "2025-11-23T05:35:00Z"
updated: "2025-11-23T05:35:00Z"
---

# 📝 IMPLEMENT: CommandManager Integration Throughout CLI

**Status:** ⏳ **PENDING**
**Phase:** 4 - Advanced Features
**Estimated Time:** 8-12 hours
**Dependencies:** Plugin System, Command Pattern Framework

---

## CONTEXT

Currently, CommandManager exists and is used by the plugin system and MCP server, but the main CLI bypasses it entirely. Service providers register commands directly with Commander.js via `this.program.command()`. This creates two parallel command registration systems:

1. **Main CLI Path**: ServiceProvider → Commander.js (direct)
2. **Plugin Path**: Plugin → CommandManager → Commander.js (managed)

This enhancement unifies command registration through CommandManager, providing centralized command lifecycle management, better introspection, and consistent registration APIs.

## CURRENT STATE ANALYSIS

### What Works Today

**MCP Server** (`src/mcp/server.ts`):
```typescript
// CommandManager is registered in container
container.singleton('commandManager', () => {
    return new CommandManager(this.application.getProgram(), container);
});
```

**Plugin System** (`src/core/PluginManager.ts`):
```typescript
// Plugins use CommandManager for dynamic registration
this.commandManager.register(commandInstance);
```

### What's Missing

**Main CLI** (`src/index.ts` + all ServiceProviders):
```typescript
// Direct Commander.js registration (bypasses CommandManager)
this.program
    .command('stripe:customer:list')
    .description('...')
    .action(async (options) => { /* ... */ });
```

**Result**:
- No centralized command registry
- Can't introspect all commands programmatically
- Inconsistent registration patterns
- CommandManager benefits unavailable to main CLI

## ARCHITECTURAL VISION

### Unified Command Registration Flow

```
┌─────────────────────────────────────────────────┐
│           Application Bootstrap                  │
├─────────────────────────────────────────────────┤
│  1. Register CommandManager in container        │
│  2. ServiceProviders resolve CommandManager     │
│  3. All commands registered via CommandManager  │
│  4. CommandManager registers with Commander.js  │
└─────────────────────────────────────────────────┘
```

### Benefits

1. **Centralized Command Registry**
   - Query all commands: `commandManager.getCommands()`
   - Check existence: `commandManager.hasCommand('stripe:customer:list')`
   - Dynamic command discovery for MCP, help systems, docs generation

2. **Unified Registration API**
   - One way to register commands (plugins or core)
   - Consistent error handling
   - Command lifecycle hooks (before/after execution)

3. **Better Introspection**
   - Generate command documentation automatically
   - MCP server tool generation becomes simpler
   - AI can query available commands programmatically

4. **Command Lifecycle Management**
   - Pre/post execution hooks
   - Command validation pipeline
   - Metrics and monitoring per command
   - Centralized error handling

## DELIVERABLES

### 1. Core Infrastructure Updates

**File**: `src/core/Application.ts`
- Register CommandManager in `registerCoreServices()`
- Ensure CommandManager available to all providers

**File**: `src/core/commands/CommandManager.ts`
- Add command introspection methods
- Add lifecycle hooks support
- Add command metadata storage

### 2. ServiceProvider Migration Pattern

Create migration helper to convert existing registration:

**Before** (Direct Commander.js):
```typescript
this.program
    .command('stripe:customer:list')
    .description('List Stripe customers')
    .option('--limit <n>', 'Limit results')
    .action(async (options) => {
        const service = this.container.resolve<StripeService>('stripeService');
        await service.listCustomers(options);
    });
```

**After** (Via CommandManager):
```typescript
const commandManager = this.container.resolve<CommandManager>('commandManager');
commandManager.register({
    name: 'stripe:customer:list',
    description: 'List Stripe customers',
    options: [
        { name: 'limit', description: 'Limit results', type: 'number' }
    ],
    execute: async (args, options) => {
        const service = this.container.resolve<StripeService>('stripeService');
        await service.listCustomers(options);
    }
});
```

### 3. Migrate All Service Providers

Migrate command registration in these providers:
- `CredentialServiceProvider`
- `ServiceLayerProvider`
- `PluginGeneratorServiceProvider`
- `MediaServiceProvider`
- `MonitoringServiceProvider`
- `StripeServiceProvider`
- `ContentfulServiceProvider`
- All other service providers with commands

### 4. Enhanced CommandManager Features

Add to `src/core/commands/CommandManager.ts`:

```typescript
export class CommandManager {
    // Existing methods
    register(command: ICommand): void;
    getCommands(): ICommand[];
    hasCommand(name: string): boolean;

    // NEW: Enhanced introspection
    getCommandByName(name: string): ICommand | undefined;
    getCommandsByCategory(category: string): ICommand[];
    getAllCommandNames(): string[];

    // NEW: Lifecycle hooks
    beforeExecute(hook: (command: ICommand, args: any[]) => Promise<void>): void;
    afterExecute(hook: (command: ICommand, result: any) => Promise<void>): void;
    onError(hook: (command: ICommand, error: Error) => Promise<void>): void;

    // NEW: Metadata support
    setCommandMetadata(name: string, metadata: CommandMetadata): void;
    getCommandMetadata(name: string): CommandMetadata | undefined;

    // NEW: Command grouping
    registerCommandGroup(group: CommandGroup): void;
    getCommandGroups(): CommandGroup[];
}

interface CommandMetadata {
    category?: string;
    tags?: string[];
    examples?: string[];
    relatedCommands?: string[];
    deprecated?: boolean;
    since?: string;
}

interface CommandGroup {
    name: string;
    description: string;
    commands: string[];
}
```

### 5. Update MCP Server

**File**: `src/mcp/server.ts`

Simplify tool generation using CommandManager's enhanced introspection:

```typescript
private async introspectCommands(): Promise<void> {
    const commandManager = this.application.getContainer()
        .resolve<CommandManager>('commandManager');

    // Get all commands from CommandManager directly
    const commands = commandManager.getCommands();

    // Generate MCP tools from commands
    this.tools = commands.map(cmd => ({
        name: cmd.name.replace(/:/g, '_'),
        description: cmd.description,
        inputSchema: this.generateSchema(cmd)
    }));
}
```

### 6. Documentation & Tests

**Files**:
- `docs/architecture/command-manager.md` - Architecture documentation
- `src/core/commands/__tests__/CommandManager.test.ts` - Unit tests
- `src/test/integration/command-registration.test.ts` - Integration tests
- `docs/guides/adding-commands.md` - Developer guide

## IMPLEMENTATION PLAN

### Phase 1: Foundation (2-3 hours)
1. ✅ Add `getContainer()` to Application (DONE - completed during MCP work)
2. Register CommandManager in Application's `registerCoreServices()`
3. Add enhanced introspection methods to CommandManager
4. Write unit tests for new CommandManager features

### Phase 2: Provider Migration Pattern (2-3 hours)
1. Create migration helper utilities
2. Document migration pattern with examples
3. Migrate one provider as reference (e.g., PluginGeneratorServiceProvider)
4. Test migrated provider thoroughly

### Phase 3: Bulk Migration (3-4 hours)
1. Migrate all remaining service providers
2. Ensure all tests pass
3. Update any command references in documentation
4. Verify MCP server still works with new registration

### Phase 4: Enhanced Features (2-3 hours)
1. Add lifecycle hooks support
2. Add command metadata system
3. Add command grouping/categorization
4. Update MCP server to use enhanced introspection

### Phase 5: Documentation & Cleanup (1-2 hours)
1. Write architecture documentation
2. Create developer guide for adding commands
3. Update all relevant docs
4. Final integration testing

## IMPLEMENTATION REQUIREMENTS

### 1. CommandManager Registration in Application

**File**: `src/core/Application.ts`

```typescript
private registerCoreServices(): void {
    // Existing registrations...
    this.container.singleton('logger', () => this.logger);
    this.container.singleton('config', () => this.config);
    this.container.singleton('container', () => this.container);

    // NEW: Register CommandManager
    this.container.singleton('commandManager', () => {
        return new CommandManager(this.program, this.container);
    });

    this.container.singleton('errorHandler', () => this.errorHandler);
    // ... rest of registrations
}
```

### 2. Enhanced ICommand Interface

**File**: `src/core/commands/CommandManager.ts`

```typescript
export interface ICommand {
    readonly name: string;
    readonly description: string;
    readonly options?: CommandOption[];
    readonly arguments?: CommandArgument[];
    readonly metadata?: CommandMetadata;
    execute(args: any[], options: any): Promise<any>;
}

export interface CommandOption {
    name: string;
    description: string;
    type?: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: any;
}

export interface CommandArgument {
    name: string;
    description: string;
    required?: boolean;
}
```

### 3. ServiceProvider Base Class Update

**File**: `src/providers/ServiceProvider.ts`

Add helper method for easier command registration:

```typescript
export abstract class ServiceProvider {
    // Existing methods...

    protected registerCommand(command: ICommand): void {
        const commandManager = this.container.resolve<CommandManager>('commandManager');
        commandManager.register(command);
    }

    protected registerCommandGroup(group: CommandGroup): void {
        const commandManager = this.container.resolve<CommandManager>('commandManager');
        commandManager.registerCommandGroup(group);
    }
}
```

## TESTING REQUIREMENTS

### Unit Tests

**File**: `src/core/commands/__tests__/CommandManager.test.ts`

```typescript
describe('CommandManager', () => {
    describe('Command Registration', () => {
        test('registers command and makes it available');
        test('prevents duplicate command registration');
        test('validates command structure');
    });

    describe('Command Introspection', () => {
        test('lists all registered commands');
        test('finds command by name');
        test('filters commands by category');
        test('returns command metadata');
    });

    describe('Lifecycle Hooks', () => {
        test('executes beforeExecute hooks');
        test('executes afterExecute hooks');
        test('executes onError hooks');
        test('hook execution order is correct');
    });

    describe('Command Execution', () => {
        test('executes command with correct arguments');
        test('handles command errors gracefully');
        test('captures command execution metrics');
    });
});
```

### Integration Tests

**File**: `src/test/integration/command-registration.test.ts`

```typescript
describe('CommandManager Integration', () => {
    test('service providers register commands via CommandManager');
    test('MCP server can introspect all commands');
    test('plugin commands work alongside core commands');
    test('command lifecycle hooks work end-to-end');
});
```

## SUCCESS CRITERIA

- [ ] CommandManager registered in Application's container
- [ ] All service providers use CommandManager for registration
- [ ] No direct `this.program.command()` calls outside CommandManager
- [ ] Enhanced introspection methods implemented and tested
- [ ] Lifecycle hooks functional and tested
- [ ] MCP server uses enhanced introspection
- [ ] All existing commands still work (no regressions)
- [ ] Documentation complete and accurate
- [ ] Test coverage ≥ 90% for CommandManager
- [ ] Migration guide written and validated

## BENEFITS AFTER COMPLETION

### For Developers
- Consistent command registration API
- Better IDE autocomplete for command registration
- Easier to add new commands
- Clear command lifecycle visibility

### For MCP Server
- Simpler tool generation (use CommandManager directly)
- Automatic sync with CLI commands
- Better error messages for command failures

### For AI/LLM Integration
- Programmatic command discovery
- Rich command metadata for better AI understanding
- Command relationships and examples available

### For Users
- Better help system (grouped commands, richer metadata)
- Consistent command structure
- Better error messages

## MIGRATION SAFETY

### Backwards Compatibility
- All existing commands continue to work
- No breaking changes to command execution
- ServiceProvider API remains compatible
- Gradual migration possible (one provider at a time)

### Rollback Plan
- Keep direct Commander.js registration as fallback
- CommandManager can coexist with direct registration
- Easy to revert individual providers if issues arise

### Testing Strategy
- Migrate one provider at a time
- Run full test suite after each migration
- Test MCP server after each migration
- Validate all commands work manually

## RELATED FILES

- `src/core/Application.ts` - CommandManager registration
- `src/core/commands/CommandManager.ts` - Core implementation
- `src/providers/ServiceProvider.ts` - Base class for providers
- `src/mcp/server.ts` - MCP integration
- `docs/architecture/AI_SAFE_INFRASTRUCTURE.md` - Related patterns

## REFERENCES

- **Current Implementation**: CommandManager only used by plugins/MCP
- **Target**: Unified command registration throughout application
- **Inspiration**: Laravel's Command Bus, Symfony Console Component

---

## NEXT STEP

After completion, update `docs/DEVELOPMENT_PROGRESS.md`:
- Move this task from "Pending" to "Completed"
- Document CommandManager as the standard command registration pattern
- Update any guides referencing direct Commander.js usage

---

## 🔗 **RELATED PROMPTS**

- `phase1/02_command_pattern_framework.md` - Original command pattern
- `phase2/12_service_layer.md` - Service provider architecture
- Current MCP server implementation (src/mcp/server.ts)
