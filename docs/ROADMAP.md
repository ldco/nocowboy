# NoCowboy — Roadmap

**v0.6.1** | 2026-06-24 | Single source of truth

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

---

## ❌ NOT DONE

### P0 — Cost & Size Optimization 🤑

| # | Feature | From | Effort | Why |
|---|---|---|---|---|
| 1 | **DeepSeek prefix-cache** — structure system prompts for byte-stable prefix | Whale | Medium | 90% cache hit → 30x cheaper per session. $0.001 vs $0.015. Saves real money on every API call. |
| 2 | **Lazy-load tree-sitter WASMs** — detect project languages, load only matching parsers. Fallback to top 5. | Self | Medium | 37 WASMs → ~10MB. 40MB saved, faster startup, less memory. |

### P1 — MiMo Memory & Reasoning

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| 1 | **Memory System** (full) — auto-inject, checkpoint on context pressure, context reconstruction | MiMo | High | Effect→Bun adaptation needed. 6 files in `src/memory/`. |
| 2 | **Dream command** (programmatic) — scan traces → extract knowledge → MEMORY.md | MiMo | Medium | Currently an agent instruction; needs code. |
| 3 | **Distill command** — discover workflows → generate skills/commands | MiMo | Medium | — |
| 4 | **Goal judge** (native Effect loop) — integrate into agent stop logic | MiMo | High | Currently an instruction file; needs agent-loop integration. |
| 5 | **Task tree IDs** (T1/T1.1) — lightweight bridge to NUTAUSIK | MiMo | Low | — |

### P2 — UX, Safety & Russian

| # | Feature | From | Effort | What |
|---|---|---|---|
| # | Feature | From | Effort | What |
|---|---|---|---|---|
| 1 | **Server management UI** — enable/disable, remove, install MCP servers in Settings | Self | Medium | Prerequisite for marketplace. No JSON editing. |
| 2 | **Search/replace edit format** | Aider | Medium | More reliable than line-based edits. |
| 3 | **Branch-per-task** (`nocowboy plan --branch`) | Plandex | Medium | Isolation — bad changes don't pollute main. |
| 4 | **Permission timeout** — auto-deny after N seconds | Claude Code | Low | Unblock autonomous workflows. |
| 5 | **Autonomy slider** — full auto ↔ step-by-step in Settings | Plandex | Low | Configurable autonomy levels. |
| 6 | **NUTAUSIK integration** — hybrid ProjMgmt | Self | High | See `docs/guides/feature-overlap-decisions.md`. |
| 7 | **Test harness** — fix 39 flaky parallel failures | Self | High | In-memory DB + mock providers + isolated MCP ports. |

| # | Feature | Effort | What |
|---|---|---|---|
| 1 | **Russian system prompts** for all 6 agents | Medium | Agent reasons in Russian, understands Russian variable names. |
| 2 | **Russian instruction files** (`instructions/ru/`) — all 16 instructions | Medium | Agent follows Russian instructions. |
| 3 | **Russian LLM provider preference** — auto-select YandexGPT/GigaChat when `lang: "ru"` | Medium | Russian-trained models perform better. |
| 4 | **`nocowboy.json` `lang` field** | Low | Config entry point for above features. |
| 5 | **UI Russian localization** — TUI labels, error messages, help text | High | Full Russian interface. |

| # | Feature | Effort | What |
|---|---|---|---|
| 1 | **Analyze & optimize 6 agents** — merge, remove, enhance, rewrite as needed | High | Inherited from Kilo/OpenCode. May have redundancies or missing capabilities. |
| 2 | **Analyze & optimize 16 instructions** | Medium | Same — review for consistency, relevance. |
| 3 | **Analyze & optimize 16 commands** | Medium | Same — remove obsolete, enhance useful ones. |
| 4 | **Revise MCP server framework** — review all 7 first-party + 4 third-party MCP servers. Merge overlapping ones into NUTAUSIK, remove obsolete, keep essential. | High | See `docs/guides/feature-overlap-decisions.md` for existing overlap analysis. |

### P3 — Ecosystem, Lawer & Reach

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| 1 | **Diff review sandbox** — AI changes isolated until accepted | Plandex | High | Safety: no AI changes touch real files until reviewed. |
| 2 | **Sandbox mode** — Docker-insulated command execution | OpenHands | High | Enterprise security. |
| 3 | **2M token context** — deep context with token budgeting | Claude Code + Plandex | High | — |
| 4 | **Tree-sitter repomap** — upgrade regex → AST (37 WASMs ready) | Plandex | Medium | Use our existing 37 tree-sitter WASMs for structured repo maps. |
| 5 | **MCP server marketplace** (`mcp search`) | Cline | Medium | Browse `@nocowboy/mcp-*` packages from terminal. |
| 6 | **Vector store switcher** — SQLite / LanceDB / Qdrant in Settings | Self | Medium | Small: SQLite (zero deps). Large: LanceDB (ANN speed). Enterprise: Qdrant. |
| 7 | **Offline mode** — local LLM via Ollama | Self | Medium | Sanctions-proof. Works without internet. |

| # | Feature | Effort | What |
|---|---|---|---|
| 1 | **Lawer agent** — new agent type, 152-FZ expert | High | Answers 152-FZ questions, generates consent dialogs, reviews code. |
| 2 | **Consent dialogs** — Russian, Art. 9 | Medium | Specific, informed, conscious. |
| 3 | **Data localization** — Art. 21 | High | All user data on local disk. |
| 4 | **Right to deletion** — `nocowboy forget` | Medium | Art. 14. |
| 5 | **Roskomnadzor template** | Low | Art. 22. |
| — local LLM via Ollama | Self | Medium | Sanctions-proof. Works without internet. |

### P4 — Polish & Future

| # | Feature | From | Effort | What |
|---|---|---|---|---|
| 1 | **Channels** — webhooks push CI/chat events into TUI sessions | Claude Code | Medium | — |
| 2 | **Russian LLM providers** (YandexGPT, GigaChat) | Self | High | No Western tool integrates these. |
| 3 | **Share chat / sync between machines** — share context across devices | High | Requires cloud backend API. Share button exists in TUI but not wired. |
| 4 | **Turso driver swap** — `bun:sqlite` → `@tursodatabase/database` | Self | High (blocked) | Blocked on `drizzle-orm/libsql`. Phase 2 (LanceDB removal) already done. |

---

## 📦 Publish queue (blocked on `@nocowboy` npm org)

| Package | Status |
|---|---|
| `nocowboy-linux-x64@0.6.1` | ✅ Published |
| `nocowboy` meta-package | ❌ |
| `@nocowboy/mcp-*` (6 servers) | ❌ |
| `@nocowboy/mcp-puppetmaster` | ❌ needs `dist/` built |
| `@nocowboy/mcp-tausik` (NUTAUSIK) | ❌ 62 TS files ready, needs publish |
