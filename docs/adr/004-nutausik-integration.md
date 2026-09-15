# ADR-004: NUTAUSIK stays a separate project connected over MCP

**Status:** Accepted
**Date:** 2026-09-15
**Author:** NoCowboy Architect

## Context

NUTAUSIK is the memory and task engine (tasks, epics, stories, memory, decisions,
handoffs, gates). The owner asked whether it should remain a **separate project
connected over MCP** or be **embedded into the harness**, with one hard
constraint: we routinely run **several NoCowboy instances at once** over different
projects, and the developer experience must be the best possible.

### What exists today (verified 2026-09-15)

| Fact | Evidence |
|---|---|
| NUTAUSIK runs as an MCP server over HTTP | `nutausik-client.ts`: `NUTAUSIK_MCP_URL` defaults to `http://127.0.0.1:9210/mcp` |
| The harness auto-starts it on session creation | `nutausik-auto-wire.ts` → `McpLifecycle.startOne("nutausik", …)` |
| All MCP traffic is centralised in one client | `nutausik-client.ts` (`hasNutausik`, `fireTool`, `callTool`, `autoCreateTask`, `autoEndSession`) |
| The server is live and serves the full tool set | `tools/list` at `127.0.0.1:9210/mcp` returned the complete NUTAUSIK tool catalogue |
| Integration is already an MCP boundary, not an import | no `import … from "nutausik"` anywhere in the harness |

So the **separate-over-MCP model is already the implemented reality**; this ADR
records the decision to keep it and why, rather than re-architecting.

## Decision

**Keep NUTAUSIK as a separate project, connected over MCP.** Do not embed it.

## Rationale

1. **Multiple instances must share one brain.** With an MCP server there is one
   shared store: a task created in instance A is visible in instance B, memory
   written while working on project X is available while working on project Y.
   Embedding would give every instance its own store — memory and tasks would
   fragment per process, which is the opposite of what we want.
2. **Independence is a feature, not overhead.** NUTAUSIK can be deployed,
   restarted and upgraded on its own cadence without rebuilding the harness.
   Its database migrations never risk the agent runtime.
3. **The boundary already exists and is clean.** One client module, one URL, a
   stable JSON-RPC contract. Embedding would couple the agent loop to NUTAUSIK
   internals (schema, storage, Effect services) for no functional gain.
4. **Failure isolation.** If NUTAUSIK is down, the client degrades to no-ops
   (`hasNutausik() === false`) and the agent keeps working. Embedded code paths
   would be far harder to degrade gracefully.

## Consequences

- **A running server is required for full functionality.** Mitigated by
  auto-start (`ensureNutausikRunning`) and graceful degradation when absent.
- **Version skew is possible** between the harness and a running NUTAUSIK.
  Treat the MCP tool schemas as the contract; unknown tools must not crash the
  client.
- **Single point of failure.** One NUTAUSIK process serves all instances. If
  contention or latency becomes measurable, the fix is caching on the client —
  **not** embedding the store.
- The client currently uses raw `fetch()`; migrating it to the Effect MCP client
  framework is a future cleanup, not a change of this decision.

## What would change this decision

- A measured need for **per-instance isolated** memory (we do not have one;
  we want the opposite).
- NUTAUSIK latency on the critical path large enough to hurt the agent loop even
  with caching.
- A hard requirement to ship the harness as a single self-contained binary with
  no external service. (Currently the harness already auto-starts the server, so
  this is a packaging question, not an architectural one.)
