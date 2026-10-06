# Единый MemoryAdapter — статусы, explicit namespace, shutdown flush

> Roadmap id: `memory-adapter-unified` — status is tracked in `docs/roadmap.json`.

## Description
All NUTAUSIK/PM memory communication now goes through one transport,
`MemoryAdapter` (`packages/opencode/src/nocowboy/memory-adapter.ts`). It replaces
the duplicated raw `fetch` in `nutausik-client.ts` and the PM path, which each
swallowed failures into an empty string, and the session lifecycle's
shell/python/curl PostToolUse hook that wrote a literal endpoint bypassing the
client/env override.

- **status** — `available | degraded | unavailable`, observable via
  `MemoryAdapter.status()`; updated by every probe and call.
- **errors** — a structured `MemoryError` with a code (`transport`, `timeout`,
  `http`, `rpc`, `invalid-response`, `bad-request`) instead of `""`.
- **explicit context** — `projectDir` is required and `sessionID` (where owned)
  travels in every JSON-RPC argument, so a shared server cannot mix two projects
  or parallel child sessions.
- **bounded flush** — in-flight calls are tracked per
  `${projectDir}\0${sessionID}` namespace; `MemoryAdapter.flush({ timeoutMs })`
  drains them on shutdown from `NocowboyCli.shutdown()`, so session-end writes
  are not lost fire-and-forget.

### Tool-call logging: intentional removal
The shell PostToolUse logging hook was the only writer of per-tool NUTAUSIK logs,
and those logs had no consumer. Rather than migrate a capability nothing read to
a per-tool network call through the adapter, the capability is **deliberately
dropped**: the `logToolCall` helper was deleted (dead code). Re-adding per-tool
logging is a future feature that must ship with a real consumer and go through
`MemoryAdapter` with explicit project/session - it will not be re-added as a
shell endpoint.

## Key files
- `packages/opencode/src/nocowboy/memory-adapter.ts`
- `packages/opencode/src/nocowboy/nutausik-client.ts`
- `packages/opencode/src/nocowboy/nutausik-auto-wire.ts`
- `packages/opencode/src/nocowboy/cli/setup.ts`

## Verification
- `bun test test/nocowboy/memory-adapter.test.ts` — 15 pass (status transitions,
  structured error codes, explicit project/session in the payload, namespace
  isolation, bounded flush, plus source guards that the shell endpoint is gone
  and the client has no raw fetch).
- `bun test test/nocowboy/nutausik-client.test.ts` — 2 pass (probe caching
  preserved).
- `bun run typecheck` — clean.
