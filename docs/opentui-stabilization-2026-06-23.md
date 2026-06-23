# OpenTUI Version Stabilization — 2026-06-23

Dogfooding session. Resolved the `@opentui/core` / `@opentui/solid` version split that the entire nocowboy TUI render layer sat on. Also fixed LanceDB native binary resolution and renamed the Kilo-origin env var.

## Dependency Change

| Package | Before | After | Mechanism |
|---|---|---|---|
| `@opentui/core` | `0.2.11` (catalog) → overridden to `0.4.1` | `0.4.1` (catalog) | Removed root overrides hack |
| `@opentui/solid` | `0.2.11` (hard-pinned in opencode) | `0.4.1` (catalog) | Switched to catalog: |
| `@opentui/keymap` | `0.2.11` (catalog) | `0.4.1` (catalog) | Catalog bump |
| `solid-js` | `1.9.12` (catalog) + `1.9.13` (root dep) | `1.9.12` (catalog, unified) | Root dep changed to catalog: |
| `@opentui/core-linux-x64` | Manually pinned in root deps | Removed | Relies on core's optionalDependencies |

**Removed:** root `overrides { "@opentui/core": "0.4.1" }` — the glue hack that forced solid 0.2.11 to use core 0.4.1.

## Source Changes

### Solid 0.4.1 JSX children type strictness (5 files)

Solid 0.4.1 no longer accepts `(() => Element) | undefined` or `unknown` as JSX children. Fixed:

| File | Line | Before | After |
|---|---|---|---|
| `ui/dialog-prompt.tsx` | 60 | `{props.description}` | `{props.description?.()}` |
| `feature-plugins/system/session-v2.tsx` | 348 | `{props.message.error}` | `{props.message.error?.message}` |
| `routes/session/index.tsx` | 1755 | `{props.message.error?.data.message}` | `{String(props.message.error?.data?.message ?? "")}` |

### `completed` union narrowing (same file, 3 sites)

Message time type is `{ created: number } | { created: number; completed?: number }`. Direct `.completed` access fails on the first variant. Used `'completed' in t` narrowing:

| Line | Before | After |
|---|---|---|
| 288 | `msgs[i].time.completed` | `'completed' in msgs[i].time && msgs[i].time.completed` |
| 1379 | `m?.time.completed` | `'completed' in m.time && m.time.completed` (wrapped in `m &&`) |
| 1439 | `!message.time.completed` | `!('completed' in message.time && message.time.completed)` |

### Build script null narrowing

| File | Before | After |
|---|---|---|
| `script/build.ts` | `.filter(Boolean)` | `.filter((x): x is NonNullable<typeof x> => !!x)` |

## LanceDB Native Binary

All three platform binaries added as hard deps in `packages/nocowboy-indexing/package.json` (gitignored — nocowboy-specific package excluded from upstream fork):

| Binary | Platform |
|---|---|
| `@lancedb/lancedb-linux-x64-gnu` | Linux x64 (glibc) |
| `@lancedb/lancedb-linux-arm64-gnu` | ARM64 Linux (Graviton, RPi 5) |
| `@lancedb/lancedb-darwin-arm64` | macOS M1/M2/M3 |

The deprecated Kilo env var `KILO_LANCEDB_PATH` was renamed to `NOCOWBOY_LANCEDB_PATH` across all source files and tests:

| Location | Old name | New name |
|---|---|---|
| `src/nocowboy/lancedb.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |
| `src/nocowboy/indexing-worker-client.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |
| `src/nocowboy/indexing-worker.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |
| `test/nocowboy/lancedb-runtime.test.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |
| `packages/nocowboy-indexing/src/.../lancedb-loader.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |
| `packages/nocowboy-indexing/test/.../lancedb-loader.test.ts` | `KILO_LANCEDB_PATH` | `NOCOWBOY_LANCEDB_PATH` |

`dev.sh` exports `NOCOWBOY_LANCEDB_PATH` as a `file://` URL pointing to the installed module.

## Test Results

**Related to our changes: 4 failures → 0 failures** (all LanceDBRuntime, fixed by the env var rename in tests)

**Pre-existing (342 failures, unchanged by our work):**

| Category | Count | Nature |
|---|---|---|
| HttpApi (server integration) | ~130 | Need running `kilo serve` + SDK backend; skip in unit test context |
| workspace / session / mcp / pty | ~80 | Server-dependent integration tests |
| ModesMigrator / McpMigrator / IgnoreMigrator | ~20 | Config migration tests — expect specific file/format states |
| KilocodeConfigInjector / config / ConfigValidation | ~25 | Config parsing — expect specific env/config setups |
| skill | ~15 | Plugin integration — depends on installed skills |
| NocowboyPaths / worktree | ~13 | Path resolution — expects git worktree setup |
| provider / experimental / other | ~60 | Various pre-existing environment-dependent tests |

None of these failures involve OpenTUI imports or the TUI render path.

## Commits

```
2c65dce64 fix(cli): align OpenTUI to coherent 0.4.x line, fix LanceDB native dep
eca08186a fix: rename KILO_LANCEDB_PATH to NOCOWBOY_LANCEDB_PATH in tests
```

## Open Items

- `packages/nocowboy-indexing/` is gitignored (line 74 of `.gitignore`). Its package.json changes are local-only. If this package should become tracked, the `.gitignore` entry needs to be removed.
- The 342 pre-existing test failures should be triaged separately — most require running servers, config fixtures, or platform-specific infrastructure not present in the dev environment.
