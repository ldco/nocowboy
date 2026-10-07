# Контрактные тесты миграции движка

> Roadmap id: `migration-contract-tests` — status is tracked in `docs/roadmap.json`.

## Description
`packages/opencode/test/nocowboy/contracts/` is a migration gate: a minimal set of
scenarios pinned as executable contract tests that must keep passing across a
future engine rewrite. Each test asserts the nearest pure/observable seam; the
end-to-end variants stay in their focused suites.

| # | Scenario | Contract |
| --- | --- | --- |
| 01 | worker child — fg/bg/resume/cancel/timeout; long tool/permission wait is not a stall | `ToolBusy` counts nested in-flight tools per session; watchdog timeouts/heartbeat |
| 02 | planner/reviewer mutation policy (incl. YOLO, delegation) | edit + mutating bash denied by a hard-ruleset ceiling; YOLO is the lift; delegation forwards parent edit denies |
| 03 | two parallel child costs; resumed child not double-counted | `childCost` sums assistant costs; read, not accumulated |
| 04 | RU/EN switch; two projects, different locale | independent string tables; pure locale lookup |
| 05 | edit round-trip | duplicate/batch/stale/partial (EditPort) + UTF-8 BOM/CRLF/windows-1251 (Encoding) |
| 06 | memory unavailable/recovered + namespace isolation | `MemoryAdapter` status transitions; per project/session namespaces |
| 07 | compaction with active goal/checkpoint | `computeBoundary`; goal persistence (unbounded roadmap goal; restored after restart) |
| 08 | mouse click/focus/selection/navigation | keybind data surface is well-formed/unique; prompt focus/selection capture (never unsuspends the keymap) |

## Key files
- `packages/opencode/test/nocowboy/contracts/*.contract.test.ts`

## Verification
- `bun test test/nocowboy/contracts` — 31 pass across 8 files.
- `bun run typecheck` — clean.
- The suite is registered as a roadmap verify directive, so it gates future work.
