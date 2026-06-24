# ADR-001: Turso Database adoption — replace bun:sqlite + LanceDB

## Status: Accepted (Phase 2 complete, Phase 1 blocked)

## Context

NoCowboy currently uses:
- **SQLite** via `bun:sqlite` (Bun's built-in driver) + **Drizzle ORM** for all operational data
- **LanceDB** as a separate vector database for codebase indexing

Two database engines, two sets of native binaries (37 tree-sitter WASMs + LanceDB native libs). The indexing stack alone adds ~15MB of LanceDB binaries per platform.

Turso has released a complete Rust rewrite of SQLite: **Turso Database** — not a fork, a new implementation with concurrent writes, encryption, and vector search built-in.

Turso themselves: "If you're starting a new project, you probably want to look into Turso." [libsql] is actively maintained, but new features are being developed in Turso."

## Decision

Adopt `@libsql/client` as first step (Drizzle-stable), with migration path to `@tursodatabase/database` when Drizzle beta graduates.

### Phase 1: `@libsql/client` (now — Drizzle-stable)

```ts
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
const client = createClient({ url: "file:~/.nocowboy/nocowboy.db" })
const db = drizzle({ client })
```

- Vector search via `libsql-vector` extension: `SELECT * FROM embeddings ORDER BY vec_distance_cos(embedding, ?) LIMIT 10`
- Replaces LanceDB → removes ~15MB native binaries
- 100% Drizzle compatible

### Phase 2: `@tursodatabase/database` (when Drizzle beta graduates)

- MVCC concurrent writes (multi-process parallelism)
- Built-in encryption (AEGIS-256, AES-256-GCM)
- Native async I/O
- Future: bidirectional sync via `@tursodatabase/sync`

## Options Considered

### 1. Stay with bun:sqlite + LanceDB (current)
Pro: stable, works. Con: two engines, no vectors, no MVCC, no encryption.

### 2. @libsql/client + vectors (Phase 1)
Pro: Drizzle-stable, one engine, smaller binaries. Con: single-writer SQLite.

### 3. @tursodatabase/database directly (Phase 2)
Pro: MVCC, encryption, bleeding edge. Con: Drizzle beta — may break.

## How this beats competitors

| Feature | NoCowboy (now) | NoCowboy + Turso | Cursor/Copilot |
|---|---|---|---|
| Database engine | SQLite (single-writer) | SQLite + MVCC | PostgreSQL (remote, requires account) |
| Vector search | LanceDB (separate engine) | libSQL vectors (same engine) | pgvector |
| Encryption at rest | None | Built-in (AEGIS-256) | Disk-level only |
| Cross-device sync | None | Future (Turso Sync) | Account-gated cloud |
| Local-first | Yes | Yes (no network) | No (remote only) |
| Identical offline UX | Yes | Yes | No |

## Implementation

- Phase 1: Replace `bun:sqlite` imports + `Database.Client()` with `@libsql/client`. Drizzle schemas unchanged. Target: 150+ tests pass.
- Phase 2: Replace LanceDB with SQL vector queries. Remove `@lancedb/lancedb*` deps. Target: indexing feature works end-to-end, package size -15MB.
- Phase 3: Monitor Drizzle `@tursodatabase/database` integration. Migrate when stable.


## Implementation Log

- **2026-06-24**: Phase 2 complete —  replaces LanceDB. Vectors stored as JSON TEXT in SQLite, cosine similarity in TS.  = . LanceDB deps removed (~15MB saved).
- **2026-06-24**:  installed but  not available in this build. Upgrade path: swap TS cosine to native SQL when libsql-vector is packaged in npm.
- **2026-06-24**: Phase 1 blocked —  has no  subpath. Waiting for drizzle-orm to ship it.
