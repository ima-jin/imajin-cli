# Phase 4 – MCP Integration

Goal: expose imajin-generated CLIs through MCP so agents can discover and invoke business-context commands with guarded, auditable execution.

## Deliverables
- MCP registry emitted per build (example: `dist/mcp/registry.json`; template in `docs/mcp/registry.example.json`).
- MCP server/adapters for each generated CLI (Stripe, Contentful, Cloudinary, LocalFile).
- Schemas for each tool input/output, aligned with CLI JSON output shape.
- Structured logging/health endpoints for MCP servers to support agent observability.

## Approach
1) **Generator hook**  
   - Add `scripts/mcp/emit-registry.ts` (or similar) that reads build outputs (version, checksums, adapter paths) and writes `dist/mcp/registry.json`.  
   - Ensure the generator is invoked in the build/publish pipeline so the registry matches shipped binaries.

2) **Adapter pattern**  
   - For each CLI, provide an MCP server wrapper (e.g., `adapters/mcp/stripe-server.js`) that shells to the CLI or calls directly into the command layer.  
   - Surface tool schemas (inputs/outputs) via MCP tool descriptors; reuse CLI validation where possible to avoid drift.

3) **Schema source of truth**  
   - Keep input/output schemas in `schemas/<service>/` and reference them in the registry.  
   - Align output with the structured JSON already emitted by the CLI (`success`, `data`, `metadata`, `error`).

4) **Auth and secrets**  
   - Use env/scoped tokens per server entry; avoid duplicating secrets across servers.  
   - Document which credentials are required per service in the registry and adapter README.

5) **Ops and safety**  
   - Add health endpoints for MCP servers and record expected versions in the registry.  
   - Emit structured logs with tool name, version, duration, and trace IDs.  
   - Apply rate-limit hints in the registry (`rateLimits` block) for agent-side courtesy.

## Task list
- [ ] Add registry generator (scripts) and wire into build/publish.
- [ ] Implement MCP adapters per service (Stripe, Contentful, Cloudinary, LocalFile).
- [ ] Generate/confirm schemas for tool inputs/outputs and link them in the registry.
- [ ] Add health/logging defaults to adapters.
- [ ] Document agent bootstrap: where to find the emitted registry for a given build.

## References
- Canonical dev/arch guidance: `CLAUDE.md`, `README.md`.
- Registry template: `docs/mcp/registry.example.json`.
- Services present today: `src/services/{stripe,contentful,cloudinary,localfile}`.
