# NoCowboy — Changelog

## v0.6.1 — Fork & Foundation (2026-06-24)

**ПРЕДУПРЕЖДЕНИЕ:** Этот раздел содержит пункты, перенесённые из оригинального ROADMAP (v0.6.1).
Часть из них подтверждена кодом, часть — нет. Помечены `[verified]` / `[unverified]`.

### Core Infrastructure — подтверждено кодом
- **DONE** [verified] Форк от Kilo Code (TypeScript + Bun + SolidJS + OpenTUI) — вся кодовая база
- **DONE** [verified] Компиляция в single binary — `scripts/build.ts` существует
- **DONE** [verified] Repomap — `nocowboy repomap` в `src/cli/cmd/repomap.ts`, авто-инжекция в `system-prompt.ts`
- **DONE** [verified] Goal judge — `/goal` команда с subagent-оценкой
- **DONE** [verified] Voice input — `voice-button.tsx` в TUI
- **DONE** [verified] Memory FTS5 (MiMo) — полнотекстовый поиск
- **DONE** [verified] Multi-turn approval memory — `src/permission/index.ts`
- **DONE** [verified] Deep context — repomap + memory в system prompt
- **DONE** [verified] Global config — `~/.config/nocowboy/nocowboy.json`
- **DONE** [verified] Indexing — `src/nocowboy/indexing.ts`
- **DONE** [verified] Russian system prompts — `code.ru.txt`, `debug.ru.txt`
- **DONE** [verified] ADR: Turso Database adoption — `docs/reference/turso-database-adoption.md`
- **DONE** [verified] Поле `lang` в схеме конфига

### Core Infrastructure — НЕ подтверждено кодом (требует проверки)
- [unverified] npm publishing pipeline — platform packages + meta-package
- [unverified] Shared MCP server architecture — все инстансы через HTTP/SSE
- [unverified] Embedded MCP proxy — zero external deps
- [unverified] Plugin out/plugin in MCP
- [unverified] Launch spec registry
- [unverified] Provider-agnostic — 200+ моделей через LiteLLM
- [unverified] Zero-config wizard — `nocowboy init`
- [unverified] Incremental PR review — code-reviewer по git diff
- [unverified] SQLite vector store (LanceDB replacement)
- [unverified] 16 инструкций + 6 агентов + 16 команд портированы
- [unverified] 8 skills портированы

## v0.8.0 — Full Auto-Wiring (2026-07-08)

**NUTAUSIK companion: v0.3.0**

### NUTAUSIK Auto-Wiring (Phases 2-4)
- **DONE** `context_inject` — `fetchContext()` в каждом системном промпте
- **DONE** Session auto-wiring — `onSessionCreated`/`onSessionEnded` через `autoCreateTask`/`autoEndSession`
- **DONE** `fetchCoherenceCheck()` при старте сессии
- **DONE** `nutausik-auto-wire.ts` — замена shell-хуков на нативный код
- **DONE** Авто-проверка AC: правило 6 в `criticalRules()` — LLM проверяет AC перед `task_done`
- **DONE** `nutausik-client.ts` — вызов `nutausik_task_log` для любого tool
- **DONE** `autoEndSession()` логирует `task_log(phase: "close")` при завершении
- **DONE** Пер-тул логирование: авто-регистрация PostToolUse hook в `.nocowboy/hooks.json`

### Session Handoff
- **DONE** Авто-сохранение HANDOFF при завершении
- **DONE** Авто-загрузка HANDOFF при старте
- **DONE** Интеграция через `nutausik-client.ts`

### Escalation Statuses
- **DONE** DONE / DONE_WITH_CONCERNS / BLOCKED в critical rules (rule 6)

### Verification Pipeline
- **DONE** `scripts/verify-roadmap.ts` — механический страж false positive DONE
- **DONE** `.husky/pre-commit` — typecheck + verify-roadmap.ts при каждом коммите
- **DONE** `docs/attestations/` — человеческая подпись DONE-пунктов

## v0.7.9
### v0.7.9 — Sandbox + Share (2026-07-06)
- **DONE** /sandbox-docker — Docker sandbox isolation template
- **DONE** /share — session sharing template

## v0.7.8 — Ecosystem & Compliance (2026-07-05)
### v0.9.0 — Ecosystem
- **DONE** /sandbox — built-in template: checkpoint, diff, confirm, apply/revert
- **DONE** /mcp — built-in template: search, install, list, remove MCP servers
- **DONE** /ollama — built-in template: auto-detect, configure, switch to local Ollama models

### v1.0.0 — Production (152-ФЗ Compliance)
- **DONE** P3-B1: LICENSE.md — Chapter 69 Civil Code РФ
- **DONE** P3-B2: Consent dialog на первом запуске TUI (consent_152fz)
- **DONE** P3-B4: /forget — команда очистки всех данных
- **DONE** P3-B3: Локализация данных — SQLite в .nutausik/ (уже было)
- **DONE** P3-B5: Правовое обоснование — уведомление РКН не требуется (docs/legal/152FZ-COMPLIANCE.md)
- **DONE** P3-B6: Полный правовой анализ 152-ФЗ (docs/legal/152FZ-COMPLIANCE.md)

### v1.0.0 — Publish
- **DONE** `scripts/publish-all.sh` — скрипт для публикации всех 9 MCP-пакетов
- **DONE** 9 пакетов `@nocowboy/mcp-*` готовы к публикации


## v0.7.7 — Template System Overhaul + Russian Language (2026-07-05)

### TUI — Templates Tab
- **DONE** Новая вкладка в sidebar: Info → History → **Templates** → Settings
- **DONE** Переименовано из "Commands" (конфликт с ctrl+p "Command Palette")
- **DONE** Клик открывает диалог ввода аргументов перед выполнением
- **DONE** Клик выполняет шаблон на текущей сессии через sdk.client.session.command()

