# Claude Code Session Logging

## Overview

Claude Code automatically logs all development sessions to local JSON files. This document explains how to access, export, and analyze these logs.

## Where Sessions Are Stored

**Raw Session Data:**
```
C:\Users\[USERNAME]\.claude\projects\D--Projects-imajin-imajin-cli\
```

Each session creates a `.jsonl` file (JSON Lines format) containing:
- User prompts
- Assistant responses
- Tool calls (Read, Edit, Write, Bash, etc.)
- Tool results
- File changes
- Token usage statistics
- Timestamps for everything

**Exported Sessions:**
```
.claude-sessions/
```

This directory (gitignored) stores human-readable exports of your development sessions.

## Quick Start Commands

### List All Available Sessions
```bash
npm run session:list
```
Shows all session IDs, timestamps, line counts, and types (main session vs agent subprocess).

### Export Current Session
```bash
npm run session:export
```
Exports the most recent development session to `.claude-sessions/session-[timestamp].md`

### Generate Summary
```bash
npm run session:summary
```
Creates an overview of all sessions in `claude-sessions-summary.md`

### Export Specific Session
```powershell
.\scripts\claude-session-export.ps1 -SessionId "df69ef12-e92e-4997-bb3e-4357bb466c02"
```

## What Gets Captured

### Full Conversation Context
- Every question you ask
- Every answer Claude provides
- Code reasoning and decision-making
- Development pivots and iterations

### Code Generation History
- All files read
- All edits made (with before/after context)
- Files created
- Code deleted

### Tool Execution
- Bash commands run
- Search operations (Grep, Glob)
- File system operations
- External tool calls

### Performance Metrics
- Input tokens per message
- Output tokens per message
- Cache hits/misses
- Response times

## Use Cases

### 1. Documentation
Use session transcripts to document complex development decisions:
```bash
# Export the session where you implemented the feature
npm run session:export

# Edit the markdown file to add context
# Use it as a basis for technical documentation
```

### 2. Pull Request Descriptions
```bash
# Export the development session
npm run session:export

# Use the conversation flow to write comprehensive PR descriptions
# Include the "why" behind implementation choices
```

### 3. Knowledge Sharing
```bash
# Export a session where you solved a complex problem
npm run session:export

# Share with team members to explain the solution approach
# Preserve institutional knowledge
```

### 4. Debugging
```bash
# List sessions to find when something broke
npm run session:list

# Export the specific session
.\scripts\claude-session-export.ps1 -SessionId "SESSION_ID"

# Review what changed and why
```

### 5. AI Training/Context
```bash
# Export session demonstrating best practices
# Use as examples for future Claude sessions
# Build a knowledge base of successful patterns
```

## Session File Format

### Raw JSONL Format
Each line in the source `.jsonl` file is a complete JSON object:
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Can you help me implement feature X?"
  },
  "timestamp": "2025-01-13T18:30:00.000Z",
  "sessionId": "df69ef12-e92e-4997-bb3e-4357bb466c02",
  "cwd": "D:\\Projects\\imajin\\imajin-cli",
  "gitBranch": "main"
}
```

### Exported Markdown Format
Exported files are formatted for readability:
```markdown
## User
**Time:** 2025-01-13T18:30:00.000Z

Can you help me implement feature X?

---

## Assistant
**Time:** 2025-01-13T18:30:05.000Z
**Tokens:** Input=1234 Output=567

I'll help you implement feature X. Let me start by...

### Tool: Read
\```json
{
  "file_path": "/path/to/file.ts"
}
\```

### Tool Result
\```
[File contents here]
\```
```

## Advanced Usage

### Search Across Sessions
```powershell
# Find all sessions where you worked on a specific feature
Get-ChildItem "C:\Users\$env:USERNAME\.claude\projects\D--Projects-imajin-imajin-cli\*.jsonl" |
  Select-String -Pattern "feature-name" |
  Select-Object -ExpandProperty Path -Unique
```

### Export Multiple Sessions
```powershell
# Export all sessions from the last week
$sessions = Get-ChildItem "C:\Users\$env:USERNAME\.claude\projects\D--Projects-imajin-imajin-cli\*.jsonl" |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }

foreach ($session in $sessions) {
    .\scripts\claude-session-export.ps1 -SessionId $session.BaseName -OutputPath ".claude-sessions\$($session.BaseName).md"
}
```

### Session Statistics
```powershell
# Count total lines across all sessions
$total = (Get-ChildItem "C:\Users\$env:USERNAME\.claude\projects\D--Projects-imajin-imajin-cli\*.jsonl" |
  ForEach-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines } |
  Measure-Object -Sum).Sum

Write-Host "Total conversation lines: $total"
```

## Privacy Considerations

### What to Review Before Sharing
- API keys or credentials in terminal output
- Internal implementation details
- Private business logic
- Personal information

### Gitignore Protection
The `.claude-sessions/` directory is automatically excluded from git to prevent accidental commits.

### Manual Cleanup
```bash
# Remove old session exports
rm .claude-sessions/session-2025*.md

# Keep only the last 10 sessions
ls -t .claude-sessions/*.md | tail -n +11 | xargs rm
```

## Integration with imajin-cli

These session logs could be enhanced to:

1. **Integrate with imajin logging system** - Store session references in `.imajin/sessions/`
2. **Add session metadata** - Track which features were built in which sessions
3. **Session replay** - Recreate context from previous sessions
4. **AI-powered session search** - Use LLMs to search session content semantically
5. **Auto-documentation** - Generate docs automatically from development sessions

## Troubleshooting

### Session Not Found
```bash
# Verify the session directory exists
ls "C:\Users\$env:USERNAME\.claude\projects\D--Projects-imajin-imajin-cli\"
```

### Export Fails
```bash
# Check PowerShell execution policy
Get-ExecutionPolicy

# If restricted, run scripts with:
powershell -ExecutionPolicy Bypass -File scripts/claude-session-export.ps1 ...
```

### Large Session Files
If sessions are very large (1000+ lines), consider:
- Exporting specific date ranges
- Using filters to extract only relevant parts
- Compressing old sessions

## Future Enhancements

Potential improvements to the session logging system:
- [ ] HTML export with syntax highlighting
- [ ] Session diffing (compare two sessions)
- [ ] Search functionality within exported sessions
- [ ] Auto-tagging sessions by feature/topic
- [ ] Integration with PR creation workflow
- [ ] Session analytics dashboard
- [ ] Cloud backup/sync options

## Resources

- **Scripts:** `scripts/claude-session-export.ps1`, `scripts/export-current-session.ps1`
- **Documentation:** `.claude-sessions/README.md`
- **Source data:** `C:\Users\[USERNAME]\.claude\projects\D--Projects-imajin-imajin-cli\`
- **Exports:** `.claude-sessions/`
