# CHANGELOG.md — generated from docs/roadmap.json
> Edit the JSON, not this file.

## v0.6.1

- ✅ Форк от Kilo Code (TypeScript + Bun + SolidJS + OpenTUI) — Core Infrastructure
- ✅ Компиляция в single binary — `bun build --compile` — Core Infrastructure
- ✅ Repomap — `nocowboy repomap`, авто-инжекция в system prompt — Core Infrastructure
- ✅ Memory FTS5 (MiMo) — полнотекстовый поиск по памяти — Core Infrastructure
- ✅ Goal judge — `/goal` команда с subagent-оценкой — Core Infrastructure
- ✅ Voice input — FFmpeg + транскрипция — Core Infrastructure
- ✅ Multi-turn approval memory — Allow once per session (Codex CLI style) — Core Infrastructure
- ✅ Deep context — repomap + memory в system prompt — Core Infrastructure
- ✅ Global config — `~/.config/nocowboy/nocowboy.json` — Core Infrastructure
- ✅ Indexing — first-class (не плагин) — Core Infrastructure
- ✅ Russian system prompts — `code.ru.txt`, `debug.ru.txt` — Core Infrastructure
- ✅ ADR: Turso Database adoption (Phase 1 blocked, Phase 2 done) — Core Infrastructure
- ✅ Поле `lang` в схеме конфига — Core Infrastructure
- ✅ SQLite vector store (LanceDB replacement, -15MB)
- ✅ Zero-config wizard — nocowboy init
- ✅ Provider-agnostic — 200+ models via LiteLLM
- ✅ Embedded MCP proxy — zero external deps, cross-platform
- ✅ Plugin out/plugin in MCP — auto-detect, npm install
- ✅ Launch spec registry (~/.nocowboy/mcp/launch.json)
- ✅ npm publishing pipeline — platform packages + meta-package
- ✅ Incremental PR review — code-reviewer checks only git diff

## v0.7.4

- ✅ Agent reduction: 15 → 5
- ✅ Tool groups — `groups` field in ConfigAgent
- ✅ Tool groups for agents (read/edit/command/mcp)
- ✅ Agent descriptions — короткие, readable (v0.7.4)

## v0.7.5

- ✅ P2-A2: Search/Replace edit format (Aider-style)
- ✅ P2-A3: Branch-per-task
- ✅ P2-A4: Permission timeout (auto-deny)
- ✅ P2-A5: Yolo mode toggle
- ✅ AGENTS.md + code.txt + debug.txt — укреплённые инструкции
- ✅ NUTAUSIK Phase 1 — hooks, NutausikDot, fix port + SQLite
- ✅ NUTAUSIK v0.2.0 — context_inject, handoff, coherence, loop_close
- ✅ NutausikDot — 3-state TopBar indicator (v0.7.5)
- ✅ Todo injection — NUTAUSIK context block в system prompt (v0.7.5)

## v0.7.6

- ✅ Token cost investigation + repomap watcher cache
- ✅ soul.txt — 71% reduction (3449→980 chars)
- ✅ Soul + identity only for nocowboy agent
- ✅ Auto-dream: critical rules enforce nutausik_memory_add
- ✅ MEMORY.md → NUTAUSIK memory migration

## v0.7.7

- ✅ Template system: 18→7 built-in templates, /continue
- ✅ Skills: 12→5, kilo-config→nocowboy-config
- ✅ PuppetMaster MCP: pm_git_commit removed, 5 prompts capability
- ✅ Git MCP wrapper — packaging/mcp-servers/git/
- ✅ Three-dimensional doc system: ROADMAP/CHANGELOG/BACKLOG
- ✅ MEMORY.md + Kilo references removed from instructions

## v0.10.0

- ✅ Russian system prompts для ВСЕХ агентов (сейчас только code.ru + debug.ru)
- ✅ Russian instruction files — instructions/ru/
- ✅ Diff Sandbox — изоляция AI-изменений до принятия (Plandex-style)
- ✅ Переключатель языка в настройках TUI (Settings → Language)

## v0.7.9

- ✅ /sandbox-docker — Docker sandbox isolation template
- ✅ /share — session sharing template
- ✅ MCP marketplace — mcp search template

## v0.7.8

- ✅ /sandbox — built-in template: checkpoint, diff, confirm, apply
- ✅ /mcp — built-in template: search, install, list, remove MCP servers
- ✅ /ollama — built-in template: auto-detect, configure, switch to local Ollama models
- ✅ P3-B1: LICENSE.md — Chapter 69 Civil Code РФ
- ✅ P3-B2: Consent dialog на первом запуске TUI
- ✅ P3-B4: /forget — команда очистки всех данных
- ✅ P3-B3: Локализация данных — SQLite в .nocowboy/storage/
- ✅ P3-B5/B6: Правовое обоснование + полный анализ 152-ФЗ
- ✅ scripts/publish-all.sh — скрипт публикации 9 MCP-пакетов
- ✅ 9 пакетов @nocowboy/mcp-* готовы к публикации

## v0.8.0

- ✅ NUTAUSIK Auto-Wiring: fetchContext, onSessionCreated, fetchCoherenceCheck
- ✅ Session Handoff: auto-save/load HANDOFF через nutausik-client
- ✅ Escalation Statuses: DONE/DONE_WITH_CONCERNS/BLOCKED в critical rules
- ✅ verify-roadmap.ts + pre-commit hook — механический страж false positive
- ✅ Single-source-of-truth: roadmap.json → generate .md docs

## v0.9.0

- ✅ Ponytail 7-rung ladder — lazy-senior.md rule file for code agent — Agent Behavior Hardening
- ✅ Auto-grill — context check before work (auto-grill.md) — Agent Behavior Hardening
- ✅ Debug loop — 6-step disciplined diagnosis (debug-loop.md) — Agent Behavior Hardening
- ✅ Spec-compliance verify axis — spec-compliance.md + score-engine dimension — Quality
- ✅ /to-spec command — conversation to structured NUTAUSIK task — Commands
- ✅ /wayfinder command — investigation tickets for multi-session work — Commands

