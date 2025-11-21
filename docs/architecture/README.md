# Architecture Documentation

This directory contains architectural decision records and system design documentation for imajin-cli.

## Core Documents

### [AI_SAFE_INFRASTRUCTURE.md](./AI_SAFE_INFRASTRUCTURE.md) ⭐ **START HERE**

**Why EventManager is complex and why it matters.**

Essential reading for understanding:
- Why generated CLIs use event-driven architecture
- How AI agents interact with distributed systems safely
- Why simple EventEmitter would break distributed operations
- The relationship between imajin-cli and imajin-os ecosystem

**Topics covered:**
- Declarative command patterns (AI runs ONE command → infrastructure handles ALL side effects)
- Dead Letter Queue (network failures don't lose data)
- Event subscribers (services react automatically)
- Middleware pipeline (auth, validation automatic)
- Priority system (critical events preempt normal operations)
- Distributed systems context (peer-to-peer LED device networks)

## Quick Navigation

**Understanding the System:**
1. Read [AI_SAFE_INFRASTRUCTURE.md](./AI_SAFE_INFRASTRUCTURE.md) - architectural rationale
2. See [../CLAUDE.md](../../CLAUDE.md) - development guide with architectural context
3. Review [EventManager source](../../src/core/events/EventManager.ts) - implementation

**Key Patterns:**
- **Commands:** [BaseCommand.ts](../../src/core/commands/BaseCommand.ts) - emit events, don't call services
- **Subscribers:** [Event.ts](../../src/core/events/Event.ts#IEventSubscriber) - react to multiple events
- **Middleware:** [EventEmitter.ts](../../src/core/events/EventEmitter.ts) - cross-cutting concerns

## When to Read These Docs

**You should read AI_SAFE_INFRASTRUCTURE.md if:**
- ✅ You're wondering why EventManager is so complex
- ✅ You're implementing new CLI commands
- ✅ You're adding event subscribers
- ✅ You're integrating with imajin-os devices
- ✅ You're building distributed systems features
- ✅ You're writing tests for event-driven code

**You can skip it if:**
- ❌ You're just fixing a typo
- ❌ You're updating dependencies
- ❌ You're working on pure utility functions

## Related Documentation

- **Project Overview:** [README.md](../../README.md)
- **Development Guide:** [CLAUDE.md](../../CLAUDE.md)
- **Ecosystem Context:** [imajin-os/docs/governance/ECOSYSTEM.md](../../../imajin-os/docs/governance/ECOSYSTEM.md)
- **Phase 2 Progress:** [docs/prompts/README.md](../prompts/README.md)

## Architecture Principles

1. **AI-Safe by Default** - Infrastructure prevents inconsistent state
2. **Declarative over Imperative** - AI declares intent, infrastructure executes
3. **Event-Driven** - Loose coupling via events, not direct service calls
4. **Fault-Tolerant** - Network failures don't cause data loss (DLQ)
5. **Distributed-First** - Designed for peer-to-peer device networks

---

**Last Updated:** 2025-11-21
**Maintainer:** imajin-cli team
