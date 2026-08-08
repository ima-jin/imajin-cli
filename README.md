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
### Current
Dedicated `imajin-ai` login/session flow is implemented in the CLI (challenge/session based via `ImajinAiSessionService`), so users authenticate to one backend and then orchestrate commands.

```bash
# Set the imajin-ai base URL (must include the /auth path segment)
export IMAJIN_AI_BASE_URL=https://jin.imajin.ai/auth

# Request a login challenge, then verify it to store a session
imajin auth imajin-ai challenge alice
imajin auth imajin-ai login --challenge-id <id> --signature <hex>

# Or sign the challenge in-process from an exported identity key file
# (never prints or logs the private key material):
imajin auth imajin-ai login --handle alice --key-file ~/.imajin/identity.json

# Check session status, or clear it
imajin auth imajin-ai status
imajin auth imajin-ai logout
```

`--key-file` expects a JSON file with a hex-encoded 32-byte Ed25519 private key/seed
under `privateKey` (or `seed`), e.g.:

```json
{
  "privateKey": "<64-hex-char Ed25519 seed>",
  "did": "did:key:z..."
}
```

This is the same shape used by `~/.imajin/identity.json` elsewhere in the CLI (see
`imajin vault set`/`imajin vault get`). `--key-file` only works together with `--handle`
(not `--challenge-id`), since signing requires the raw challenge text that is only
returned when the CLI requests a fresh challenge.

## Workspace command examples
```bash
imajin workspace get --path /docs/notes/today.md
imajin workspace put --path /docs/notes/today.md --content-file ./today.md --content-type text/markdown
imajin workspace search --query "launch checklist" --path /docs --limit 10
```

## Profile command examples
```bash
imajin profile get --id did:imajin:alice
imajin profile search --query "alice" --limit 10
imajin profile create --handle alice --display-name "Alice" --bio "Traveler profile"
imajin profile update --id alice --bio "Updated bio"
imajin profile handle check --handle alice
imajin profile inference toggle --enabled true
```

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
- `imajin-ai` auth/session integration is implemented; transport wiring for remaining top command namespaces continues.

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