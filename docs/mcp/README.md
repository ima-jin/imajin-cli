# MCP Integration

This directory contains documentation for the imajin-cli MCP (Model Context Protocol) server integration.

## Quick Start

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Add to Claude Code config** (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "imajin-cli": {
         "command": "node",
         "args": ["<YOUR_PATH>/imajin-cli/dist/mcp/server.js"],
         "env": {
           "STRIPE_SECRET_KEY": "sk_test_...",
           "CONTENTFUL_SPACE_ID": "...",
           "CLOUDINARY_API_KEY": "..."
         }
       }
     }
   }
   ```

3. **Restart Claude Code** and start using natural language commands!

## Documentation

- **[Setup Guide](setup-guide.md)** - Complete installation and configuration
- **[Phase 4 Plan](../prompts/phase4/30_MCP_integration.md)** - Implementation details

## What Can You Do?

### Stripe Operations
```
List all my customers
Create a Stripe customer named Sarah with email sarah@example.com
Show me product details for prod_abc123
List all subscriptions
Cancel subscription sub_123
```

### Contentful CMS
```
List all blog posts
Create a new blog entry with title "My First Post"
Update entry abc123
Delete entry xyz789
Show entry details for entry123
```

### Media Management
```
List all media in Cloudinary
Upload ./photo.jpg to Cloudinary in folder "vacation"
Show info for ./video.mp4
List local media files
```

### Multi-Service Workflows
```
Create a Stripe product and sync it to Contentful
List all products from Stripe and create Contentful entries for them
Upload this image and create a product with it
```

## Architecture

```
┌─────────────┐
│ Claude Code │
└──────┬──────┘
       │ MCP Protocol (stdio)
       │
┌──────▼──────┐
│ MCP Server  │ (src/mcp/server.ts)
└──────┬──────┘
       │
       ├─► Tool Generator (converts commands → tools)
       ├─► Command Executor (executes CLI commands)
       └─► Commander.js Program (62+ commands)
```

## How It Works

1. **Command Discovery**: Server introspects all CLI commands at startup
2. **Tool Generation**: Converts each command to MCP tool definition
3. **Natural Language**: Claude interprets your request
4. **Tool Execution**: MCP server executes the corresponding CLI command
5. **Results**: Output returned to Claude, formatted naturally

## Available Tools

All 62+ imajin-cli commands are available via MCP. Command names use underscores instead of colons:

- `stripe:customer:list` → `stripe_customer_list`
- `contentful:entry:create` → `contentful_entry_create`
- `media:upload` → `media_upload`

## Benefits Over Chat Mode

| Feature | Chat Mode | MCP Integration |
|---------|-----------|-----------------|
| Interface | Terminal-based | Claude Code UI |
| Context | Limited | Full file context |
| Multi-step | Manual | Automatic |
| Tool Use | Simulated | Native MCP |
| UX | Custom built | Professional |

## Security

- MCP server runs with your credentials
- Same security as running CLI directly
- Use test credentials for experimentation
- Monitor service dashboards for API usage

## Troubleshooting

### Commands not appearing
- Check build is up to date: `npm run build`
- Verify path in config file
- Restart Claude Code

### Credentials not working
- Test directly: `node dist/index.js stripe:customer:list`
- Check env vars in config
- Verify credentials with service providers

### Server errors
- Enable debug: set `DEBUG=true` in env
- Check logs in Claude Code
- Run server directly: `node dist/mcp/server.js`

## Future Enhancements

Potential Phase 2 features (not yet implemented):
- [ ] Tool usage analytics/logging
- [ ] Rate limiting per tool
- [ ] Command result caching
- [ ] Self-extending capability (generate missing commands)

## References

- [MCP SDK](https://github.com/anthropics/model-context-protocol)
- [Claude Code Documentation](https://claude.ai/code)
- [imajin-cli README](../../README.md)
- [CLAUDE.md](../../CLAUDE.md)