### Agentic Template System — Cleanup
- **DONE** 18 built-in templates → 7 (plan, act, verify, commit, init, json, continue)
- **DONE** 12 dead/redundant/PM-contaminated templates удалены
- **DONE** PM-зависимые вызовы удалены из всех built-in templates
- **DONE** Server-hardcoded init удалён (дубль с template)
- **DONE** /continue — built-in template: читает ROADMAP, выполняет следующую задачу

### Skills Cleanup
- **DONE** 6 Kilo/ralph skills удалены
- **DONE** kilo-config → nocowboy-config (переименован, контент переписан)
- **DONE** 5 skills оставлены (frontend-design, web-design-guidelines, memory-manager, skill-evaluator, gh-issues)

### PuppetMaster MCP Refactoring
- **DONE** Удалён pm_git_commit (generic git, заменён на Git MCP)
- **DONE** Добавлены capabilities: { tools: {}, prompts: {} }
- **DONE** 5 PM prompt templates: pm_build_and_deploy, pm_init_project, pm_db_full_reset, pm_review_full, pm_contribute_workflow

### Git MCP — First-Party Wrapper
- **DONE** Создан packaging/mcp-servers/git/ — first-party MCP wrapper
- **DONE** Wrapper проксирует tool calls на uvx mcp-server-git
- **DONE** 5 prompt templates: commit, diff, undo, checkpoint, restore
- **DONE** tsc pass

### Russian Language
- **DONE** Поле lang в nocowboy.json (ru/en)
- **DONE** instructions/ru/ — 4 русские инструкции
- **DONE** Русские системные промпты: code.ru.txt, debug.ru.txt
- **DONE** Lang-based выбор: cfg.lang === "ru" → RU prompt
- **DONE** EN auto-memory.md переписан — NUTAUSIK-only

### Three-Dimensional System
- **DONE** ROADMAP.md — только невыполненное
- **DONE** CHANGELOG.md — выполненное
- **DONE** BACKLOG.md — идеи на будущее
- **DONE** AGENTS.md: запрещённая фраза "What next?"

### Backward Compatibility Removal
- **DONE** Все упоминания MEMORY.md удалены из инструкций
- **DONE** Kilo-референсы в nocowboy-config заменены на NoCowboy
- **DONE** kilo → nocowboy в upgrade.ts


## v0.7.6 — Token Cost Optimization + Identity Scoping (2026-07-04)

### Token Cost Investigation
- Full audit of per-message system prompt composition and cost drivers
- Identified: system prompt grew 2.5x (11K→27K chars) since initial fork due to repomap, soul identity, and instructions stacking
- Root cause of $5.63 peak day (July 3): 30× more messages/day than baseline + 2.5× larger system prompt
- NUTAUSIK excluded as cause (only ~200 chars/message, added after cost spike)
- Full analysis logged to NUTAUSIK memory (`gotcha: Token cost explosion`)

### Repomap Watcher-Based Cache
- **Before:** 30-second global timer — repomap regenerated on every message outside the window (scanning 500+ files)
- **After:** Cache keyed by project root, invalidated via `.git/index` mtime — repomap only rebuilt when files actually change
- Cache limit: 10 projects (multi-project safety)
- Saves ~750 tokens/message between file changes + eliminates redundant I/O

### soul.txt — 71% Reduction
- **Before:** 50 lines, 3,449 chars (860 tokens) — full biography, relationship manifesto, invariant behavior list
- **After:** 11 lines, 980 chars (245 tokens) — compact bullet points preserving identity, self-hosting, engineering spirit
- Core content preserved: identity invariant, self-improving, partner relationship, engineering precision

### Soul + Identity Anchor Only for nocowboy Agent
- **Before:** soul.txt + identityAnchor() injected into EVERY agent (code, debug, overseer, custom)
- **After:** Only `nocowboy` agent (automation/browser role) receives identity persona
- code/debug/overseer/custom agents: no soul, no identity anchor — pure engineering instructions
- Identity anchor at end of system block (recency bias reinforcement) also scoped to nocowboy agent
- Saves ~981 tokens/message for all non-nocowboy agents (~100% of current usage)

### YoloButton on Home (New Session) Page
- Added `<YoloButton />` to `home.tsx` prompt bar — was only present in existing session view
- Now toggle auto-approve mode before starting a session

### Auto-Dream (Critical Rules Enforcement)
- New rule #6: `**Auto-dream:** Before the session ends, call \`nutausik_memory_add\` with lessons learned`
- Categories: `pattern` (repeat), `gotcha` (pitfall), `convention` (decision), `dead_end` (wasted effort)
- NUTAUSIK memory is now the single source of truth (MEMORY.md deprecated and removed)

### MEMORY.md → NUTAUSIK Memory Migration
- All MEMORY.md read/write code removed from system-prompt.ts and session hooks
- `nutausik_context_inject` MCP tool is now the only memory injection path
- FTS5 memory index reconciled at session start

### Agent Quality Enforcement
- `nutausik_coherence_check` — validates plan steps against existing memory/decisions (injected on failure only)
- `nutausik_handoff_load` — restores previous session context via handoff system
- All three NUTAUSIK calls (context_inject, coherence_check, handoff_load) have 2-3s timeouts with silent fallback

### Overseer Prompt — Code Audit Procedure
- New Code Audit section: project-agnostic review checklist (TS strict, dead code, security, error handling)
- Verification cycle: Audit & Test → Review → Propose → Confirm → Apply → Verify

### Verification
- Typecheck: `tsgo --noEmit` — clean
- Only pre-existing LSP errors (unrelated core/test files)
- Config: nocowboy.json updated

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
