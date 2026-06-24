# NoCowboy — Performance Optimization

**Date:** 2026-06-24 | **Status:** Analysis

## Current state

| Metric | Value | Problem? |
|---|---|---|
| Binary size | 155 MB (105 MB code + 50 MB tree-sitter WASMs) | ❌ Huge for terminal app |
| WASM parsers | 37 languages | ❌ All 37 always loaded |
| First-run migration | 30-90 seconds (21 migrations) | ❌ Blocks new users |
| MCP start (1 server) | 30+ seconds (DB migration overhead) | ❌ |
| MCP start (11 servers) | ~60 seconds | ❌ |
| Subsequent runs | 3-5 seconds | ✅ OK |
| Memory (all MCP + indexing) | ~300-500 MB estimate | ⚠️ High |

## P0 — Immediate wins (low effort, high impact)

### 1. Lazy-load tree-sitter WASMs 🟢

**Current:** All 37 WASM files (50 MB) are shipped in platform package and loaded at startup.
**Fix:** Load only parsers matching the current project's languages. Detect from `package.json`/`go.mod`/`Cargo.toml`. Fall back to top 5 (TS, JS, JSON, HTML, CSS).

**Est. savings:** 40-45 MB binary size reduction + faster startup
**Effort:** Medium (need to detect project languages + dynamic import)

### 2. Pre-seed DB migration 🟢

**Current:** 21 migrations run on first start, 30-90 seconds.
**Fix:** Ship a pre-migrated database template (`nocowboy.db.template`) in the binary. On first run, copy the template instead of running all migrations. Only run migrations added AFTER the template.

**Est. savings:** First run 30-90s → 1-2s
**Effort:** Medium (need pre-seeded DB + version tracking)

### 3. Bun `--minify` flag 🟢

**Current:** Build uses `bun build --compile` without `--minify`.
**Fix:** Add `--minify` flag. Removes whitespace, shortens identifiers, dead code elimination.

**Est. savings:** 10-20 MB binary size reduction
**Effort:** Low (1 line in build.ts)

## P1 — Medium effort

### 4. MCP server lazy start 🟡

**Current:** `nocowboy mcp start` launches ALL 11 servers at once.
**Fix:** Start servers on first use. `/mcp/lazy` mode: proxy starts, but child process spawns only when first request arrives.

**Est. savings:** MCP start time: 60s → 5s (only proxy, no children). Memory: 100-200 MB saved until needed.
**Effort:** Medium (need lazy-spawn mechanism in McpProxy)

### 5. WAL mode for SQLite 🟡

**Current:** SQLite uses default journal mode (DELETE — slow writes).
**Fix:** Enable WAL mode: `PRAGMA journal_mode=WAL`. Faster writes, concurrent readers.

**Est. savings:** Write-heavy operations (session save, indexing) 2-5x faster.
**Effort:** Low (1 line PRAGMA)

### 6. SolidJS batch updates 🟡

**Current:** Reactivity triggers on every change. Repomap + memory re-computation on every turn might re-render unnecessarily.
**Fix:** Use `batch()` around repomap generation + memory reconcile to avoid intermediate renders.

**Est. savings:** Smoother TUI, fewer re-renders.
**Effort:** Low (wrap in `batch()`)

## P2 — High effort, big wins

### 7. Bundle WASMs into binary 🟠

**Current:** WASM files are separate files shipped alongside the binary.
**Fix:** Embed WASM bytes into the binary (base64 or binary blob). No separate files. Faster loading (no filesystem reads).

**Est. savings:** 50 MB removed from "files in package", but binary stays same size. Loading speed: instant (in-memory).
**Effort:** High (need build system change + binary embedding API)

### 8. Optimistic MCP no-db mode 🟠

**Current:** `mcp start` runs the FULL binary (including DB migration) because `_proxy` subcommand inherits the same initialization.
**Fix:** Add `--no-db` flag that skips DB init and migrations for `_proxy` subcommand. The proxy only needs HTTP server + child process — no database.

**Est. savings:** MCP spawn time: 30s → 0.5s (per server)
**Effort:** High (need to refactor CLI init to support `--no-db`)

### 9. Reduce WASM parser count 🟠

**Current:** 37 parsers for all languages.
**Fix:** Ship top 10 (TS, JS, Python, Rust, Go, Java, C, C++, Ruby, PHP). Others download on demand.

**Est. savings:** 50 MB → 15 MB (35 MB reduction)
**Effort:** Medium (need dynamic WASM loading)

## P3 — Research

### 10. Bun SQLite → better-sqlite3 🟣

Bun's `bun:sqlite` has less optimization than `better-sqlite3` (which uses native C bindings). If we ever switch to Node.js runtime, `better-sqlite3` is faster for bulk operations.

**Est. savings:** 10-20% faster for indexing bulk inserts.
**Effort:** High (driver swap + bun:sqlite-specific APIs)

### 11. Shared memory MCP 🟣

**Current:** Each MCP server is a separate process (spawn).
**Fix:** Run all MCP servers in a single process with worker_threads. Shared SQLite connection, shared WASM cache, no IPC overhead.

**Est. savings:** MCP memory: 11 processes × ~30MB → 1 process × ~50MB (300→50 MB saved)
**Effort:** Very High (architectural change)

---

## Quick fixes to apply NOW

| # | Fix | Effort | What to do |
|---|---|---|---|
| 1 | `--minify` flag in build.ts | Low | Add `--minify` to `bun build --compile` |
| 2 | WAL mode for SQLite | Low | `PRAGMA journal_mode=WAL` on DB open |
| 3 | SolidJS `batch()` for repomap | Low | Wrap `RepoMap.generate()` + `reconcile()` in `batch()` |
| 4 | `--no-db` for `_proxy` subcommand | Medium | Skip DB init for proxy-only processes |

## Priority to add to roadmap

Add these to `docs/ROADMAP.md` under a new "P2: Performance Optimization" section or under existing P2.
