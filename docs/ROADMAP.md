# NoCowboy — Roadmap

**v0.6.1** | 2026-06-25 | Single source of truth + P0 + P1

---

## ✅ DONE

### Core Infrastructure
| Feature | Source | What |
|---|---|---|
| Compiled binary (`bun build --compile`) | Self | 155MB, instant startup, cross-compile linux→darwin |
| Shared MCP architecture | Self | One server set, all instances connect via HTTP/SSE. No per-instance memory bloat. |
| Embedded MCP proxy | Self | Zero deps. `_proxy` subcommand. No `mcp-proxy` npm package needed. |
| Plugin out/plugin in MCP | Self | `npm install -g @nocowboy/mcp-<name>`, postinstall auto-configures, `require.resolve` auto-detects. |
| Provider-agnostic | Kilo/inherited | 200+ models via LiteLLM proxy. Not vendor-locked. |
| npm publishing pipeline | Self | Platform binary + meta-package + MCP server packages. `npm install -g nocowboy`. |
| Per-system packaging removed | Self | AUR, systemd, homebrew, launchd deleted. |

### MCP Commands
| Command | What |
|---|---|
| `mcp start/stop/status/logs` | Lifecycle management |
| `mcp install <name>` | Auto-detect + npm install + configure |
| `mcp remove <name>` | Stop + config removal + launch cleanup |
| `mcp add` | Interactive dialog for custom servers |

### Features Borrowed
| Feature | From | What |
|---|---|---|
| Repomap | Aider | Token-optimized repo summary. Command + auto-injected into system prompt every turn. |
| Memory FTS5 | MiMo (MIT) | Full-text search, reconcile, `/dream` command. `fts-query.ts` copied directly. |
| Multi-turn approval memory | Codex CLI | In-memory per-session cache. Approve once → never asked again. |
| Zero-config wizard | Copilot CLI | `nocowboy init` — 2 questions, global config only. |
| Goal judge | MiMo | `/goal` with independent subagent evaluation. |
| Incremental PR review | Qodo CLI | Code-reviewer checks only git diff files. |
| Indexing first-class | Self | Not a plugin. Checks `indexing.enabled` directly. |
| SQLite vector store | Self | Replaced LanceDB (~14MB native deps removed). |
| Voice input | Self | FFmpeg capture + transcription (`voice-button.tsx`, 97 lines). |
| Deep context mode | MiMo | Repomap + memory merged into system prompt every turn. |

### Configuration
| Item | What |
|---|---|
| 16 instructions | Ported + rebranded Kilo → NoCowboy |
| 6 agents | Ported. Architect prompt synced to full 8330 chars. |
| 16 commands | Ported + `/repomap` + `/init` + `/dream` + `/verify` + `/goal` added |
| 8 skills | Ported + 4 Ralph-TUI skills |
| Global config only | `~/.config/nocowboy/nocowboy.json` — no per-project by default |

### Tests
| Item | Status |
|---|---|
| 150+ pass individually | ✅ |
| 7 broken files fixed | ✅ (`kilo→nocowboy` paths + indexing first-class) |
| 39 flaky under parallel load | ❌ needs test harness |

### P0 — Cost & Size Optimization 🤑

| # | Feature | Done | How |
|---|---|---|---|
| P0.1 | **DeepSeek prefix-cache** | ✅ | Reordered system prompt so stable prefix (soul + prompt + instructions + skills) comes **before** dynamic env (repomap + memory). Before: `[...env, ...instructions, ...skills]` → every request had a unique start token. After: `[...instructions, ...skills, ...env]` → first ~4KB are byte-stable across turns. DeepSeek's automatic prefix caching caches these repeated tokens server-side. **1 line changed in `prompt.ts:1969`.** |
| P0.2 | **Lazy-load tree-sitter WASMs** | ✅ | Replaced 130-line switch/case with declarative `EXTENSION_MAP`. Added `detectProjectLanguages(dir)` — targeted glob `**/*.{js,ts,...}` scans only supported extensions. Added `loadProjectLanguageParsers(dir)` — loads detected WASMs in **parallel** via `Promise.allSettled`. Integrated into `CodeParser.preloadProjectParsers()` called from service factory. Reverse index `LANGUAGE_PARSER_KEYS` avoids O(L×E) inner loop. Dead code removed: `extToParserKey`, `extToQuery`, `fallbackQuery`. **3 files: `languageParser.ts`, `parser.ts`, `service-factory.ts`.** |

