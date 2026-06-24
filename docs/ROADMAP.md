# NoCowboy Roadmap — 2026-06-24

## ✅ DONE (v0.6.1)

### Core Infrastructure
- [x] Forked from Kilo Code / OpenCode
- [x] Compiled binary — instant startup, 0ms JS parse
- [x] npm publishing pipeline — platform packages + meta-package
- [x] Shared MCP server architecture — one server set, all instances connect via HTTP/SSE
- [x] Embedded MCP proxy — zero external deps, no systemd, cross-platform
- [x] Plugin out/plugin in MCP — `npm install -g @nocowboy/mcp-<name>`, auto-configure
- [x] Provider-agnostic — 200+ models via LiteLLM
- [x] Per-system packaging removed (AUR, systemd, homebrew)

### MCP Commands
- [x] `mcp start/stop/status/logs/remove/install/add`

### Features
- [x] Repomap — command + auto-injection into system prompt every turn
- [x] Memory FTS5 — full-text search, reconcile, dream command
- [x] Multi-turn approval memory — per-session cache (Codex CLI style)
- [x] Zero-config wizard — `nocowboy init` (global-only)
- [x] Goal judge — `/goal` with independent subagent evaluation
- [x] Deep context — repomap + memory merged into system prompt
- [x] Incremental PR review — code-reviewer checks only git diff
- [x] Voice input — FFmpeg capture + transcription (`voice-button.tsx`)
- [x] Indexing first-class (not a plugin)
- [x] SQLite vector store (replaced LanceDB — ~15MB smaller)

### Configuration
- [x] Global config only (`~/.config/nocowboy/nocowboy.json`)
- [x] 16 instructions + 6 agents + 16 commands ported
- [x] 8 skills ported
- [x] Architect prompt synced to full 8330 chars

### Tests
- [x] 150+ tests pass (individual files)
- [x] 7 broken test files fixed
- [ ] 39 flaky under parallel runner — test harness needed

### Docs
- [x] Reorganized — `guides/` `reference/` `adr/` `archive/`
- [x] ROADMAP.md — single source of truth

---

## ❌ NOT DONE — P0 Russian Market Moats

| # | Feature | Why |
|---|---|---|
| 1 | **Russian LLM providers** (YandexGPT, GigaChat) | No Western tool will integrate these |
| 2 | **Offline mode** (local LLM via Ollama) | Sanctions-proof |
| 3 | **152-FZ compliance** | Regulatory moat — data localization, consent |

---

## ❌ NOT DONE — P1 Features

| # | Feature | Effort |
|---|---|---|
| 1 | Sandbox execution (Docker-insulated) | High |
| 2 | Permission model (timeout, auto-deny) | Medium |
| 3 | Search/replace edit format (Aider) | Medium |
| 4 | Branch-per-task (`nocowboy plan --branch`) | Medium |
| 5 | MCP server marketplace (`mcp search`) | Medium |
| 6 | Russian-language agent prompts (1/6 done) | Medium |
| 7 | Test harness (fix 39 flaky failures) | High |

---

## ❌ NOT DONE — MiMo Borrowings

| # | Feature | Effort |
|---|---|---|
| 1 | MiMo Memory System (full — auto-inject, checkpoints, context reconstruction) | High |
| 2 | Dream command (programmatic) | Medium |
| 3 | Distill command | Medium |
| 4 | Goal judge (native Effect loop integration) | High |

---

## 📦 Publish queue (blocked on `@nocowboy` npm org)

- [x] `nocowboy-linux-x64@0.6.1` — published
- [ ] `nocowboy` meta-package
- [ ] `@nocowboy/mcp-constitution` ×6 (some need dist/ build)
- [ ] `@nocowboy/mcp-puppetmaster` (needs dist/ built)
- [ ] `@nocowboy/mcp-tausik` (needs Python → JS port)
