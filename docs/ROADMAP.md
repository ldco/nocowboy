# NoCowboy — Roadmap

**v0.7.4** | 2026-07-03 | 🔧 P3 AGENT REFACTOR — 15→5 agents, tool groups, delegation briefs, MCP Launcher fix

**v0.7.3** | 2026-07-02 | 🐕 DOGFOODING RELEASE — first release fit for dogfooding

**v0.7.0** | 2026-06-27 | LSP toggle fix + Balance checking + Settings/Info UI polish

**Audited:** 2026-07-03 — every ✅ verified against actual codebase. Evidence: commit SHAs, file paths, test output.

---

## Архитектура: три слоя

### Слой 1 — Agents (КТО делает работу)

| Агент | Тип | Модель (default) | Группы инструментов | Назначение |
|-------|-----|-----------------|---------------------|------------|
| **code** | coding | Flash | read, edit, command, mcp | Пишет код, рефакторит, тестирует |
| **architect** | coding | Pro | read, command, mcp + edit(docs/*.md) | Планы, ADR, C4, дизайн системы |
| **debug** | coding | Flash | read, edit, command, mcp | Систематическая отладка |
| **overseer** | review | **Kimi K2/Pro** | read, command, mcp | Traycer-like: оркестрирует code, ревьюит (cross-vendor) |
| **nocowboy** | automation | Flash | Все | OpenClaw-like: браузер, файлы, система, anything |
| **jurist** ⛔ | удалён | — | — | Заменён на skill `russian-it-law` + инструкция `russian-law.md` |

**Always-available meta-tools:** `task`, `question`, `todowrite` — встроены в каждого агента, не отключаются пользователем.

**Tool groups** (resolve → permissions):
- `read` → read, grep, glob, list, codebase_search, semantic_search
- `edit` → edit, write
- `command` → bash
- `mcp` → все MCP инструменты (динамически)

**Файлы:** `packages/opencode/src/agent/agent.ts`, `src/nocowboy/agent/index.ts`, `packaging/config/nocowboy.json`, `packaging/config/agent/*.md`

### Слой 2 — Instructions (КАК делается работа)

| Файл в `packaging/config/instructions/` | Тема |
|-----------------------------------------|------|
| `engineering-rules.md` | Правила кодинга: anti-shortcut, no workarounds, no ts-ignore, fix root cause |
| `no-shortcuts.md` | Почему нельзя shortcuts — golden rules enforcement |
| `cybersecurity.md` | Безопасность: секреты, инъекции, уязвимости |
| `russian-law.md` | 152-ФЗ, персональные данные, согласия |
| `structured-output.md` | Формат вывода: всегда markdown fence, строгий JSON |
| `auto-memory.md` | Когда и как сохранять memory |
| `hooks-system.md` | Как работают lifecycle хуки |
| `channels.md` | Webhooks/push в TUI сессии |
| `multi-provider.md` | Как работают провайдеры и модели |
| `repo-map.md` | Как работает repomap |
| `aider-features.md` | Фичи из Aider (search/replace edit, architect mode) |
| `sandbox.md` | Песочница для изолированного выполнения |
| `path-rules-loader.md` | Как загружаются path-based rules |

**Загружается в каждый LLM вызов** — всегда актуально.

**Файлы:** `AGENTS.md`, `packaging/config/instructions/*.md`, `~/.config/nocowboy/instructions/*.md`

### Слой 3 — Nutausik MCP (УПРАВЛЯЕТ работой)

| Домен | Инструменты | Назначение |
|-------|------------|------------|
| **Tasks** | task_add, task_start, task_done, task_review, task_plan, task_step | Дерево задач: plan → active → review → done |
| **Epics/Stories** | epic_add, epic_list, story_add, story_update | Укрупнённое планирование |
| **Memory** | memory_add, memory_list, memory_search, memory_surface, memory_compact | Постоянная память: паттерны, gotchas, конвенции |
| **Decisions** | decision_add, decision_list, memory_decide | Журнал принятых решений |
| **Gates** | gates_list, gates_enable, gates_disable | Quality gates (QG-0, QG-1, QG-2) |
| **Specs** | spec_add, spec_list, spec_show | Спецификации: ARCH, API, DATA, INT, PROC, UI, AI, SEC, OPS |
| **ADAPT** | adapt_add, adapt_list | Design artifacts |
| **Verification** | verify, ac_evidence_log, ac_evidence_list, receipt_show | Верификация AC + ресипты |
| **Brain** | brain_search, brain_publish, brain_artifact, brain_sync | База знаний |
| **FTS** | fts_search | Полнотекстовый поиск по всему |
| **Sessions** | session_start, session_end, session_handoff | Управление сессиями |
| **Explore** | explore_start, explore_end | Отслеживание research |
| **Web** | web_search, web_fetch, web_cache_clear | Веб-поиск с кешированием |

**Всего:** 80+ инструментов. MCP сервер на порту 9204.

**Файлы:** отдельный репозиторий `nutausik-js/packages/nutausik/`

---

## ✅ VERIFIED DONE — v0.7.0

### LSP Toggle Fix
| Issue | Root cause | Fix | Evidence |
|---|---|---|---|
| Toggle didn't work | `lspEnabled()` checked `=== true` only | Changed to `!!sync.data.config?.lsp` (truthy) | `sidebar.tsx:111` |
| Click ignored | `onMouseDown` on `<box>` not handled by OpenTUI | Moved to `<text>` matching all working patterns | `sidebar.tsx:184-191` |
| Config wrote to wrong file | Ancestor `.opencode/opencode.jsonc` took priority over local `nocowboy.jsonc` | Swapped order in `projectConfigUpdateTarget`: local root files first | `config.ts:65-81` (comment at :76-79) |
| TUI didn't refresh after write | `sync.data.config` never updated after `config.update` | Added `config.get()` + `sync.set()` post-update | `sidebar.tsx:125`, `sync.tsx:433-434` |

### Balance Checking
| Provider | Endpoint | Response field |
|---|---|---|
| Kimi/Moonshot AI | `GET api.moonshot.ai/v1/users/me/balance` | `data.available_balance` |
| DeepSeek | `GET api.deepseek.com/user/balance` | `balance_infos[USD].total_balance` |

- Auto-detection by `providerID` + model ID fallback (handles gateway-routed models)
- TLS self-signed certs bypassed for both endpoints
- Provider `baseURL` option used when configured
- Dynamic balance labels per provider

### Settings Tab UI
| Element | Before | After |
|---|---|---|
| LSP | Plain text "LSP: Enabled — click to toggle" | Bold label + colored status (green/yellow/red) + separate clickable line |
| Code Indexing | Just "Open indexing configuration →" | Bold label + colored live status + configuration link |
| Tab order | History → Info → Settings | **Info → History → Settings** |
| Section order | LSP above Code Indexing | **Code Indexing above LSP** (matches Info tab) |

### Info Tab
| Element | Before | After |
|---|---|---|
| LSP bullet | No bullet when all disabled | Colored • matching Code Indexing (green/red/muted) |

---

## ✅ VERIFIED DONE — P2-A1 MCP Server Management & Dogfooding Blocker

**Plan:** `docs/plans/p2-mcp-management.md` | **Status:** ✅ Dogfooding release v0.7.3

| Phase | Task | Status | Evidence |
|---|---|---|---|
| 1 | Add vendor field to MCP config schema | ✅ | `config/mcp.ts:7-11` (VENDOR const), `:21, :41, :88` (vendor in schemas) |
| 2 | Fix nocowboy init — populate default servers | ✅ | `cli/cmd/init.ts:61-87` (13 servers with names/vendors/ports), `:113-141` (auto-start) |
| 3 | Settings tab MCP server list with live status | ✅ | `sidebar/mcp.tsx:20-74` (status dots+labels), `dialog-mcp.tsx:28-45` (dialog list) |
| 4 | Full MCP management dialog (enable/disable, add, remove, logs, filter) | ✅ | `dialog-mcp.tsx:47-71` (toggle), `mcp.ts:459` (add), `:968` (remove), `:951` (logs) |
| 5 | Auto-start MCP servers on first TUI launch | ✅ | `mcp/index.ts:529-565` (MCP state init auto-starts enabled servers) |

**Taxonomy:** 9 first-party (`vendor: "nocowboy"`) + 4 community (`vendor: "community"`) — `init.ts:75-80`

---

## ✅ DONE — v0.7.4 Agent Refactor

### Agent Reduction: 15 → 5

| Agents kept | Status | Role |
|---|---|---|
| **code** | ✅ | Main coding agent (was build). Full tools + semantic_search |
| **architect** | ✅ | Systems design, ADR, C4. read+command+mcp groups, only docs edit |
| **debug** | ✅ | Systematic debugging methodology |
| **overseer** 🆕 | ✅ | Traycer-like: orchestrates code, reviews with DIFFERENT model (cross-vendor bug detection) |
| **nocowboy** 🆕 | ✅ | OpenClaw-style general-purpose automation: browser, fs, CLI, APIs |

**Removed (10):** general, explore, scout, plan, ask, prd, ralph, researcher, code-reviewer, orchestrator

### Tool Groups
| Feature | What | Evidence |
|---|---|---|
| **groups field** | `ConfigAgent.Info` schema: `["read","edit","command","mcp"]` → resolves to baseline perms | `config/agent.ts:117-128` |
| **Always-available meta-tools** | `task`, `question`, `todowrite` merged into every agent after user perms (not overridable) | `nocowboy/agent/index.ts` `META_TOOLS` |
| **Delegation Briefs** | Structured handoff overseer→code: QUESTION/SCOPE/ALREADY_KNOWN/EFFORT/STOP_CONDITION/OUTPUT | `prompt/overseer.txt` |
| **Output Contract** | Sub-agent returns SUMMARY/CHANGES/EVIDENCE/RISKS/BLOCKERS | `prompt/overseer.txt` |

### Agent Prompts
| File | Change |
|---|---|
| `prompt/nocowboy.txt` | Rewritten: OpenClaw-style automation agent (Russian) |
| `prompt/overseer.txt` | New: review + orchestration agent (53 lines) |
| `prompt/ask.txt` | Deleted (agent removed) |
| `prompt/orchestrator.txt` | Deleted (P2-C1 cleanup) |
| `agent/architect.md` | YAML frontmatter added |

### Config Cleanup
| File | Change |
|---|---|
| `config/agent.ts` | `groups` field added to schema + KNOWN_KEYS |
| `config/config.ts` | Explicit keys for plan/ask/general/explore/scout removed |
| `nocowboy/nocowboy.json` | Old config agents removed, groups added to architect/overseer |
| `packaging/config/agent/` | code-reviewer.md, prd.md, ralph.md, researcher.md deleted |

### MCP Launcher Fix
- `Launcher.command()` now only used for servers without explicit `command` in config
- `mcp start` reads `command` from config directly for `type: "local"` servers
- Fixes "Skipping — no launch command defined" for all first-party servers
- `~/.nocowboy/mcp/launch.json` auto-populated from config

### Architecture Separation
| Layer | What | Lives in |
|---|---|---|
| **Agents** | WHO does work: prompts, permissions, tools, models | `agent.ts`, `nocowboy/agent/*`, `packaging/config/agent/` |
| **Instructions** | HOW work is done: rules, conventions, security | `AGENTS.md`, `packaging/config/instructions/` (13 files + 3 rules/) |
| **Nutausik MCP** | TRACKS work: tasks, memory, decisions, gates, specs | MCP server port 9204 (80+ tools) |

### Project Agent Cleanup
| File | Action |
|---|---|
| `.nocowboy/agent/canonical.md` | Deleted — stale project agent |
| `.nocowboy/agent/hotreload.md` | Deleted — stale project agent |
| `.nocowboy/agent/reviewer.md` | Deleted — referenced old `kilo/gpt-5.5` model |
| `.nocowboy/agent/upstream-merge.md` | Deleted — stale 20KB legacy agent |

### Verification
- `tsgo --noEmit` — clean
- Agent tests: **34/34 pass, 0 fail**
- Permission override tests: **4/4 pass**
- Plan-exit detection: **15/15 pass**
- Plan-followup: **28/28 pass**
- **174/174 agent-related tests pass, 0 failures**

---

## ✅ DONE — P1.6 Test Harness & Root Cause Debug

| Step | Task | Status | Evidence |
|---|---|---|---|
| 1 | Find when test failures appeared in git history | ✅ | Flag.NOCOWBOY_DB static capture + preload not auto-loading |
| 2 | Identify root cause commit | ✅ | Commit `83612b901c46` — preload must be explicitly specified |
| 3 | Fix root cause in source code | ✅ | Flag getter/setter (`flag.ts:83-89`), direct env reads (`db.ts:42`), resetDatabase expanded (`fixture/db.ts:4-18`) |
| 4 | Add `KILO_*` → `NOCOWBOY_*` backward compat in source | ✅ | `flag.ts:114-116`, `background-process/index.ts:171-173`, `dev-setup.ts:289` |
| 5 | Per-process test runner isolates shared state | ✅ | `script/test-runner.ts` — 263→22 failures |
| 6 | Fix 13 rebranding-related test files | ✅ | nvidia-headers, cli/error, cli-shutdown, question-option, indexing-auth, dev-setup, session-share, upgrade, config-sources, builtin-skills, model-filter, prompt-training-model-filter, thread |
| 7 | Fix remaining 9 timing-dependent tests | ✅ | codex-auth-refresh (path fix), indexing-dialog-state (gateway URL), daemon (env vars), plan-exit-detection (ANSWER_REFINE), plan-followup (ANSWER_REFINE), session-fork-remap (preload env), session-prompt-queue (missing model), tui-sync-event (SolidJS preload), diff-full (timeout) |
| 8 | Full test suite verified | ✅ | **231 pass / 0 fail** — `bun run script/test-runner.ts test/nocowboy` |

---

## ✅ VERIFIED DONE

### Core Infrastructure
| Feature | Source | Evidence |
|---|---|---|
| Compiled binary (`bun build --compile`) | Self | Binary on PATH at `~/.local/bin/nocowboy`. Build script: `script/build.ts:291-313`. Actual size: **227MB** (not 155MB as previously claimed) |
| Shared MCP architecture | Self | All servers via HTTP/SSE on port 92xx. `lifecycle.ts:61,86` |
| Embedded MCP proxy | Self | `_proxy` subcommand. `mcp.ts:1010-1020`. No external deps. |
| Plugin out/plugin in MCP | Self | `mcp install <name>` auto-detects via `require.resolve`. `launcher.ts:30-35`, `mcp.ts:828-859` |
| Provider-agnostic | Kilo/inherited | 200+ models via LiteLLM proxy. `multi-provider.md`, `session/llm.ts:218,258` |
| npm publishing pipeline | Self | Full pipeline in `script/publish.ts` (217 lines). Per-platform packages with `os`/`cpu` fields + postinstall. |
| Per-system packaging removed | Self | 24 files deleted in commit `2140222f6`. AUR, systemd, homebrew, launchd removed. |

### MCP Commands
| Command | What | Evidence |
|---|---|---|
| `mcp start/stop/status/logs` | Lifecycle management | `mcp.ts:865-913` |
| `mcp install <name>` | Auto-detect + npm install + configure | `mcp.ts:823-862` |
| `mcp remove <name>` | Stop + config removal + launch cleanup | `mcp.ts:968-1007` |
| `mcp add` | Interactive dialog for custom servers | `mcp.ts:459` |

### Features Borrowed
| Feature | From | What | Status |
|---|---|---|---|
| Repomap | Aider | Token-optimized repo summary | ✅ |
| Memory FTS5 | MiMo (MIT) | Full-text search, reconcile, auto-dream (scheduled, no `/dream` slash command yet) | ✅ `memory/schema.ts`, `memory/index.ts`, `memory/fts-query.ts` |
| Multi-turn approval memory | Codex CLI | In-memory per-session cache | ✅ |
| Zero-config wizard | Copilot CLI | `nocowboy init` — 2 questions | ✅ |
| Goal judge | MiMo | `/goal` with independent subagent evaluation | ✅ `session/goal.ts` |
| Incremental PR review | Qodo CLI | Code-reviewer checks only git diff | ✅ |
| Indexing first-class | Self | Not a plugin | ✅ |
| SQLite vector store | Self | Replaced LanceDB | ✅ |
| Voice input | Self | FFmpeg capture + transcription | ✅ `voice-button.tsx` (97 lines) |
| Deep context mode | MiMo | Repomap + memory in system prompt | ✅ |

### Configuration
| Item | What |
|---|---|
| 16 instructions | Ported + rebranded Kilo → NoCowboy |
| 5 agents (code, architect, debug, overseer, nocowboy) | Refactored from 15. Architect prompt synced to full 8330 chars. |
| 16 commands | Ported + `/repomap` + `/init` + `/verify` + `/goal` added. `/dream` and `/distill` ❌ not implemented yet (P1.7, P1.8). |
| 8 skills | Ported + 4 Ralph-TUI skills |
| Global config only | `~/.config/nocowboy/nocowboy.json` — no per-project by default |

### Tests
| Item | Status |
|---|---|
| Test harness: preload, Flag getter, resetDatabase guard | ✅ `test/preload.ts`, `flag.ts:83-89`, `fixture/db.ts:4-18` |
| Custom per-process test runner (no shared state between files) | ✅ `script/test-runner.ts` |
| Full test suite | ✅ **231 pass / 0 fail** — `bun run script/test-runner.ts test/nocowboy` |

### P0 — Cost & Size Optimization

| # | Feature | Done | Evidence |
|---|---|---|---|
| P0.1 | **DeepSeek prefix-cache** | ✅ | `session/llm.ts:136-168` — soul at index 0, identity anchor as last element, 2-part collapse for caching |
| P0.2 | **Lazy-load tree-sitter WASMs** | ✅ | `tool/shell.ts:332-357` — dynamic `import()` with `type: "wasm"` for web-tree-sitter, bash, powershell WASMs in `lazy()` wrapper |

### P1 — MiMo Memory & Reasoning

| # | Feature | Done | Evidence |
|---|---|---|---|
| P1.1 | **Memory System** — paths, memory service, FTS5 scope/scope_id filters, lazy reconcile | ✅ | `memory/schema.ts` (FTS5 virtual table), `memory/index.ts` (MemoryService with bm25()), `memory/paths.ts` |
| P1.2 | **Checkpoint writer** — boundary, context, validator, progress-reconcile, retry, templates, saver | 🟡 | 7 files ported (`session/checkpoint-*`), but NOT fully wired into session loop (compaction/overflow triggers may not fire). Need to verify integration in `session/prompt.ts`. |
| P1.3 | **Goal judge** — GoalService with AI SDK judge evaluation | ✅ | `session/goal.ts` — `GoalService.evaluate()` with `generateObject` at temperature=0 |
| P1.4 | **Auto-dream / Distill** — interval-based scheduled memory consolidation | 🟡 | `auto-dream.ts` exists with `shouldAutoDream()` (7d) and `shouldAutoDistill()` (30d), but **NO `/dream` or `/distill` slash command** for manual invocation. |
| P1.7 | **`/dream`** — ручная команда для запуска dream memory consolidation | Medium | ❌ Нет — только auto-scheduled раз в 7 дней. В MiMo есть ручной `/dream`. |
| P1.8 | **`/distill`** — ручная команда для запуска distill (workflows → skills) | Medium | ❌ Нет — только auto-scheduled раз в 30 дней. В MiMo есть ручной `/distill`. |
| P1.9 | **Checkpoint-writer в session loop** — интеграция checkpoint сабэджента в compaction/overflow | Medium | ❌ Не до конца заведено — триггеры могут не срабатывать. |
| P1.5 | **Task tree** — TaskID (T1/T1.1), CRUD registry, stop-gate, gate-state | ✅ | `task/schema.ts`, `task/registry.ts` — hierarchical IDs with SQLite persistence |
| P1.6 | **Test harness** — fix parallel flaky failures | ✅ | **231/231 pass, 0 fail** — fully green |

---

## ❌ NOT DONE

### P2 — UX, Safety & Russian

#### P2-A UX & Safety

| # | Feature | From | Effort | Status |
|---|---|---|---|---|
| P2-A1 | **Server management UI** — enable/disable, remove, install MCP servers in Settings | Self | Medium | ✅ DONE (see P2-A1 above) |
| P2-A2 | **Search/replace edit format** | Aider | Medium | ❌ No Aider-style block-diff parser implemented |
| P2-A3 | **Branch-per-task** (`nocowboy plan --branch`) | Plandex | Medium | ❌ No `plan` CLI command exists |
| P2-A4 | **Permission timeout** — auto-deny after N seconds | Claude Code | Low | ❌ No timeout mechanism in permission system |
| P2-A5 | **Yolo mode button** — chat doesn't ask any permissions when active. Toggle in TUI status bar or Settings. Sets permission to `"allow"` for all tools. | Claude Code | Low | ❌ Not implemented. Must have: TUI button, config toggle (`yolo: true`), permission override, visual indicator (red/yellow/green). Nice-to-have: keyboard shortcut, auto-disable on session end. |
| P2-A6 | **Autonomy slider** — full auto ↔ step-by-step in Settings | Plandex | Low | ❌ Not in config, TUI, or settings |
| P2-A7 | **NUTAUSIK integration** — hybrid ProjMgmt | Self | High | 🟡 PARTIALLY — nutausik MCP server running (80+ tools: tasks, memory, decisions, gates, specs, sessions). But not fully integrated into agent workflows. |

#### P2-B Russian Language

| # | Feature | Effort | Status |
|---|---|---|---|
| P2-B1 | **Russian system prompts** for all agents | Medium | 🟡 PARTIALLY — nocowboy agent prompt is already in Russian. Others need translation. |
| P2-B2 | **Russian instruction files** (`instructions/ru/`) — all 16 instructions | Medium | ❌ Directory exists but is EMPTY |
| P2-B3 | **Russian LLM provider preference** — auto-select YandexGPT/GigaChat when `lang: "ru"` | Medium | ❌ No YandexGPT/GigaChat in config or providers |
| P2-B4 | **`nocowboy.json` `lang` field** | Low | ❌ Not in config schema |
| P2-B5 | **UI Russian localization** — TUI labels, error messages, help text | High | ❌ No i18n infrastructure in TUI |

#### P2-C Codebase Optimization

| # | Feature | Effort | Status |
|---|---|---|---|
| P2-C1 | **Agent Audit** — rename `plan`→`researcher`, remove deprecated agents | Medium | ✅ P2-C1 + P3 refactor: 15→5 agents (code, architect, debug, overseer, nocowboy). Removed: general, explore, scout, plan, ask, prd, ralph, researcher, code-reviewer, orchestrator. |
| P2-C2 | **Analyze & optimize 16 instructions** | Medium | 📋 DEFERRED — analyzed 2026-07-03, 5 files need branding fix, 2 reference removed agents, 2 overlap, 1 irrelevant (see docs/deferred/) |
| P2-C3 | **Analyze & optimize 16 commands** | Medium | ❌ Not started |
| P2-C4 | **Revise MCP server framework** — merge overlapping ones into NUTAUSIK | High | 📋 DEFERRED — see docs/deferred/ for full analysis |
| P3-C1 | **Tool groups** — composable groups (read/edit/command/mcp) instead of per-tool permisisons | Medium | ✅ v0.7.4 — `groups` field in `ConfigAgent.Info`, resolves to baseline permissions. Always-available meta-tools (task, question, todowrite). |
| P3-C2 | **Delegation Briefs** — structured handoff overseer→code | Medium | ✅ v0.7.4 — QUESTION/SCOPE/ALREADY_KNOWN/EFFORT/STOP_CONDITION/OUTPUT format in overseer prompt |
| P3-C3 | **Output Contract** — structured sub-agent results | Medium | ✅ v0.7.4 — SUMMARY/CHANGES/EVIDENCE/RISKS/BLOCKERS format in overseer prompt |

### P3 — Ecosystem, Lawer & Reach

#### P3-A Ecosystem

| # | Feature | From | Effort | Status |
|---|---|---|---|---|
| P3-A1 | **Diff review sandbox** — AI changes isolated until accepted | Plandex | High | ❌ Not implemented |
| P3-A2 | **Sandbox mode** — Docker-insulated command execution | OpenHands | High | ❌ Not implemented |
| P3-A3 | **2M token context** — deep context with token budgeting | Claude Code + Plandex | High | ❌ Not implemented |
| P3-A4 | **Tree-sitter repomap** — upgrade regex → AST (37 WASMs ready) | Plandex | Medium | ❌ Repomap still uses regex/file-extension scanning |
| P3-A5 | **MCP server marketplace** (`mcp search`) | Cline | Medium | ❌ No marketplace command |
| P3-A6 | **Vector store switcher** — SQLite / LanceDB / Qdrant in Settings | Self | Medium | 🟡 PARTIALLY DONE — LanceDB and Qdrant backends exist in codebase, but no Settings UI switcher |
| P3-A7 | **Offline mode** — local LLM via Ollama | Self | Medium | 🟡 PARTIALLY DONE — Ollama option exists in `init.ts` and config overlay, but not full offline mode |

#### P3-B Lawer (152-ФЗ)

| # | Feature | Effort | Status |
|---|---|---|---|
| P3-B1 | **Lawer agent** — new agent type, 152-FZ expert | High | ❌ Not implemented |
| P3-B2 | **Consent dialogs** — Russian, Art. 9 | Medium | ❌ Not implemented |
| P3-B3 | **Data localization** — Art. 21 | High | ❌ Not implemented |
| P3-B4 | **Right to deletion** — `nocowboy forget` | Medium | ❌ Not implemented |
| P3-B5 | **Roskomnadzor template** | Low | ❌ Not implemented |

### P4 — Polish & Future

| # | Feature | From | Effort | Status |
|---|---|---|---|---|
| P4.1 | **Channels** — webhooks push CI/chat events into TUI sessions | Claude Code | Medium | 🟡 PARTIALLY DONE — Hooks/Channels MCP tools exist and are available, but not documented/stable |
| P4.2 | **Russian LLM providers** (YandexGPT, GigaChat) | Self | High | ❌ Not implemented |
| P4.3 | **Share chat / sync between machines** | Self | High | 🟡 PARTIALLY DONE — `/share` and `/unshare` CLI commands exist, `SessionShare` service implemented. But cloud backend API not deployed. |
| P4.4 | **Turso driver swap** — `bun:sqlite` → `@tursodatabase/database` | Self | High (blocked) | ❌ Blocked on `drizzle-orm/libsql` |

---

## 📦 Publish queue (blocked on `@nocowboy` npm org)

| Package | Status |
|---|---|
| `nocowboy-linux-x64@0.7.4` | ✅ Built — v0.7.4 |
| `nocowboy` meta-package | ❌ |
| `@nocowboy/mcp-*` (6 servers) | ❌ |
| `@nocowboy/mcp-puppetmaster` | ❌ needs `dist/` built |
| `@nocowboy/mcp-nutausik` (NUTAUSIK) | ❌ 62 TS files ready, needs publish |

---

## 🆕 2026-07-02 — Competitive Borrowing (from Paul + full re-review)

Added after analyzing Paul (Plan-Apply-Unify Loop, github.com/ChristopherKahler/paul) and re-reviewing all 15+ competitors.

### P2-A UX & Safety — additions

| # | Feature | From | Effort | Status |
|---|---|---|---|---|
| P2-A8 | **UNIFY loop closure** — обязательное закрытие плана. Сравнивает plan vs actual, создаёт SUMMARY.md, логирует decisions, обновляет STATE.md. Предотвращает orphan-планы. | Paul | Medium | ❌ Не реализовано. У нас есть architect (plans) + overseer (review) но нет принудительного закрытия цикла. |
| P2-A9 | **Execute/Qualify loop** — после каждой задачи независимая верификация против acceptance criteria перед переходом к следующей. Anti-rationalization enforcement (не даёт ложно закрыть задачу). | Paul | Medium | ❌ `/verify` есть но опционально, не встроен в flow исполнения. |
| P2-A10 | **Acceptance-Driven Development** — BDD формат (Given/When/Then), задачи ссылаются на AC (AC-1, AC-2), AC определены ДО задач. | Paul | Medium | ❌ PRD имеют acceptanceCriteria но free-text, без BDD и без linking к задачам. |
| P2-A11 | **Diagnostic failure routing** — классификация ошибок: intent (перепланировать) / spec (поправить план) / code (фикс на месте). Предотвращает патчинг кода когда план неверен. | Paul | Low | ❌ Нет классификации ошибок. |
| P2-A12 | **Coherence check** — план валидируется против PROJECT.md/MEMORY.md/STATE.md/ROADMAP.md ДО утверждения. | Paul | Medium | ❌ Нет автоматической валидации планов. |
| P2-A13 | **Session handoff/pause** — `/pause [reason]` создаёт HANDOFF-{date}.md, `/resume` восстанавливает контекст, `/progress` показывает следующий шаг. | Paul | Medium | ⚠️ Частично — session resume есть, но нет pause/handoff команд. |
| P2-A14 | **Escalation statuses** — DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED вместо binary pass/fail. | Paul | Low | ❌ Только pass/fail. |
| P2-A15 | **Commands tab** — новая вкладка в TUI перед Settings (Info → History → Commands → Settings). Показывает список всех доступных команд с описанием, примерами использования, и возможность кликнуть/выполнить команду прямо из таба. Команды сгруппированы по категориям (Git, Memory, MCP, Session, и т.д.). Иконки/цвета для быстрой идентификации. Фильтр/поиск по командам. | Self | Medium | ❌ Не реализовано. Сейчас команды известны только через `/help` или AGENTS.md. Нет визуального интерфейса для изучения и запуска команд. |

### P3-A Ecosystem — additions

| # | Feature | From | Effort | Status |
|---|---|---|---|---|
| P3-A8 | **Per-task cost tracking** — стоимость в токенах/деньгах за каждую задачу. Ledger с timestamped записями. | Paul (ledger.toml), Whale | Medium | ❌ Только баланс провайдера, без per-task. |

