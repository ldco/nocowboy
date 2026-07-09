# NoCowboy — Changelog

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## v0.6.1 — Fork & Foundation (2026-06-24)

### Core Infrastructure

- **DONE** Форк от Kilo Code (TypeScript + Bun + SolidJS + OpenTUI)
- **DONE** Компиляция в single binary — `bun build --compile`
  `verify:grep package.json release`
- **DONE** Repomap — `nocowboy repomap`, авто-инжекция в system prompt
  `verify:file packages/opencode/src/nocowboy/repomap.ts`
  `verify:grep packages/opencode/src/nocowboy/system-prompt.ts RepoMap`
- **DONE** Memory FTS5 (MiMo) — полнотекстовый поиск по памяти
  `verify:file packages/opencode/src/nocowboy/memory`
- **DONE** Goal judge — `/goal` команда с subagent-оценкой
  `verify:file packages/opencode/src/nocowboy/session/goal.ts`
- **DONE** Voice input — FFmpeg + транскрипция
  `verify:grep packages/opencode/src/cli/cmd/tui voice`
- **DONE** Multi-turn approval memory — Allow once per session (Codex CLI style)
  `verify:file packages/opencode/src/permission/index.ts`
- **DONE** Deep context — repomap + memory в system prompt
- **DONE** Global config — `~/.config/nocowboy/nocowboy.json`
  `verify:file packages/opencode/src/config/config.ts`
- **DONE** Indexing — first-class (не плагин)
  `verify:file packages/opencode/src/nocowboy/indexing.ts`
- **DONE** Russian system prompts — `code.ru.txt`, `debug.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/code.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/debug.ru.txt`
- **DONE** ADR: Turso Database adoption (Phase 1 blocked, Phase 2 done)
  `verify:file docs/reference/turso-database-adoption.md`
- **DONE** Поле `lang` в схеме конфига
  `verify:file packages/opencode/src/nocowboy/config/config.ts`

- **DONE** SQLite vector store (LanceDB replacement, -15MB)
- **DONE** Zero-config wizard — nocowboy init
- **DONE** Provider-agnostic — 200+ models via LiteLLM
- **DONE** Embedded MCP proxy — zero external deps, cross-platform
- **DONE** Plugin out/plugin in MCP — auto-detect, npm install
- **DONE** Launch spec registry (~/.nocowboy/mcp/launch.json)
- **DONE** npm publishing pipeline — platform packages + meta-package
- **DONE** Incremental PR review — code-reviewer checks only git diff

## v0.7.4 — P3 Agent Refactor (2026-07-03)

- **DONE** Agent reduction: 15 → 5
  `verify:grep packages/opencode/src/nocowboy/agent code`
- **DONE** Tool groups — `groups` field in ConfigAgent
- **DONE** Tool groups for agents (read/edit/command/mcp)
- **DONE** Agent descriptions — короткие, readable (v0.7.4)

## v0.7.5 — P2 UX & Safety + NUTAUSIK Auto-Wiring (2026-07-04)

- **DONE** P2-A2: Search/Replace edit format (Aider-style)
- **DONE** P2-A3: Branch-per-task
- **DONE** P2-A4: Permission timeout (auto-deny)
- **DONE** P2-A5: Yolo mode toggle
- **DONE** AGENTS.md + code.txt + debug.txt — укреплённые инструкции
- **DONE** NUTAUSIK Phase 1 — hooks, NutausikDot, fix port + SQLite
- **DONE** NUTAUSIK v0.2.0 — context_inject, handoff, coherence, loop_close
- **DONE** NutausikDot — 3-state TopBar indicator (v0.7.5)
- **DONE** Todo injection — NUTAUSIK context block в system prompt (v0.7.5)

## v0.7.6 — Token Cost Optimization + Identity Scoping (2026-07-04)

- **DONE** Token cost investigation + repomap watcher cache
- **DONE** soul.txt — 71% reduction (3449→980 chars)
- **DONE** Soul + identity only for nocowboy agent
- **DONE** Auto-dream: critical rules enforce nutausik_memory_add
- **DONE** MEMORY.md → NUTAUSIK memory migration

## v0.7.7 — Template System Overhaul + Russian Language (2026-07-05)

- **DONE** Template system: 18→7 built-in templates, /continue
- **DONE** Skills: 12→5, kilo-config→nocowboy-config
- **DONE** PuppetMaster MCP: pm_git_commit removed, 5 prompts capability
- **DONE** Git MCP wrapper — packaging/mcp-servers/git/
- **DONE** Three-dimensional doc system: ROADMAP/CHANGELOG/BACKLOG
- **DONE** MEMORY.md + Kilo references removed from instructions

## v0.7.8 — Ecosystem & Compliance (2026-07-05)

- **DONE** /sandbox — built-in template: checkpoint, diff, confirm, apply
  `verify:file packages/opencode/src/nocowboy/sandbox.ts`
- **DONE** /mcp — built-in template: search, install, list, remove MCP servers
  `verify:grep packages/opencode/src/server/routes/instance/httpapi/groups mcp`