### P1 — MiMo Memory & Reasoning 🧠

| # | Feature | Done | What |
|---|---|---|---|
| P1.1 | **Memory System** — paths, memory service, FTS5 scope/scope_id filters, lazy reconcile | ✅ | ~20 files ported from MiMo. `checkpoint-paths`, `checkpoint-templates`, `memory/paths`, memory service upgrade. |
| P1.2 | **Checkpoint writer** — boundary, context, validator, progress-reconcile, retry, templates, saver | ✅ | `checkpoint-context`, `checkpoint-validator`, `checkpoint-progress-reconcile`, `checkpoint-retry`, `checkpoint-saver`, `checkpoint.ts` (computeBoundary, composeWriterPrompt, renderRebuildContext). Hooks into compaction flow. |
| P1.3 | **Goal judge** — GoalService with AI SDK judge evaluation | ✅ | `goal.ts`. Set/get/clear/bumpReact/evaluate. Uses `generateObject` with temperature=0. |
| P1.4 | **Auto-dream / Distill** — interval-based scheduled memory consolidation | ✅ | `auto-dream.ts`. `shouldAutoDream()`/`shouldAutoDistill()` check session table for last run. |
| P1.5 | **Task tree** — TaskID (T1/T1.1), CRUD registry, stop-gate, gate-state | ✅ | `task/schema.ts`, `task/task.sql.ts`, `task/registry.ts`, `task/gate.ts`, `task/gate-state.ts`. |
| P1.6 | **Test harness** — fix 279 parallel flaky failures | 🚧 | Port randomization (codex/digitalocean/xai/MCP), ~20 bugfix commits, ~70 test files fixed. Major: x-kilo-directory→x-nocowboy-directory (9 files), NOCOWBOY_CLIENT env var (1 file), .kilo→.nocowboy paths (5 files). Remaining: httpapi-edit (7, endpoint removed), httpapi-public (4, OpenAPI format), indexing-startup (15, async), ~160 parallelism-only. |

---

## ❌ NOT DONE

### P2 — UX, Safety & Russian

#### P2-A UX & Safety

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| P2-A1 | **Server management UI** — enable/disable, remove, install MCP servers in Settings | Self | Medium | Prerequisite for marketplace. No JSON editing. |
| P2-A2 | **Search/replace edit format** | Aider | Medium | More reliable than line-based edits. |
| P2-A3 | **Branch-per-task** (`nocowboy plan --branch`) | Plandex | Medium | Isolation — bad changes don't pollute main. |
| P2-A4 | **Permission timeout** — auto-deny after N seconds | Claude Code | Low | Unblock autonomous workflows. |
| P2-A5 | **Autonomy slider** — full auto ↔ step-by-step in Settings | Plandex | Low | Configurable autonomy levels. |
| P2-A6 | **NUTAUSIK integration** — hybrid ProjMgmt | Self | High | See `docs/guides/feature-overlap-decisions.md`. |

#### P2-B Russian Language

| # | Feature | Effort | What |
|---|---|---|---|
| P2-B1 | **Russian system prompts** for all 6 agents | Medium | Agent reasons in Russian, understands Russian variable names. |
| P2-B2 | **Russian instruction files** (`instructions/ru/`) — all 16 instructions | Medium | Agent follows Russian instructions. |
| P2-B3 | **Russian LLM provider preference** — auto-select YandexGPT/GigaChat when `lang: "ru"` | Medium | Russian-trained models perform better. |
| P2-B4 | **`nocowboy.json` `lang` field** | Low | Config entry point for above features. |
| P2-B5 | **UI Russian localization** — TUI labels, error messages, help text | High | Full Russian interface. |

