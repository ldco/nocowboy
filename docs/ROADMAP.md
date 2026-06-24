everybody uses lancedb and not sql # NoCowboy Roadmap — 2026-06-24

## ✅ DONE (v0.6.1)

### Core Infrastructure
- [x] Forked from Kilo Code / OpenCode
- [x] Compiled binary — instant startup, 0ms JS parse
- [x] npm publishing pipeline — platform packages + meta-package
- [x] Shared MCP server architecture — one server set, all instances connect via HTTP/SSE
- [x] Embedded MCP proxy — zero external deps, no systemd, cross-platform
- [x] Plugin out/plugin in MCP — auto-detect, postinstall configure, require.resolve
- [x] Provider-agnostic — 200+ models via LiteLLM
- [x] Per-system packaging removed (AUR, systemd, homebrew)

### MCP Commands
- [x] `mcp start/stop/status/logs/remove/install/add`

### Features
- [x] Repomap — command + auto-injection into system prompt every turn
- [x] Memory FTS5 — full-text search, reconcile, /dream command
- [x] Multi-turn approval memory — per-session cache (Codex CLI style)
- [x] Zero-config wizard — `nocowboy init` (global-only, 2 questions)
- [x] Goal judge — `/goal` with independent subagent evaluation
- [x] Deep context — repomap + memory merged into system prompt
- [x] Incremental PR review — code-reviewer checks only git diff
- [x] Voice input — FFmpeg capture + transcription (`voice-button.tsx`)
- [x] Indexing — first-class (not a plugin), SQLite vector store (replaced LanceDB)
- [x] LanceDB removed (Phase 2 of Turso plan complete — ~15MB saved)

### Configuration
- [x] Global config only (`~/.config/nocowboy/nocowboy.json`)
- [x] 16 instructions + 6 agents + 16 commands ported
- [x] 8 skills ported | Architect prompt synced (8330 chars)

### Tests
- [x] 150+ tests pass (individual files)
- [x] 7 broken test files fixed (kilo→nocowboy paths, indexing as first-class, session-processor)
- [ ] 39 flaky under parallel runner — need TestServer harness with in-memory DB + mock providers

### Docs
- [x] Reorganized — `guides/` `reference/` `adr/` `archive/`
- [x] ROADMAP.md — single source of truth
- [x] Competitive analysis — all 30+ TUIs compared (`docs/reference/competitive-analysis.md`)

---

## ❌ NOT DONE — P0: MiMo Memory & Reasoning

### P0a: MiMo Memory & Reasoning

Memory, workflow, dream, distill, goal judge — ported from Xiaomi MiMo-Code (MIT license, same fork base).

Memory, workflow, dream, distill, goal judge — ported from Xiaomi MiMo-Code (MIT license, same fork base).

| # | Feature | From MiMo | Effort |
|---|---|---|---|
| 1 | **Memory System** (full) — auto-inject at session start, checkpoint on context pressure, context reconstruction | `src/memory/` (6 files) | High (Effect→Bun adaptation) |
| 2 | **Dream command** (programmatic) — scan sessions → extract knowledge → write MEMORY.md | `/dream` CLI | Medium |
| 3 | **Distill command** — discover repeated workflows → generate reusable skills/commands | `/distill` CLI | Medium |
| 4 | **Goal judge** (native Effect loop) — independent model evaluates stop condition in agent loop | `agent/agent.ts` | High |
| 5 | **Task tree IDs** (T1/T1.1) — lightweight bridge to Tausik's richer task system | `src/task/` | Low |


- [x] FTS5 query builder (`fts-query.ts` — pure, 0 deps)
- [x] FTS5 schema + migration
- [x] Memory reconcile (index MEMORY.md, prune dead)
- [x] `/dream` agent command (instruction file)
- [x] `/goal` agent command with judge prompt

### What we will NOT borrow from MiMo

- **Workflow/Compose mode** — Ralph/Tausik is richer for project management
- **Task Tree** — Tausik has 70+ tools vs MiMo's 7 files
- **Voice input** — Xiaomi-specific (TenVAD/ASR). We have our own FFmpeg-based solution.
- **Effect framework** — not compatible with Bun APIs. Extract algorithms only.

---

## ❌ NOT DONE — P1: UX, Safety & Russian

### P1a: UX & Safety

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Server management UI** — Settings tab: enable/disable, remove, install MCP servers | Medium | Prerequisite for marketplace. No JSON editing needed. |
| 2 | **Search/replace edit format** (Aider-style) | Medium | More reliable than line-based edits |
| 3 | **Branch-per-task** (`nocowboy plan --branch`) | Medium | Isolation — bad changes don't pollute main |
| 4 | **Permission timeout** — auto-deny after N seconds | Low | Unblock autonomous workflows |
| 5 | **Test harness** — fix 39 flaky parallel test failures | High | In-memory DB + mock providers + isolated MCP ports |
| 6 | **Autonomy slider** — full auto ↔ step-by-step in Settings | Low | Plandex configurable autonomy |
| 7 | **NUTAUSIK integration** — hybrid ProjMgmt architecture (gates, stacks, memory graph → NUTAUSIK MCP server. Ralph, goal judge, verify stay in core.) | High | See docs/guides/nutausik-analysis.md |

