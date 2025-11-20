# AGENTS.md

Common orientation for any AI/code agent working in this repo. The canonical, detailed playbook is `CLAUDE.md`—start there even if you are not Claude.

## Primary references
- `CLAUDE.md` — development commands, architecture map, and workflow guidance.
- `README.md` — product overview and current implementation status.
- `docs/` — deep dives; notable subfolders include `docs/agents/` (strategy briefs), `docs/prompts/` (prompt-based workflows), and `docs/security/`.

## Quick expectations
- Treat `CLAUDE.md` as the source of truth for how to build, test, and navigate the codebase.
- Prefer the npm scripts in `CLAUDE.md` for dev/build/test (`npm run dev`, `npm run build`, `npm test`, `npm run lint`, etc.).
- Keep changes aligned with the business-context-driven CLI generation model described in `README.md` and `CLAUDE.md`.
- When adding or updating prompts or automation, check `docs/prompts/README.md` and existing agent briefs under `docs/agents/` to stay consistent.

If repository guidance diverges, defer to `CLAUDE.md` first, then `README.md`, then the relevant doc in `docs/`.