- **DONE** /ollama — built-in template: auto-detect, configure, switch to local Ollama models
  `verify:grep packages/opencode/src/nocowboy/config/overlay.ts ollama`
- **DONE** P3-B1: LICENSE.md — Chapter 69 Civil Code РФ
  `verify:file LICENSE.md`
- **DONE** P3-B2: Consent dialog на первом запуске TUI
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
- **DONE** P3-B4: /forget — команда очистки всех данных
  `verify:grep packages/opencode/src/nocowboy/server/httpapi/groups/background-process.ts forget`
- **DONE** P3-B3: Локализация данных — SQLite в .nocowboy/storage/
  `verify:grep packages/opencode/src/nocowboy/session/checkpoint-paths.ts nocowboy/storage`
- **DONE** P3-B5/B6: Правовое обоснование + полный анализ 152-ФЗ
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
- **DONE** scripts/publish-all.sh — скрипт публикации 9 MCP-пакетов
  `verify:file scripts/publish-all.sh`
- **DONE** 9 пакетов @nocowboy/mcp-* готовы к публикации
  `verify:file packaging/mcp-servers/constitution/package.json`
  `verify:file packaging/mcp-servers/score-engine/package.json`

## v0.7.9 — Sandbox + Share (2026-07-06)

- **DONE** /sandbox-docker — Docker sandbox isolation template
  `verify:file packages/opencode/src/nocowboy/sandbox.ts`
  `verify:grep packages/opencode/src/nocowboy/sandbox.ts isDockerAvailable`
- **DONE** /share — session sharing template
  `verify:file packages/opencode/src/share/share-next.ts`
  `verify:file packages/opencode/src/share/session.ts`
- **DONE** MCP marketplace — mcp search template
  `verify:grep packages/opencode/src/nocowboy/cli/cmd/tui/feature-plugins/home/tips.ts Run {highlight}/share`

## v0.8.0 — Full Auto-Wiring (2026-07-08)

- **DONE** NUTAUSIK Auto-Wiring: fetchContext, onSessionCreated, fetchCoherenceCheck
  `verify:grep packages/opencode/src/nocowboy/nutausik-client.ts fetchContext`
  `verify:grep packages/opencode/src/session/session.ts onSessionCreated`
- **DONE** Session Handoff: auto-save/load HANDOFF через nutausik-client
  `verify:grep packages/opencode/src/nocowboy/nutausik-client.ts handoff_save`
- **DONE** Escalation Statuses: DONE/DONE_WITH_CONCERNS/BLOCKED в critical rules
  `verify:grep packages/opencode/src/session/system.ts DONE_WITH_CONCERNS`
- **DONE** verify-roadmap.ts + pre-commit hook — механический страж false positive
  `verify:file scripts/verify-roadmap.ts`
  `verify:file docs/plans/roadmap-verification-system.md`
- **DONE** Single-source-of-truth: roadmap.json → generate .md docs
  `verify:file docs/roadmap.json`
  `verify:file scripts/generate-docs.ts`

## v0.9.0 — Ecosystem (2026-07-09)

### Agent Behavior Hardening

- **DONE** Ponytail 7-rung ladder — lazy-senior.md rule file for code agent
  `verify:file .nocowboy/rules/lazy-senior.md`
- **DONE** Auto-grill — context check before work (auto-grill.md)
  `verify:file .nocowboy/rules/auto-grill.md`
- **DONE** Debug loop — 6-step disciplined diagnosis (debug-loop.md)
  `verify:file .nocowboy/rules/debug-loop.md`

### Quality

- **DONE** Spec-compliance verify axis — spec-compliance.md + score-engine dimension
  `verify:file .nocowboy/rules/spec-compliance.md`

### Commands

- **DONE** /to-spec command — conversation to structured NUTAUSIK task
  `verify:file .nocowboy/command/to-spec.md`
- **DONE** /wayfinder command — investigation tickets for multi-session work
  `verify:file .nocowboy/command/wayfinder.md`

## v0.10.0 — Russian Language & Localization

- **DONE** Russian system prompts для ВСЕХ агентов (сейчас только code.ru + debug.ru)
  `verify:file packages/opencode/src/agent/prompt/code.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/nocowboy.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/overseer.ru.txt`
  `verify:file packages/opencode/src/agent/prompt/compaction.ru.txt`
- **DONE** Russian instruction files — instructions/ru/
  `verify:file packaging/config/instructions/ru/auto-memory.md`
  `verify:file packaging/config/instructions/ru/aider-features.md`
  `verify:file packaging/config/instructions/ru/sandbox.md`
- **DONE** Diff Sandbox — изоляция AI-изменений до принятия (Plandex-style)
  `verify:file packages/opencode/src/nocowboy/sandbox-diff.ts`
  `verify:file .nocowboy/command/sandbox-start.md`
  
- **DONE** Переключатель языка в настройках TUI (Settings → Language)
  `verify:file packages/opencode/src/nocowboy/ui/i18n.ts`
  
