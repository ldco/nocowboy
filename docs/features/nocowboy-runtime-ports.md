# @nocowboy/runtime — портовое ядро

> Roadmap id: `nocowboy-runtime-ports` — status is tracked in `docs/roadmap.json`.

## Description
A new workspace package, `@nocowboy/runtime` (`packages/nocowboy-runtime`),
holds the engine's domain contracts as **seven ports**. It imports nothing from
`@/session`, `@tui`, or the internal provider services — the only dependency is
`effect`, used for the port schemas. The engine adapts to these ports; the core
never reaches into the engine.

| Port | Contract |
| --- | --- |
| `AgentCatalog` | spawnable-roles policy + `AgentCatalogEntry`; `AgentCatalogPort` roster |
| `PolicyPort` | `PolicyRule` / `PolicyDecision` permission contract |
| `SessionPort` | `SessionContext` (directory / sessionID / agent) |
| `EditPort` | `EditPlan` / `EditBlock` / `EditErrorCode` SEARCH-REPLACE contract |
| `ModelPort` | `ModelRef` role→model contract |
| `MemoryPort` | `MemoryResult` / `MemoryCallContext` / `MemoryStatus` transport contract |
| `TelemetryPort` | `TelemetryEvent` |

`index.ts` is a pure `export *`; a unit test scans the real import/export
specifiers of every source file to enforce the no-engine-internals rule.

## Key files
- `packages/nocowboy-runtime/src/*.ts`
- `packages/nocowboy-runtime/package.json`, `tsconfig.json`
- `packages/opencode/test/nocowboy/runtime/*.test.ts`

## Verification
- `bun test test/nocowboy/runtime` — 19 pass (schema round-trip for every port,
  agent-catalog policy, no-forbidden-imports scan).
- `bun run typecheck` — clean (turbo now includes `@nocowboy/runtime`).
