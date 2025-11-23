# MCP Server Setup Guide

This guide explains how to set up and use the imajin-cli MCP (Model Context Protocol) server with Claude Code/Desktop.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol that allows AI assistants like Claude to discover and invoke external tools. Instead of building a chat interface inside imajin-cli, we expose the CLI commands TO Claude via MCP.

**Benefits:**
- Superior UX using Claude Code's interface
- Natural language to CLI translation
- File context awareness
- Multi-step workflows
- No need to rebuild Claude's interface

## Architecture

The MCP server exposes all ~62 imajin-cli commands as MCP tools that Claude can invoke:

```
Claude Code → MCP Server → imajin-cli Commands
```

**Components:**
- **MCP Server** (`src/mcp/server.ts`) - Implements MCP protocol via stdio transport
- **Tool Generator** (`src/mcp/tool-generator.ts`) - Converts CLI commands to MCP tool definitions
- **Command Executor** (`src/mcp/executor.ts`) - Executes CLI commands from tool calls

## Prerequisites

1. **Build imajin-cli:**
   ```bash
   npm run build
   ```

2. **Configure credentials:**
   Set up your service credentials in `.env` or use the credential manager:
   ```bash
   node dist/index.js auth:login stripe
   node dist/index.js auth:login contentful
   node dist/index.js auth:login cloudinary
   ```

## Setup in Claude Code

### 1. Locate Claude Code Settings

**On macOS:**
- Open `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows:**
- Open `%APPDATA%\Claude\claude_desktop_config.json`

**On Linux:**
- Open `~/.config/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "imajin-cli": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_...",
        "CONTENTFUL_SPACE_ID": "...",
        "CONTENTFUL_ACCESS_TOKEN": "...",
        "CONTENTFUL_MANAGEMENT_TOKEN": "...",
        "CLOUDINARY_CLOUD_NAME": "...",
        "CLOUDINARY_API_KEY": "...",
        "CLOUDINARY_API_SECRET": "..."
      }
    }
  }
}
```

**Important:**
- Replace `D:/Projects/imajin/imajin-cli` with your actual project path
- Add all necessary environment variables for the services you use
- Use forward slashes `/` in paths, even on Windows

### 3. Alternative: Using .env File

If you prefer to keep credentials in a `.env` file, you can reference it:

```json
{
  "mcpServers": {
    "imajin-cli": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Make sure your `.env` file in the project root contains all required credentials.

### 4. Restart Claude Code

After updating the configuration:
1. Close Claude Code completely
2. Reopen Claude Code
3. The MCP server should now be available

## Verifying Setup

### Check Server Status

In Claude Code, you can ask:
```
What tools are available?
```

Claude should list all imajin-cli commands as available tools, formatted as:
- `stripe_customer_list`
- `stripe_customer_create`
- `contentful_entry_list`
- `media_upload`
- etc.

### Test a Command

Try a simple command:
```
List my Stripe customers
```

Claude should:
1. Recognize the intent
2. Call the `stripe_customer_list` tool
3. Display the results

## Available Tools

The MCP server exposes all imajin-cli commands as tools. Command names are converted from colon-separated to underscore-separated:

| CLI Command | MCP Tool Name |
|-------------|---------------|
| `stripe:customer:list` | `stripe_customer_list` |
| `stripe:customer:create` | `stripe_customer_create` |
| `contentful:entry:list` | `contentful_entry_list` |
| `media:upload` | `media_upload` |
| ... | ... |

## Usage Examples

### Natural Language Commands

You can use natural language with Claude Code:

**Stripe Operations:**
```
Show me all my Stripe customers
Create a Stripe customer named John with email john@example.com
Get details for product prod_abc123
List all active subscriptions
```

**Contentful Operations:**
```
List all blog posts from Contentful
Create a new blog entry with title "My Post"
Show entry details for entry123
```

**Media Operations:**
```
List media in my Cloudinary account
Upload this image to Cloudinary: ./photo.jpg
Show info for local file ./video.mp4
```

**Multi-Service Workflows:**
```
Create a Stripe product and then create a Contentful entry for it
Sync all products from Stripe to Contentful
```

## Troubleshooting

### Server Not Starting

**Check logs:**
```bash
# Enable debug mode
export DEBUG=true
node dist/mcp/server.js
```

**Common issues:**
- Missing credentials - ensure all required env vars are set
- Build not up to date - run `npm run build`
- Path incorrect - verify the path in `claude_desktop_config.json`

### Commands Not Found

**Verify command introspection:**
```bash
node dist/index.js --help
```

All commands shown in `--help` should be available via MCP.

### Credentials Not Working

**Test credentials directly:**
```bash
node dist/index.js stripe:customer:list
node dist/index.js contentful:entry:list
```

If these fail, fix credentials first before using MCP.

### JSON Parse Errors

**Check config file syntax:**
```bash
# On macOS/Linux
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .

# On Windows (PowerShell)
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | ConvertFrom-Json
```

## Advanced Configuration

### Custom Environment Variables

You can pass any environment variable to the MCP server:

```json
{
  "mcpServers": {
    "imajin-cli": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "DEBUG": "true",
        "LOG_LEVEL": "debug",
        "STRIPE_SECRET_KEY": "...",
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

### Multiple Environments

You can set up multiple MCP server instances for different environments:

```json
{
  "mcpServers": {
    "imajin-cli-dev": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_...",
        "NODE_ENV": "development"
      }
    },
    "imajin-cli-prod": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_live_...",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Security Considerations

### Credential Management

**Best practices:**
1. **Never commit credentials** to version control
2. Use `.env` file (add to `.gitignore`)
3. Consider using system credential manager:
   ```bash
   node dist/index.js auth:login <service>
   ```
4. Rotate credentials regularly

### Access Control

The MCP server has full access to your CLI commands. Be careful when:
- Sharing your Claude Code configuration
- Running commands that modify production data
- Using live API keys

**Recommendations:**
- Use test/sandbox credentials for experimentation
- Review commands before Claude executes them
- Monitor API usage in service dashboards

## Performance

### Command Execution Speed

MCP tool calls execute commands via the CLI, so performance is similar to running commands directly:
- Simple queries: 100-500ms
- Complex operations: 1-5s
- Batch operations: Varies by size

### Rate Limiting

Rate limiting is handled by the CLI itself (configured in service providers). MCP respects these limits automatically.

## Debugging

### Enable Debug Logging

Set `DEBUG=true` in the MCP server configuration:

```json
{
  "mcpServers": {
    "imajin-cli": {
      "command": "node",
      "args": ["D:/Projects/imajin/imajin-cli/dist/mcp/server.js"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

Logs will appear in Claude Code's MCP server logs.

### Test Server Directly

Run the MCP server manually to see output:

```bash
node dist/mcp/server.js
```

The server uses stdio transport, so it expects MCP protocol messages on stdin.

## Support

For issues or questions:
1. Check this documentation
2. Review [docs/prompts/phase4/30_MCP_integration.md](../prompts/phase4/30_MCP_integration.md)
3. Check [README.md](../../README.md)
4. Open an issue on GitHub

## Next Steps

- **Try natural language workflows** with Claude Code
- **Explore multi-service operations** (e.g., sync Stripe → Contentful)
- **Build custom workflows** using Claude's multi-step capabilities
- **Share feedback** on what works and what doesn't

The MCP integration makes imajin-cli's 62+ commands accessible through natural language - experiment and discover new workflows!
