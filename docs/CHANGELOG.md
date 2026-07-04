# NoCowboy — Changelog

## v0.7.5 — P2 UX & Safety + NUTAUSIK Auto-Wiring (2026-07-04)

### P2-A2: Search/Replace Edit Format
- New `search_replace` tool — Aider-style SEARCH/REPLACE block-diff parser
- Parses `<<<<<<< SEARCH` / `=======` / `>>>>>>> REPLACE` blocks
- Multi-file support with unified permission flow
- 13 parser + execution tests

### P2-A3: Branch-per-task
- `Git.Service.createBranch(cwd, branchName)` — programmatic branch creation
- `--branch` CLI flag on `nocowboy run`
- Auto-generates branch name from prompt when `--branch` given without value
- Skipped in `--attach` mode

### P2-A4: Permission Timeout
- `experimental.permission_timeout` config — timeout in milliseconds
- Auto-denies permission requests after timeout
- Default: disabled (no timeout)

### P2-A5: Yolo Mode Toggle
- `[YOLO` button in prompt input bar (before clear button)
- Brand-orange when active, gray when inactive
- Toggles `allowEverything` permission via SDK
- New `YoloButton` SolidJS component

### Agent Instructions
- **AGENTS.md**: New sections — STRICTLY FORBIDDEN Openings, Behavioral Corrections (Lazy/Overeager/Conversational), Test Failures Invariant, extended Forbidden Phrases Table
- **code.txt**: New prompt file for primary coding agent
- **debug.txt**: Strengthened — NoCowboy identity, 5-step process, Engineering invariants
- All agent descriptions shortened to ~5 words for agent selector dialog
- `dialog-agent.tsx`: Always show descriptions, never hide behind "native" badge

### NUTAUSIK — Fix & Phase 1 (hooks + NutausikDot)
- **Fixed:** `better-sqlite3` rebuilt for Node.js 26 (was compiled for Node 24)
- **Fixed:** NUTAUSIK MCP port 9210 (9204 had ncp-validator)
- **Init:** `.nutausik/nutausik.db` created in NoCowboy project
- **NutausikDot:** 3-state indicator in TopBar — ✗ (no server), init (server, no DB), ✓ (ready)
- **nutausik-hooks.sh:** lifecycle hooks for SessionStart, PostToolUse, SessionEnd
- **docs/NUTAUSIK.md:** competitive analysis & design document

### NUTAUSIK v0.2.0 — Session Auto-Wiring (separate repo)
- `nutausik_context_inject` MCP tool — generates `<nutausik_context>` block for agent prompt injection
- `nutausik_handoff_save` / `handoff_load` — session handoff persistence
- `nutausik_coherence_check` — validates plan against memory/decisions
- `nutausik_loop_close` — compares plan vs actual, generates UNIFY SUMMARY
- CLI commands for all new tools
- 488 tests (8 new), 45 files, 100% pass

### Todo Injection (NoCowboy integration)
- `system.ts`: env builder calls `nutausik_context_inject` MCP tool on system prompt assembly
- `system-prompt.ts`: NUTAUSIK context block injected when `.nutausik/` exists
- `nutausik-hooks.sh`: auto-saves handoff on SessionEnd

### Verification
- Typecheck: `tsgo --noEmit` — clean
- All P2 tests pass, 0 failures

## v0.7.4 — P3 Agent Refactor (2026-07-03)

### Agent Reduction: 15 → 5
| Agents kept | Role |
|---|---|
| **code** | Main coding agent (was build) |
| **architect** | Systems design, ADR, C4 |
| **debug** | Systematic debugging |
| **overseer** 🆕 | Traycer-like: orchestrates code, cross-model review |
| **nocowboy** 🆕 | OpenClaw-style: browser, fs, CLI, automation |

**Removed (10):** general, explore, scout, plan, ask, prd, ralph, researcher, code-reviewer, orchestrator.

**Removed as deprecated (pre-v0.7.4):** orchestrator agent, triage.md, duplicate-pr.md

### Tool Groups
- `groups` field in `ConfigAgent.Info` schema: `["read","edit","command","mcp"]`
- `META_TOOLS`: task/question/todowrite always available (not overridable)

### Prompts
- `prompt/nocowboy.txt` — rewritten (Russian, OpenClaw-style)
- `prompt/overseer.txt` — new (53 lines, Delegation Briefs + Output Contract)
- `prompt/ask.txt` — deleted
- `prompt/orchestrator.txt` — deleted

### Architecture Separation
| Layer | What | Location |
|---|---|---|
| Agents | WHO: prompts, permissions, tools | `agent.ts`, `nocowboy/agent/` |
| Instructions | HOW: rules, conventions | `AGENTS.md`, `instructions/` (16 files) |
| Nutausik MCP | TRACKS: tasks, memory, gates, specs | MCP server port 9204 (80+ tools) |

### MCP Launcher Fix
- `Launcher.command()` — reads `command` from config for `type: "local"` servers
- Fixes "Skipping — no launch command defined" for all first-party MCP servers

### Project Agent Cleanup
- Deleted from `.nocowboy/agent/`: canonical.md, hotreload.md, reviewer.md, upstream-merge.md

### Verification
- Typecheck: `tsgo --noEmit` — clean
- 174/174 agent-related tests pass, 0 failures

