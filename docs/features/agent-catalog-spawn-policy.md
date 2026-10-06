# AgentCatalog и единая политика spawnable agents

> Roadmap id: `agent-catalog-spawn-policy` — status is tracked in `docs/roadmap.json`.

## Description
The set of roles that may be spawned as subagents is expressed once, in
`AgentCatalog` (`packages/opencode/src/nocowboy/agent/catalog.ts`), and consumed by
both sides of the task tool:

- **listing** — `tool/registry.ts` `describeTask` builds the "available agent
  types" block from `AgentCatalog.spawnable(agents.list())`, then applies the
  caller's `task` permission deny.
- **executor** — `KiloTask.validate` throws when
  `AgentCatalog.isSpawnable` rejects the requested role.

Previously the listing filtered `mode !== "primary"` inline while the executor
validated nothing, so the two could drift: the model could spawn `auto` (the
primary dispatcher) even though it was never listed.

Policy: a role is spawnable iff it is not primary-only and is not in
`NEVER_SPAWNABLE` (`auto`). So `worker`/`reviewer`/`planner`/`nocowboy`
(mode `all`) remain spawnable — `nocowboy` is a companion, not a closed
chat-only profile — while `auto` never is.

## Key files
- `packages/opencode/src/nocowboy/agent/catalog.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/nocowboy/tool/task.ts`

## Verification
- `bun test test/nocowboy/agent-catalog.test.ts` — 6 pass (policy + single-source
  guarantee: a role is listed iff the executor would allow it).
- `bun test test/tool/task.test.ts` — 25 pass (2 new: description omits `auto`
  and lists `worker`/`reviewer`; execute rejects spawning `auto`).
- `bun run typecheck` — clean.
