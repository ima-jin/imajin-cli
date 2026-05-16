# imajin-cli
Thin orchestration client for `imajin-ai`.

## Direction reset
`imajin-cli` is being re-positioned as a command UX over `imajin-ai` rather than a framework-agnostic multi-API CLI generator.

The old model (direct Stripe/Contentful/plugin-generation focus) is now considered legacy for this repo direction.

## What this CLI is now
- **Command interface** for operators and orchestrators
- **Structured IO layer** (`--json`, deterministic envelopes)
- **Local execution surface** for scripted and agent-driven workflows
- **Edge orchestration client** backed by `imajin-ai` APIs and tools

## What moved to imajin-ai
- Identity and trust context
- Settlement/business layer concepts
- Workspace/document substrate
- Multi-service backend coordination

## Architecture
1. User or orchestrator calls `imajin-cli`
2. CLI authenticates to `imajin-ai`
3. CLI executes namespaced commands (identity/workspace/commerce/chat/notify/trust/etc.)
4. `imajin-ai` is the system of record and execution backbone

The CLI remains thin: UX, argument handling, transport, envelopes, and automation ergonomics.

## Authentication strategy
### Target (next implementation)
Dedicated `imajin-ai` login/session flow in CLI (challenge/session based), so users authenticate to one backend and then orchestrate commands.

### Explicit non-goal
Per-service API key exposure in CLI env files (Stripe/Contentful/Anthropic/etc.) is no longer the primary operating model.

## Command IA and planning artifacts
The active v2 planning artifacts live in:
- `docs/v2/cli-ia/backend-mapping.top40.json`
- `docs/v2/cli-ia/response-envelopes.schema.json`
- `docs/v2/cli-ia/epic.cli-user-journey-ux.v2.json`
- `docs/v2/cli-ia/ux-ui-plan.v2.json`
- `docs/v2/cli-ia/github-issues.seed.json`

Issue generation scripts:
- `scripts/create-gh-issues-from-seed.ps1`
- `scripts/create-gh-issues-from-backend-mapping.ps1`

## Current implementation posture
- Legacy provider paths (plugin-generation/Stripe/Contentful runtime loading) are being phased out of default bootstrap.
- Work tracking is issue-first in GitHub.
- The next major implementation step is `imajin-ai` auth/session integration and transport wiring for top command namespaces.

## Development
```bash
npm install
npm run build
npm run type-check
npm run cli -- --help
```

## Notes for contributors
- Prioritize `imajin-ai`-backed commands and envelopes over standalone third-party service adapters.
- Keep secrets out of `.env.example`.
- Preserve machine-readable output consistency for orchestrator integrations.

---
Licensed under [.fair](docs/.fair-license.md).