#### P2-C Codebase Optimization

| # | Feature | Effort | What |
|---|---|---|---|
| P2-C1 | **Analyze & optimize 6 agents** — merge, remove, enhance, rewrite as needed | High | Inherited from Kilo/OpenCode. May have redundancies or missing capabilities. |
| P2-C2 | **Analyze & optimize 16 instructions** | Medium | Same — review for consistency, relevance. |
| P2-C3 | **Analyze & optimize 16 commands** | Medium | Same — remove obsolete, enhance useful ones. |
| P2-C4 | **Revise MCP server framework** — review all 7 first-party + 4 third-party MCP servers. Merge overlapping ones into NUTAUSIK, remove obsolete, keep essential. | High | See `docs/guides/feature-overlap-decisions.md` for existing overlap analysis. |

### P3 — Ecosystem, Lawer & Reach

#### P3-A Ecosystem

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| P3-A1 | **Diff review sandbox** — AI changes isolated until accepted | Plandex | High | Safety: no AI changes touch real files until reviewed. |
| P3-A2 | **Sandbox mode** — Docker-insulated command execution | OpenHands | High | Enterprise security. |
| P3-A3 | **2M token context** — deep context with token budgeting | Claude Code + Plandex | High | — |
| P3-A4 | **Tree-sitter repomap** — upgrade regex → AST (37 WASMs ready) | Plandex | Medium | Use our existing 37 tree-sitter WASMs for structured repo maps. |
| P3-A5 | **MCP server marketplace** (`mcp search`) | Cline | Medium | Browse `@nocowboy/mcp-*` packages from terminal. |
| P3-A6 | **Vector store switcher** — SQLite / LanceDB / Qdrant in Settings | Self | Medium | Small: SQLite (zero deps). Large: LanceDB (ANN speed). Enterprise: Qdrant. |
| P3-A7 | **Offline mode** — local LLM via Ollama | Self | Medium | Sanctions-proof. Works without internet. |

#### P3-B Lawer (152-ФЗ)

| # | Feature | Effort | What |
|---|---|---|---|
| P3-B1 | **Lawer agent** — new agent type, 152-FZ expert | High | Answers 152-FZ questions, generates consent dialogs, reviews code. |
| P3-B2 | **Consent dialogs** — Russian, Art. 9 | Medium | Specific, informed, conscious. |
| P3-B3 | **Data localization** — Art. 21 | High | All user data on local disk. |
| P3-B4 | **Right to deletion** — `nocowboy forget` | Medium | Art. 14. |
| P3-B5 | **Roskomnadzor template** | Low | Art. 22. |

### P4 — Polish & Future

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| P4.1 | **Channels** — webhooks push CI/chat events into TUI sessions | Claude Code | Medium | — |
| P4.2 | **Russian LLM providers** (YandexGPT, GigaChat) | Self | High | No Western tool integrates these. |
| P4.3 | **Share chat / sync between machines** — share context across devices | Self | High | Requires cloud backend API. Share button exists in TUI but not wired. |
| P4.4 | **Turso driver swap** — `bun:sqlite` → `@tursodatabase/database` | Self | High (blocked) | Blocked on `drizzle-orm/libsql`. Phase 2 (LanceDB removal) already done. |

---

## 📦 Publish queue (blocked on `@nocowboy` npm org)

| Package | Status |
|---|---|
| `nocowboy-linux-x64@0.6.1` | ✅ Published |
| `nocowboy` meta-package | ❌ |
| `@nocowboy/mcp-*` (6 servers) | ❌ |
| `@nocowboy/mcp-puppetmaster` | ❌ needs `dist/` built |
| `@nocowboy/mcp-tausik` (NUTAUSIK) | ❌ 62 TS files ready, needs publish |
