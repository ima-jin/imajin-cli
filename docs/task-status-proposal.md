# Task Status Tracking Enhancement

## Standardized YAML Frontmatter Structure

```yaml
---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-001"
title: "Task Title"
status: "planned"          # Status tracking
priority: "medium"         # Priority level
type: "feature"           # Task type
assignee: ""              # Who's working on it
estimated_effort: "4h"    # Time estimate
created: "2025-08-13"     # Creation date
updated: "2025-08-13"     # Last update
completed_at: ""          # Completion timestamp (when applicable)
dependencies: []          # Array of prerequisite tasks
tags: ["phase-1", "architecture"]  # Categorization tags
---
```

## Standardized Status Values

Based on your existing TaskMigrationCommand mapping:

### Primary Statuses:
- `"planned"` - Ready for implementation, requirements defined
- `"in_progress"` - Currently being worked on
- `"completed"` - Task finished and validated
- `"blocked"` - Cannot proceed due to dependencies or issues
- `"deferred"` - Intentionally postponed

### Priority Levels:
- `"low"` - Nice to have, non-urgent
- `"medium"` - Standard priority (default)
- `"high"` - Important, should be prioritized
- `"critical"` - Urgent, blocking other work

### Task Types:
- `"feature"` - New functionality
- `"bug"` - Fix existing issues
- `"refactor"` - Code improvement without new features
- `"documentation"` - Documentation updates
- `"architecture"` - Architectural changes
- `"testing"` - Test-related work

## Implementation Options

### Option A: Manual Enhancement (Low Friction)
1. Add standardized frontmatter to existing tasks
2. Update validation rules in TaskMigrationCommand
3. Create status update script for batch changes

### Option B: CLI-Based Management (Higher Value)
1. Use existing `npm run cli task` commands
2. Implement status update commands
3. Generate status reports

### Option C: Mixed Approach (Recommended)
1. Standardize frontmatter format
2. Add CLI convenience commands
3. Keep git-based workflow but with better structure

## Status Update Commands

```bash
# View current status
npm run cli task status

# Update individual task
npm run cli task update TASK-001 --status=in_progress --assignee=ryan

# Bulk status operations
npm run cli task validate-all
npm run cli task report --format=table

# Status transitions
npm run cli task complete TASK-001 --notes="Implementation finished"
npm run cli task block TASK-002 --reason="Waiting for TASK-001"
```

## Status Dashboard Example

```
📊 Task Status Summary (24 tasks)
┌─────────────┬───────┬────────────────────────────────────┐
│ Status      │ Count │ Tasks                              │
├─────────────┼───────┼────────────────────────────────────┤
│ ✅ completed │   8   │ TASK-001, TASK-004, TASK-004B...  │
│ 🔄 in_progress │  5   │ TASK-002, TASK-005A, TASK-006... │
│ 📋 planned   │   9   │ TASK-007, TASK-008, TASK-009...   │
│ ⏸️ deferred   │   2   │ TASK-010, TASK-011                │
│ 🚫 blocked    │   0   │                                    │
└─────────────┴───────┴────────────────────────────────────┘

🎯 Next Actions:
- Complete TASK-002 (Business Plan Generation) - in_progress
- Start TASK-007 (Temporal Business Reality) - dependencies met
- Review deferred tasks for re-prioritization
```

## Migration Strategy

### Phase 1: Standardize Existing Tasks
```bash
# Add standard frontmatter to all tasks
node scripts/standardize-task-frontmatter.js

# Validate updated format
npm run cli task validate-all
```

### Phase 2: Enhanced CLI Commands
```bash
# Implement status management commands
npm run cli task status --summary
npm run cli task update TASK-001 --status=completed
npm run cli task report --by-assignee
```

### Phase 3: Dashboard Integration
```bash
# Generate status reports
npm run cli task dashboard --export=html
npm run cli task metrics --show-velocity
```
