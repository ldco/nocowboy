# NoCowboy Roadmap — 2026-06-24

## ✅ DONE (v0.6.1)

### Core Infrastructure
- [x] Forked from Kilo Code / OpenCode — TypeScript + Bun + SolidJS + OpenTUI
- [x] Compiled binary (`bun build --compile`) — instant startup, 0ms JS parse
- [x] npm publishing pipeline — platform packages + meta-package
- [x] Shared MCP server architecture — one server set, all instances connect via HTTP/SSE
- [x] Embedded MCP proxy — zero external deps, cross-platform, no systemd
- [x] Plugin out/plugin in MCP — `npm install -g @nocowboy/mcp-<name>`, postinstall auto-configures
- [x] Launch spec registry (`~/.nocowboy/mcp/launch.json`) — user-editable, auto-detected
- [x] Provider-agnostic — 200+ models via LiteLLM proxy
- [x] Per-system packaging REMOVED (AUR, systemd, homebrew)

### MCP Commands
- [x] `nocowboy mcp start/stop/status/logs/remove/install`
- [x] `nocowboy mcp add` — interactive wizard for custom servers
- [x] `nocowboy mcp install <name>` — auto-detect + npm install + configure + start

### Features
- [x] Repomap — `nocowboy repomap` command, auto-injected into system prompt every turn
- [x] Memory FTS5 — MiMo-Code borrowed: full-text search, reconcile, `<dream>` command
- [x] Multi-turn approval memory — cached `Allow once` per session (Codex CLI style)
- [x] Zero-config wizard — `nocowboy init` (global-only, 2 questions)
- [x] Goal judge — independent model evaluates `<goal>` completion
- [x] Deep context mode — repomap + memory merged into system prompt
- [x] Incremental PR review — code-reviewer checks only git diff files

### Configuration
- [x] Global config only (`~/.config/nocowboy/nocowboy.json`) — no per-project by default
- [x] All 16 instructions ported + rebranded (Kilo → NoCowboy)
- [x] All 6 agents ported + architect prompt synced
- [x] All 16 commands ported
- [x] All 8 skills ported
- [x] Code indexing first-class (not a plugin)
- [x] SQLite vector store (replaced LanceDB — ~15MB smaller package)
- [x] ADR: Turso Database adoption plan (Phase 1 blocked, Phase 2 complete)

### Tests
- [x] 150+ nocowboy tests pass (individual files)
- [x] 7 additional test files fixed (config-validation, workflows-migrator, session-processor, etc.)
- [ ] 39 flaky failures under parallel load (pre-existing infrastructure — test harness needed)

### Docs
- [x] `docs/publish.md` — npm publishing guide
- [x] `docs/tausik-js-port.md` — Tausik JS port guide
- [x] `docs/competitive-analysis.md` — merged from 5 older files
- [x] `docs/ROADMAP.md` — this file (single source of truth)

---

## ❌ NOT DONE — P0 Russian Market Moats

| # | Feature | Why |
|---|---|---|
| 1 | **Russian LLM providers** (YandexGPT, GigaChat) | No Western tool will ever integrate these |
| 2 | **Offline mode** (local LLM via Ollama) | Sanctions-proof — when APIs blocked, NoCowboy keeps running |
| 3 | **152-FZ compliance** | Data localization, consent, right to delete — regulatory moat |

---

## ❌ NOT DONE — P1 Stolen Features

| # | Feature | From | Effort |
|---|---|---|---|
| 1 | **Sandbox execution** (Docker-insulated commands) | OpenHands | High |
| 2 | **Permission model upgrade** (per-tool timeout, auto-deny) | Claude Code | Medium |
| 3 | **Search/replace edit format** | Aider | Medium |
| 4 | **Branch-per-task isolation** (`nocowboy plan --branch`) | Plandex | Medium |
| 5 | **MCP server marketplace** (`mcp search`) | Cline | Medium |
| 6 | **Russian-language agent prompts** (all 6 agents) | In-house | Medium |
| 7 | **Test harness** (fix 39 flaky parallel failures) | Infrastructure | High |

---

## ❌ NOT DONE — MiMo Borrowings

| # | Feature | From | Effort |
|---|---|---|---|
| 1 | **MiMo Memory System** (full) — auto-inject at session start, checkpoint on context pressure, context reconstruction | MiMo Memory | High (Effect adaptation needed) |
| 2 | **Dream command** (programmatic) — scan sessions → extract knowledge → MEMORY.md | MiMo `/dream` | Medium |
| 3 | **Distill command** — discover workflows → generate skills/commands | MiMo `/distill` | Medium |
| 4 | **Goal judge** (native Effect loop) — integrate into agent stop logic | MiMo agent loop | High |

---

## 📦 To Publish (blocked on `@nocowboy` npm org)

- [x] `nocowboy-linux-x64@0.6.1` — published to npm
- [ ] `nocowboy` meta-package
- [ ] `@nocowboy/mcp-constitution`
- [ ] `@nocowboy/mcp-contract-guard`
- [ ] `@nocowboy/mcp-ncp-validator`
- [ ] `@nocowboy/mcp-plugin-registry`
- [ ] `@nocowboy/mcp-ralph`
- [ ] `@nocowboy/mcp-score-engine`
- [ ] `@nocowboy/mcp-puppetmaster` (needs `dist/` built first)
- [ ] `@nocowboy/mcp-tausik` (needs Python → JS port)
