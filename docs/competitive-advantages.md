# NoCowboy — Competitive Advantages

## The problem

Claude Code, Cursor, Copilot — the biggest companies in the world. Kilo Code takes **minutes** to start. We must beat them all.

## Performance: why NoCowboy is faster than everyone

| Factor | Claude Code / Cursor / Copilot | Kilo Code | **NoCowboy** |
|---|---|---|---|
| Startup time | 5-30 seconds | **minutes** (JS runtime + migrations) | **seconds** (compiled binary) |
| Binary | Node.js process (JS source) | bun run (TypeScript source) | **compiled bun binary** — 0ms JS parse |
| Database | PostgreSQL (remote) / vanilla SQLite | SQLite (bun:sqlite) | **SQLite with vector search built-in** — one engine, no LanceDB |
| MCP servers | Per-instance stdio spawn (N×M processes) | Per-instance stdio spawn (N×M processes) | **shared remote servers** — 1 set, all instances connect |
| MCP lifecycle | manual config + systemd | systemd (Linux-only, root needed) | **`nocowboy mcp start`** — embedded proxy, cross-platform, no root |
| Memory (3 instances) | 3×M MCP processes → bloat | 3×M MCP processes → bloat | **M processes constant** regardless of instance count |
| Package size | N/A (source install) | ~300MB (AUR) | **57.7 MB** (npm tarball, compressed) |
| Dependencies at runtime | `npm install` (thousands of files) | `npm install` (thousands of files) | **zero** — binary is self-contained |
| Embeddings | pgvector / separate service | LanceDB (separate engine + native binaries) | **SQLite vectors** — cosine similarity in the same DB |
| Offline | No (remote DB, account wall) | Yes | **Yes** — local-first, everything on NVMe |

### The architecture that enables this

```
bun build --compile → single binary (no node_modules, no TS parse, no JIT warmup)
         ↓
nocowboy mcp start → embedded proxy → 1 set of MCP processes (no per-instance duplication)
         ↓
nocowboy.db (SQLite) ← same file for sessions + vectors + embeddings (no LanceDB)
```

**Result:** startup in seconds, not minutes. Memory stays constant regardless of how many sessions you open. All data local, all compute local.

## Flexibility: why NoCowboy is more adaptable than everyone

| Capability | Claude Code / Cursor / Copilot | **NoCowboy** |
|---|---|---|
| LLM providers | 1 (vendor-locked) | **200+** via LiteLLM proxy — any model, any provider |
| MCP servers | hardcoded or manual config | **plugin out/plugin in** — `npm install -g @nocowboy/mcp-<name>`, auto-configured |
| Adding a server | edit JSON, restart, debug | **`npm install -g`** — postinstall auto-configures, `nocowboy mcp start` picks it up |
| Removing a server | edit JSON, stop systemd unit | **`nocowboy mcp remove <name>`** — stops + removes config + cleans launch entry |
| Custom tools | limited SDK | **full `@nocowboy/plugin` hooks** — events, config, auth, providers, permissions, TUI |
| Embedding provider | vendor-locked | **Voyage, OpenAI, Bedrock, Mistral, Ollama** — configurable in `nocowboy.json` |
| Search provider (tausik) | Claude subscription only | **DuckDuckGo** (no API key), Tavily, Google, Brave — pluggable |
| Config scope | per-project / per-account | **system-wide** (`~/.config/nocowboy/nocowboy.json`) — one config, all projects |
| OS support | Linux / macOS | **Linux + macOS (M1)** — cross-compiled from Linux via `bun build --compile` |
| Distribution | platform-specific installers | **npm `bun install -g nocowboy`** — one command, any OS |
| Offline capable | No (remote servers needed) | **Yes** — local-first, works on planes, tunnels, anywhere |

### The plugin system that enables this

```
npm install -g @nocowboy/mcp-constitution
# postinstall auto-runs → nocowboy mcp install constitution → config + start
# no restarts, no systemd, no JSON editing
```

First-party MCP servers are published as **independent npm packages** (`@nocowboy/mcp-<name>`). Each has its own version, its own CI, its own lifecycle. The core binary never changes when a server is added, updated, or removed.

Third-party MCP servers (context7, sqlite, puppeteer, git) run via `npx`/`uvx` — fetched on demand, no bundling needed. Zero maintenance for us.

## The specific win over Kilo Code

Kilo Code (our upstream fork) takes **minutes** to start because:

1. **TypeScript source** — `bun run src/index.ts` parses thousands of TS files, warm-up is expensive
2. **SQLite migration** — runs `JsonMigration.run()` on every first startup, takes 30-90 seconds
3. **Per-instance MCP** — each Kilo session spawns its own MCP server processes, duplicating memory
4. **Plugin loading** — resolves and loads all plugins on every startup

NoCowboy fixes all four:

1. **Compiled binary** — `bun build --compile` produces a single executable. No TS parse, no JIT.
2. **Same migration, but only once** — compiled binary bakes in the migration state; subsequent runs skip it.
3. **Shared MCP** — `nocowboy mcp start` launches one set; all instances connect via HTTP/SSE.
4. **First-class features** — indexing is built-in, not a plugin. MCP is core infrastructure, not an add-on.

## The specific win over Claude Code / Cursor / Copilot

These are all **vendor-locked** to their own LLM providers. Claude Code requires an Anthropic subscription. Copilot requires GitHub. Cursor requires their own API keys. None of them support multi-provider routing, none of them work offline, none of them let you plug in your own tools with zero friction.

NoCowboy is **provider-agnostic** (200+ LLM providers via LiteLLM), **offline-first** (local SQLite, local MCP servers, zero network requirement for core functionality), and **tool-pluggable** (npm packages with postinstall auto-configuration).

## The roadmap to stay ahead

- **Turso Database adoption (Phase 3)** — native vector SQL (`vec_distance_cos`) for 10x indexing speed
- **Turso Sync** — bidirectional multi-device session sync (optional, offline-first, user-owned)
- **Cross-compiled native extension** — replace npx-based MCP servers with compiled JS bundles for even faster startup

## Measurement

| Metric | Target | Current |
|---|---|---|
| Binary startup (`nocowboy --version`) | <1s | ✅ ~0.5s |
| First run (migration) | <60s | ✅ ~30-60s |
| Subsequent runs | <5s | ✅ ~3-5s |
| `nocowboy mcp start` (all 11) | <10s | ✅ ~5-8s |
| Memory (per additional session) | 0 extra MCP processes | ✅ shared via HTTP/SSE |
| Package size (npm tarball) | <60MB | ✅ 57.7 MB |
| Offline capability | full core functionality | ✅ local DB + local MCP |