### P1b: Russian Agent Intelligence (Qwen Code pattern)

Qwen Code achieved 3x adoption in China by making the agent THINK in Chinese.
For NoCowboy: Russian system prompts for all 6 agents, Russian-trained LLM.

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Russian system prompts** for all 6 agents | Medium | Agent reasons in Russian, understands Russian variables |
| 2 | **Russian instruction files** (`instructions/ru/`) | Medium | Agent follows Russian instructions |
| 3 | **Russian LLM provider preference** — YandexGPT/GigaChat when `lang: "ru"` | Medium | Russian-trained models perform better |
| 4 | **`nocowboy.json` `lang` field** | Low | Config entry point |
| 5 | **UI Russian localization** — TUI labels, error messages, help text | High | Full Russian interface |

### P1c: 152-FZ Compliance (Big Release)

A separate major release. Create a **Lawer agent** that rewrites and refactors all
agents (ours + inherited from Kilo) for 152-FZ compliance.

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Lawer agent** — specialized in 152-FZ personal data law, reviews all agent prompts for compliance | High | New agent type: reads 152-FZ, audits all other agents |
| 2 | **Data localization enforcement** — all user data stored on local disk, never sent to foreign servers | High | Core requirement of Art. 21 |
| 3 | **Consent dialogs** — Russian-language consent prompts before collecting any personal data | Medium | Art. 9 compliance — specific, informed, conscious |
| 4 | **Right to deletion** — `nocowboy forget` command purges all local data | Medium | Art. 14 compliance |
| 5 | **Roskomnadzor notification template** — auto-generated for companies to file | Low | Art. 22 compliance |
| 6 | **Agent audit** — all 6 inherited agents + instructions reviewed for 152-FZ violations | High | Lawer agent's primary task |

## ❌ NOT DONE — P2: Ecosystem & Reach

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Diff review sandbox** — AI changes isolated until accepted (Plandex pattern) | High | Safety: no AI changes touch real files until reviewed |
| 2 | **Sandbox mode** — Docker-insulated agent command execution | High | Enterprise security. No AI runs raw commands on prod machines. |
| 3 | **2M token context** — deep context with token budgeting | High | Claude Code + Plandex pattern |
| 4 | **Tree-sitter repomap** — upgrade regex → AST (30+ languages, we have 37 WASMs) | Medium | Plandex pattern |
| 5 | **MCP server marketplace** (`mcp search`) — browse `@nocowboy/mcp-*` packages | Medium | Cline has this. Discovery without leaving terminal. |
| 6 | **Vector store switcher** — UI to select SQLite / LanceDB / Qdrant in Settings | Medium | Small projects: SQLite (zero deps). Large: LanceDB (ANN speed). Enterprise: Qdrant (external server). |
| 7 | **Offline mode** — local LLM via Ollama, zero API keys needed | Medium | Sanctions-proof. Works without internet. |

---

## ❌ NOT DONE — P3: Polish & Future

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Custom Distributions** — preconfigured `nocowboy-ru` distro for Russian market | Medium | Goose (Linux Foundation) pattern |
| 2 | **Channels** — webhooks push CI/chat events into TUI sessions | Medium | Claude Code pattern |
| 3 | **Russian LLM providers** (YandexGPT, GigaChat) | High | No Western tool integrates these |
| 4 | **Turso driver swap** — blocked on drizzle-orm/libsql | High (blocked) |

| # | Feature | Effort |
|---|---|---|

### About Turso

**What we already did** (Phase 2): replaced LanceDB with native SQLite vectors — the MAIN win.  
**Blocked** (Phase 1): `drizzle-orm@1.0.0-beta.19` lacks `libsql` driver subpath. No driver swap possible.  
**Blocked** (Phase 3): `@tursodatabase/database` Rust rewrite also needs driver swap first.

**Do we need Turso?** Not urgently. The key value (single DB engine, no LanceDB) is already achieved. Turso's MVCC concurrent writes, built-in encryption, and vector acceleration via `vec_distance_cos()` are nice-to-haves that become possible when drizzle-orm ships libsql. That's a future optimization, not a blocker. See `docs/adr/turso-database-adoption.md`.

---

## 📦 Publish queue (blocked on `@nocowboy` npm org)

- [x] `nocowboy-linux-x64@0.6.1` — published to npm
- [ ] `nocowboy` meta-package
- [ ] `@nocowboy/mcp-constitution` ×6
- [ ] `@nocowboy/mcp-puppetmaster` (needs `dist/` built first)
- [ ] `@nocowboy/mcp-tausik` (needs Python → JS port)
