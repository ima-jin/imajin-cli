---
# Metadata
title: "34 Task Management for V2 - Claude Code Orchestration"
created: "2025-11-24T01:00:00Z"
updated: "2025-11-24T01:00:00Z"
---

# 📋 Task Management for V2: Claude Code as Orchestrator

**Status:** ✅ **APPROVED**
**Context:** Claude Code orchestrates, not CLI
**Key Insight:** I (Claude) read/write markdown directly via tools

---

## THE CORRECT INTERACTION MODEL

### ❌ Wrong (What I Initially Proposed)

```
User → CLI dev:next → CLI tells Claude → Claude tells User
```

**Problem:** CLI can't "push" info to Claude Code. I'd have to manually call it.

---

### ✅ Right (Actual Workflow)

```
User → Claude Code (me) → Read task files → Analyze → Tell user
```

**Solution:** I read tasks directly, no CLI needed for orchestration.

---

## SYSTEM ARCHITECTURE

### Data Layer: Git + Markdown

```
docs/tasks/
├── 01-project-setup.md
├── 02-tooling-poc.md
├── 03-stripe-generation.md
└── 04-self-extension-migration.md
```

**Each task has YAML frontmatter:**

```yaml
---
id: stripe-generation
status: ready
priority: high
estimate: 3d
depends-on: [project-setup]
blocks: [self-extension-migration]
---

# Stripe Service Generation
[Task details in markdown...]
```

---

### Orchestration Layer: Claude Code

**What I (Claude) do automatically:**

#### When you ask "What's next?"

1. **Glob** `docs/tasks/*.md` → Find all tasks
2. **Read** each file → Parse frontmatter
3. **Analyze** dependencies → Build graph
4. **Filter** `status: ready` → Find actionable tasks
5. **Present** recommendations with reasoning

#### When you say "Start X"

1. **Read** task file
2. **Edit** frontmatter: `status: in-progress`, `started: DATE`
3. **TodoWrite** to track in session
4. **Begin** implementation

#### When you say "X is done"

1. **Edit** task file: `status: done`, `completed: DATE`, `actual: Xd`
2. **Read** all tasks → Find what's now unblocked
3. **Analyze** estimation accuracy
4. **Suggest** next task

---

### Query Layer: CLI (Optional)

**IF** you want CLI helpers, they're **read-only queries**:

```bash
# CLI reads markdown, outputs structured data
imajin-cli dev:status --json
{
  "in_progress": ["stripe-generation"],
  "ready": ["contentful-generation"],
  "blocked": ["self-extension-migration"]
}
```

**Then I (Claude) can call this via Bash tool instead of parsing markdown.**

**But parsing markdown directly works fine too!**

---

## TASK FILE TEMPLATE

```markdown
---
# Identity
id: task-name-kebab-case
title: "Human Readable Title"

# Status & Scheduling
status: backlog  # backlog, ready, in-progress, blocked, done, cancelled
priority: medium  # critical, high, medium, low
started: null     # YYYY-MM-DD when work begins
completed: null   # YYYY-MM-DD when done

# Effort Estimation
estimate: 3d      # Initial estimate
actual: null      # Actual time spent (filled when done)
confidence: 70%   # Optional: estimation confidence

# Dependencies
depends-on: []    # Must complete before this starts
blocks: []        # This blocks these tasks
related: []       # Related but not blocking

# Context
phase: foundation  # foundation, services, novel-features, polish
category: setup    # setup, generation, migration, testing
tags: [typescript, cli, tooling]

# Learning (for future estimation)
similar-to: []        # Similar past tasks
complexity: medium    # low, medium, high, very-high
risk: low            # low, medium, high
---

# Task Title

## Goal
One sentence: what success looks like

## Context
Why this task matters, how it fits into v2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Plan
1. Step 1
2. Step 2
3. Step 3

## Notes
(Claude Code adds notes here as we work)

## Retrospective
(Filled when task is done)

### What Went Well
-

### What Took Longer
-

### Lessons Learned
-

### Estimation Accuracy
Estimate: Xd | Actual: Yd | Variance: Z%
```

---

## WORKFLOW EXAMPLES

### Example 1: "What should I work on next?"

**You:** What should I work on next?

**Me (Claude Code):**

<function_calls>
<invoke name="Glob">
<parameter name="pattern">docs/tasks/*.md