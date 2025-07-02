# Git Command Limiter

## Overview

The Git Command Limiter is a security feature that prevents the AI from executing arbitrary git commands. It filters git commands against an allowed list defined in the `.ai.gitallowed` file.

## Features

- **Whitelist-based filtering**: Only git commands matching allowed patterns can be executed
- **Pattern matching**: Supports wildcards (`*`) for flexible command patterns
- **Real-time validation**: Commands are validated before execution
- **Detailed logging**: All blocked commands are logged with reasons
- **CLI management**: Built-in commands to manage allowed patterns
- **Caching**: Pattern file is cached for performance

## Configuration

### .ai.gitallowed File

The `.ai.gitallowed` file in the project root defines which git commands are allowed:

```bash
# Git Commands Allowed for AI Execution
# Use * for wildcards
# Only add commands that are safe for automated execution

# Status and information commands (safe, read-only)
git status *
git log --oneline *
git log --graph --oneline *
git branch -a
git branch -r
git remote -v
git diff --name-only
git diff --stat
git show --name-only *

# Safe diagnostic commands
git config --get *
git config --list --local
git config --list --global
```

### Pattern Matching

- `*` matches any characters
- Patterns are case-insensitive
- Full command must match the pattern
- Comments start with `#`
- Empty lines are ignored

### Examples

| Pattern | Matches | Doesn't Match |
|---------|---------|---------------|
| `git status *` | `git status`, `git status --porcelain` | `git add file.txt` |
| `git log --oneline *` | `git log --oneline`, `git log --oneline -10` | `git log --graph` |
| `git config --get *` | `git config --get user.name` | `git config --set user.name` |

## CLI Commands

### List Allowed Patterns

```bash
# Show all allowed git command patterns
imajin limiter list

# Output in JSON format
imajin limiter list --json
```

### Test Commands

```bash
# Test if a git command would be allowed
imajin limiter test "git status --porcelain"
imajin limiter test "git commit -m 'test'"

# JSON output
imajin limiter test "git status" --json
```

### Check Status

```bash
# Show limiter configuration status
imajin limiter status

# JSON output
imajin limiter status --json
```

### Initialize Configuration

```bash
# Create default .ai.gitallowed file
imajin limiter init

# Overwrite existing file
imajin limiter init --force
```

## Integration

### CommandExecutor

The `CommandExecutor` utility automatically validates git commands:

```typescript
import { executeCommand, executeInteractive } from '../utils/CommandExecutor.js';

// This will be filtered if git command is not allowed
const result = await executeCommand('git', ['status', '--porcelain']);

if (result.blocked) {
    console.log(`Command blocked: ${result.blockReason}`);
}
```

### Manual Validation

You can also validate commands manually:

```typescript
import { getCommandLimiter } from '../utils/CommandLimiter.js';

const limiter = getCommandLimiter(logger);
const validation = await limiter.validateCommand('git status');

if (!validation.allowed) {
    console.log(`Blocked: ${validation.reason}`);
}
```

## Security Considerations

### Safe Commands Only

The default configuration only includes **read-only** git commands that are safe for automated execution:

- ✅ `git status` - Check repository status
- ✅ `git log` - View commit history  
- ✅ `git branch -a` - List branches
- ✅ `git diff --name-only` - Show changed files
- ✅ `git config --get` - Read configuration

### Dangerous Commands Blocked

These commands are **NOT** included by default:

- ❌ `git add` - Stage files
- ❌ `git commit` - Create commits
- ❌ `git push` - Push to remote
- ❌ `git pull` - Pull from remote
- ❌ `git merge` - Merge branches
- ❌ `git reset` - Reset repository state
- ❌ `git checkout` - Switch branches/restore files
- ❌ `git rebase` - Rewrite history

### Adding New Commands

When adding new git commands to `.ai.gitallowed`:

1. **Verify safety**: Ensure the command doesn't modify repository state
2. **Use specific patterns**: Avoid overly broad wildcards
3. **Test thoroughly**: Use `imajin limiter test` to verify patterns
4. **Document reason**: Add comments explaining why the command is needed

## Troubleshooting

### Command Blocked Unexpectedly

1. Check current patterns: `imajin limiter list`
2. Test the specific command: `imajin limiter test "your command"`
3. Add pattern to `.ai.gitallowed` if safe
4. Reload CLI or wait 5 seconds for cache refresh

### File Not Found Error

```bash
# Check if .ai.gitallowed exists
imajin limiter status

# Create default file
imajin limiter init
```

### Pattern Not Matching

- Ensure wildcards are used correctly
- Check for typos in command syntax
- Test patterns with `imajin limiter test`
- Remember patterns are case-insensitive

## Implementation Details

### Architecture

```
CommandExecutor
    ├── validateCommand() 
    ├── CommandLimiter
    │   ├── loadAllowedPatterns()
    │   ├── patternMatches()
    │   └── validateCommand()
    └── runCommand()
```

### Files

- `src/utils/CommandLimiter.ts` - Core validation logic
- `src/utils/CommandExecutor.ts` - Secure command execution wrapper  
- `src/commands/system/CommandLimiterCommands.ts` - CLI management commands
- `.ai.gitallowed` - Configuration file with allowed patterns

### Caching

- Pattern file is cached for 5 seconds to improve performance
- Cache is automatically refreshed when file is modified
- Manual refresh not required

## Development

### Adding New Command Execution Points

When adding new places where commands are executed:

1. **Use CommandExecutor**: Always use the secure wrapper
2. **Handle blocked commands**: Check `result.blocked` property
3. **Provide feedback**: Show user why command was blocked
4. **Log appropriately**: Use provided logger for audit trail

### Testing

```typescript
// Test command validation
const limiter = new CommandLimiter();
const result = await limiter.validateCommand('git status');
console.assert(result.allowed === true);

// Test command execution
const executor = new CommandExecutor();
const result = await executor.executeCommand('git', ['status']);
console.assert(result.success === true);
```

### Configuration for Development

For development, you might want to allow additional git commands:

```bash
# Add to .ai.gitallowed for development
git stash *
git stash pop
git checkout -b *
git branch -D *
```

**Note**: Only add these if you understand the security implications.

## Future Enhancements

- [ ] Support for other command types (npm, yarn, etc.)
- [ ] Role-based command permissions
- [ ] Integration with audit logging
- [ ] Real-time pattern validation
- [ ] GUI for pattern management
- [ ] Command usage statistics 