# @nocowboy/engine-adapter — привязка портов

> Roadmap id: `engine-adapter-package` — status is tracked in `docs/roadmap.json`.

## Description
`@nocowboy/engine-adapter` (`packages/nocowboy-engine-adapter`) binds the
`@nocowboy/runtime` ports to the engine's concrete services. It depends only on
`@nocowboy/runtime`; the engine supplies the primitives, so the package stays
free of engine internals.

- `createSpawnPolicy(listAgents)` — the spawn-policy view (delegates to the
  runtime `AgentCatalog`), used by both the task listing and the executor.
- `createEngineAdapter({ listAgents, evaluatePolicy, session })` — returns
  `{ spawn, agentCatalog, policy, session }`, binding the ports to injected
  engine functions.

Engine-side, the single entry point is
`packages/opencode/src/nocowboy/engine-adapter.ts` (`engineAdapter(...)` /
`spawnPolicy(...)`), built from `Agent.Service` + `Permission.evaluate`.
Both `tool/registry.ts` (listing) and `KiloTask.validate` (executor) go through
it, so there are no parallel callback paths and the listing/execution can never
drift. `nocowboy/agent/catalog.ts` is now a re-export of the runtime policy
(no duplicate implementation).

## Key files
- `packages/nocowboy-engine-adapter/src/*.ts`
- `packages/opencode/src/nocowboy/engine-adapter.ts`
- `packages/opencode/src/tool/registry.ts`, `packages/opencode/src/nocowboy/tool/task.ts`
- `packages/opencode/test/nocowboy/engine-adapter/*.test.ts`

## Verification
- `bun test test/nocowboy/engine-adapter` — 6 pass (spawn policy, adapter binding).
- `bun test test/tool/task.test.ts` — vertical works through the adapter.
- `bun run typecheck` — clean (11 packages, engine-adapter included).
