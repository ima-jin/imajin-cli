# Phase 4 – MCP Integration

**Goal:** Expose imajin-cli commands through Model Context Protocol (MCP) so Claude Code/Desktop can discover and invoke business-context commands directly.

**Why MCP?** Rather than building a chat interface inside imajin-cli, expose the CLI TO Claude via MCP. This provides:
- Superior UX (Claude Code's interface)
- Natural language to CLI translation
- File context awareness
- Multi-step workflows
- No need to rebuild Claude's interface

## Architecture Decision: Unified Server (Not Per-Service)

**Approach:** Single MCP server that exposes ALL imajin-cli commands as tools, rather than separate servers per service.

**Why:**
- Simpler deployment (one server process)
- Unified auth/credential management
- Reuses existing command introspection from `AIServiceProvider`
- Matches how the CLI actually works (unified command tree)
- Easier for users (one config entry in Claude)

## Implementation Strategy

### Phase 1: Static Tool Exposure (Start Here)
Expose existing CLI commands as fixed MCP tools. No dynamic generation, no self-modification.

**Components:**
1. **MCP Server** (`src/mcp/server.ts`)
   - Implements MCP protocol
   - Discovers commands via Commander.js introspection (reuse `AIServiceProvider.introspectCommands()`)
   - Converts `CommandSchema` to MCP tool definitions
   - Executes commands by calling Commander programmatically

2. **Tool Generator** (`src/mcp/tool-generator.ts`)
   - Converts Commander command tree → MCP tool definitions
   - Maps positional args + options → tool input schema
   - Generates tool descriptions from command metadata

3. **Command Executor** (`src/mcp/executor.ts`)
   - Takes tool call (name + args) → executes CLI command
   - Captures stdout/stderr
   - Returns structured JSON response

### Phase 2: Self-Extension (Future - Maybe Never)
*Only if Phase 1 works flawlessly and there's clear need.*

Could add meta-tool that generates missing commands on-the-fly using existing PluginGenerator infrastructure. **Deferred due to complexity.**

## Deliverables

### Immediate (Phase 1)
- [ ] `src/mcp/server.ts` - MCP server implementation
- [ ] `src/mcp/tool-generator.ts` - Command → Tool converter
- [ ] `src/mcp/executor.ts` - Tool execution handler
- [ ] `src/mcp/types.ts` - MCP type definitions
- [ ] Claude Code config example in `docs/mcp/`
- [ ] README update with MCP setup instructions

### Future (Phase 2+)
- [ ] Tool usage analytics/logging
- [ ] Rate limiting per tool
- [ ] Command result caching
- [ ] Self-extending capability (if needed)

## Technical Details

### Command Discovery
Reuse `AIServiceProvider.introspectCommands()` which already:
- Walks Commander.js program tree
- Extracts command names, args, options
- Generates `CommandSchema` objects
- Runs at application boot

### Tool Schema Format
```typescript
{
  name: "stripe_catalog_product",  // stripe:catalog:product → stripe_catalog_product
  description: "Show detailed information about a product",
  input_schema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID" },
      json: { type: "boolean", description: "Output in JSON format" }
    },
    required: ["productId"]
  }
}
```

### Execution Flow
```
Claude → MCP Tool Call: stripe_catalog_product({ productId: "prod_123" })
  ↓
MCP Server receives call
  ↓
Convert to CLI args: ["stripe:catalog:product", "prod_123"]
  ↓
Execute via Commander: program.parseAsync(argv, { from: 'user' })
  ↓
Capture output + return to Claude
```

### Auth/Secrets
- MCP server runs with same `.env` as CLI
- No separate credential management needed
- Uses existing CredentialServiceProvider

### Configuration
User adds to Claude Code's MCP settings:
```json
{
  "mcpServers": {
    "imajin-cli": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_...",
        "CLOUDINARY_CLOUD_NAME": "...",
        // ... other credentials
      }
    }
  }
}
```

## Task List (Phase 1)

### 1. Setup MCP Infrastructure
- [ ] Install `@modelcontextprotocol/sdk` package
- [ ] Create `src/mcp/` directory structure
- [ ] Define MCP types (`src/mcp/types.ts`)

### 2. Implement Core Components
- [ ] `tool-generator.ts` - Convert CommandSchema → MCP tools
- [ ] `executor.ts` - Execute CLI commands from tool calls
- [ ] `server.ts` - MCP server with stdio transport

### 3. Integration
- [ ] Wire up command introspection (reuse AIServiceProvider)
- [ ] Test with Claude Code locally
- [ ] Handle errors gracefully

### 4. Documentation
- [ ] Setup guide for users
- [ ] Example usage in Claude Code
- [ ] Troubleshooting common issues

## Anti-Patterns to Avoid

❌ **Don't:** Build per-service MCP servers (Stripe server, Contentful server, etc.)
✅ **Do:** Single unified server that exposes all commands

❌ **Don't:** Start with self-generating/meta-programming
✅ **Do:** Static tool exposure first, evaluate later

❌ **Don't:** Recreate command execution logic
✅ **Do:** Reuse existing Commander.js command tree

❌ **Don't:** Build yet another chat interface
✅ **Do:** Let Claude Code handle the UI

## Success Criteria

Phase 1 is successful when:
- [ ] Claude Code can discover all ~62 imajin-cli commands
- [ ] Commands execute correctly with proper args/options
- [ ] Errors are surfaced clearly to Claude
- [ ] User can accomplish tasks via natural language
- [ ] No worse than running commands manually

## References
- MCP SDK: https://github.com/anthropics/model-context-protocol
- Existing command introspection: `src/services/ai/AIServiceProvider.ts`
- Command schemas: `src/services/ai/NaturalLanguageProcessor.ts`
- Canonical guidance: `CLAUDE.md`, `README.md`