### Commit
```
ee4d8147c feat: v0.7.4 — P3 agent refactor: 15→5 agents, tool groups, delegation briefs
96ebe6b09 bump: v0.7.4 — package.json versions
e5868bd17 docs: update ROADMAP for v0.7.4
126e37b97 docs: add full architecture reference to ROADMAP
bb52b944d fix: MCP Launcher fallback to config command for local servers
```

---

## v0.7.3 — Dogfooding Release (2026-07-02)

### Identity & Self-Hosting
- **Soul rewritten**: from "You are Kilo" to NoCowboy existential identity
- Architecture: soul compiled into binary, injected first in every LLM call, part of DeepSeek prefix-cache stable prefix

### P2-A1 MCP Server Management
| Phase | Task | Evidence |
|---|---|---|
| 1 | Add vendor field to MCP config schema | `config/mcp.ts:7-11` |
| 2 | Fix nocowboy init — populate default servers | `cli/cmd/init.ts:61-87` |
| 3 | Settings tab MCP server list with live status | `sidebar/mcp.tsx:20-74` |
| 4 | Full MCP management dialog (enable/disable, add, remove, logs, filter) | `dialog-mcp.tsx:47-71` |
| 5 | Auto-start MCP servers on first TUI launch | `mcp/index.ts:529-565` |

### P1.6 Test Harness & Root Cause Debug
- Found root cause: Flag.NOCOWBOY_DB static capture + preload not auto-loading
- Fixed: Flag getter/setter, direct env reads, resetDatabase expanded
- Added KILO_* → NOCOWBOY_* backward compat
- Per-process test runner (263→22 failures)
- Fixed 13 rebranding test files + 9 timing-dependent tests
- **Full suite: 231 pass / 0 fail**

### Daemon
- Daemon v0.6.0: soul embeddings (sqlite-vec + mxbai-embed-large)
- Daemon v0.5.0: ed25519 identity, SQLite WAL, WebSocket
- Every thought → 1024D vector

### Core Infrastructure
| Feature | Evidence |
|---|---|
| Compiled binary (227MB) | `script/build.ts:291-313` |
| Shared MCP architecture | All servers via HTTP/SSE on port 92xx |
| Embedded MCP proxy | `_proxy` subcommand |
| Plugin auto-detect | `mcp install <name>` via `require.resolve` |
| Provider-agnostic | 200+ models via LiteLLM proxy |
| npm publishing pipeline | `script/publish.ts` (217 lines) |
| Per-system packaging removed | 24 files deleted |

### Configuration
- 14 instructions (was 16): branding fixed, agent refs updated, no-shortcuts merged into eng-rules, cybersecurity → puppetmaster MCP
- 5 agents refactored
- 16 commands: `/repomap`, `/init`, `/verify`, `/goal` added
- 8 skills ported + 4 Ralph-TUI skills
- Global config only (`~/.config/nocowboy/nocowboy.json`)

### P0 — Cost & Size Optimization
| # | Feature |
|---|---|
| P0.1 | DeepSeek prefix-cache (soul at index 0, 2-part collapse) |
| P0.2 | Lazy-load tree-sitter WASMs |

### P1 — MiMo Memory & Reasoning
| # | Feature | Status |
|---|---|---|
| P1.1 | Memory System — FTS5, reconcile | ✅ |
| P1.3 | Goal judge (`/goal`) | ✅ |
| P1.5 | Task tree — hierarchical IDs | ✅ |
| P1.6 | Test harness — 231/231 green | ✅ |

### Features Borrowed
| Feature | From |
|---|---|
| Repomap | Aider |
| Memory FTS5 | MiMo (MIT) |
| Multi-turn approval memory | Codex CLI |
| Zero-config wizard | Copilot CLI |
| Goal judge | MiMo |
| Incremental PR review | Qodo CLI |
| Indexing first-class | Self |
| SQLite vector store | Self |
| Voice input | Self |
| Deep context mode | MiMo |

### Bugs Fixed (Dogfooding Day 1)
- SolidJS render crash: useTheme() before memos
- Name collision: config explore.md overrode native explore (subagent)
- Name collision: config plan.md overrode native plan (safety mode)
- Telemetry shutdown timeout
- Empty install URL
- Gateway URL undefined
- Missing env var fallbacks
- SolidJS preload config

### Commit
```
9c6b95892 feat: daemon v0.6.0 — soul embeddings
546f2b10b feat: nocowboy agent + daemon v0.5.0
167488f3b 🐕 DOGFOODING DAY 1 — first self-commit
```

---

## v0.7.0 — LSP/UI Polish (2026-06-27)

### LSP Toggle Fix
| Issue | Root cause | Fix |
|---|---|---|
| Toggle didn't work | `=== true` only | Changed to truthy check |
| Click ignored | `onMouseDown` on `<box>` | Moved to `<text>` |
| Config wrong file | Ancestor `.opencode/` priority | Local root files first |
| TUI no refresh | `sync.data.config` never updated | `config.get()` + `sync.set()` |

### Balance Checking
- Kimi: `api.moonshot.ai/v1/users/me/balance`
- DeepSeek: `api.deepseek.com/user/balance`
- Auto-detection by providerID + model fallback
- TLS self-signed certs bypassed

### Settings Tab UI
- LSP: colored status (green/yellow/red)
- Code Indexing: colored live status
- Tab order: Info → History → Settings
- Section order: Code Indexing above LSP
