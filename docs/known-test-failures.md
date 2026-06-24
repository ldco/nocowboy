# Known Test Failures — NoCowboy

**Date:** 2026-06-24
**Status:** Documented, not ignored. Requires test harness infrastructure.

## Summary

20 tests fail across 8 test files. All failures share the same root cause:
**missing Effect runtime context** — Session, Provider, LLM, Config, MCP servers.

The test files themselves are correct. They need a running server environment
(`testEffect` / `it.live()` with full Effect context providers).

| Test file | Fail count | Missing context |
|---|---|---|
| `config-validation.test.ts` | 4 | Config fixture (.nocowboy dir not detected) |
| `global-config-refresh.test.ts` | 3 | Session + InstanceRef |
| `session-processor-empty-tool-calls.test.ts` | 6 | Session + Provider + LLM |
| `session-list.test.ts` (NoCowboy Session.list) | 1 | Pre-seeded DB with session data |
| `provider-list-failed-state.test.ts` (releases) | 1 | Provider init in release mode |
| `indexing-worker*.test.ts` (2 files) | 2 | `@nocowboy/indexing/engine` in Web Worker |
| `skill-slash-commands.test.ts` | 1 | Running MCP servers |
| `instance-dispose.test.ts` (same-directory) | 1 | Full Effect runtime |

## Root cause

These are the **same `testEffect` / `it.live()` infrastructure gaps** documented
in `docs/archive/plans/opentui-stabilization-2026-06-23.md` (342 pre-existing failures).

## What's needed

A **test server harness** that starts the full Effect runtime with:
- `Session.context` — in-memory database with test fixtures
- `Provider.context` — mock LLM provider
- `Config.context` — test-specific config
- MCP test server process(es)
- Indexing worker mock
- Pre-seeded session data

Estimated effort: 3-5 hours.

## What's NOT needed

- Code changes to the source files under test (the tests pass in live environments)
- Test rewrites (the assertions are correct)
- Skipping/deleting tests (they test real behavior)

## Roadmap

| Task | Priority | Effort |
|---|---|---|
| Create `TestServer` harness with Effect context providers | P1 | 3-5 hours |
| Add pre-seeded SQLite fixture for session tests | P2 | 1 hour |
| Add MCP test server process for skill tests | P2 | 2 hours |
