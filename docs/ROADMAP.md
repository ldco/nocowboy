# NoCowboy Roadmap

## v0.6.1 — Fork & Foundation

  - ✅ Форк от Kilo Code (TypeScript + Bun + SolidJS + OpenTUI) ❓
  - ✅ Компиляция в single binary — `bun build --compile` ❓
  - ✅ Repomap — `nocowboy repomap`, авто-инжекция в system prompt ❓
  - ✅ Memory FTS5 (MiMo) — полнотекстовый поиск по памяти ❓
  - ✅ Goal judge — `/goal` команда с subagent-оценкой ❓
  - ✅ Voice input — FFmpeg + транскрипция ❓
  - ✅ Multi-turn approval memory — Allow once per session (Codex CLI style) ❓
  - ✅ Deep context — repomap + memory в system prompt ❓
  - ✅ Global config — `~/.config/nocowboy/nocowboy.json` ❓
  - ✅ Indexing — first-class (не плагин) ❓
  - ✅ Russian system prompts — `code.ru.txt`, `debug.ru.txt` ❓
  - ✅ ADR: Turso Database adoption (Phase 1 blocked, Phase 2 done) ❓
  - ✅ Поле `lang` в схеме конфига ❓
  - ✅ SQLite vector store (LanceDB replacement, -15MB) ❓
  - ✅ Zero-config wizard — nocowboy init ❓
  - ✅ Provider-agnostic — 200+ models via LiteLLM ❓
  - ✅ Embedded MCP proxy — zero external deps, cross-platform ❓
  - ✅ Plugin out/plugin in MCP — auto-detect, npm install ❓
  - ✅ Launch spec registry (~/.nocowboy/mcp/launch.json) ❓
  - ✅ npm publishing pipeline — platform packages + meta-package ❓
  - ✅ Incremental PR review — code-reviewer checks only git diff ❓

## v0.7.0 — LSP/UI Polish

  *No features planned for this version.*

## v0.7.3 — Dogfooding Release

  *No features planned for this version.*

## v0.7.4 — P3 Agent Refactor

  - ✅ Agent reduction: 15 → 5 ❓
  - ✅ Tool groups — `groups` field in ConfigAgent ❓
  - ✅ Tool groups for agents (read/edit/command/mcp) ❓
  - ✅ Agent descriptions — короткие, readable (v0.7.4) ❓

## v0.7.5 — P2 UX & Safety + NUTAUSIK Auto-Wiring

  - ✅ P2-A2: Search/Replace edit format (Aider-style) ❓
  - ✅ P2-A3: Branch-per-task ❓
  - ✅ P2-A4: Permission timeout (auto-deny) ❓
  - ✅ P2-A5: Yolo mode toggle ❓
  - ✅ AGENTS.md + code.txt + debug.txt — укреплённые инструкции ❓
  - ✅ NUTAUSIK Phase 1 — hooks, NutausikDot, fix port + SQLite ❓
  - ✅ NUTAUSIK v0.2.0 — context_inject, handoff, coherence, loop_close ❓
  - ✅ NutausikDot — 3-state TopBar indicator (v0.7.5) ❓
  - ✅ Todo injection — NUTAUSIK context block в system prompt (v0.7.5) ❓

## v0.7.6 — Token Cost Optimization + Identity Scoping

  - ✅ Token cost investigation + repomap watcher cache ❓
  - ✅ soul.txt — 71% reduction (3449→980 chars) ❓
  - ✅ Soul + identity only for nocowboy agent ❓
  - ✅ Auto-dream: critical rules enforce nutausik_memory_add ❓
  - ✅ MEMORY.md → NUTAUSIK memory migration ❓

## v0.7.7 — Template System Overhaul + Russian Language

  - ✅ Template system: 18→7 built-in templates, /continue ❓
  - ✅ Skills: 12→5, kilo-config→nocowboy-config ❓
  - ✅ PuppetMaster MCP: pm_git_commit removed, 5 prompts capability ❓
  - ✅ Git MCP wrapper — packaging/mcp-servers/git/ ❓
  - ✅ Three-dimensional doc system: ROADMAP/CHANGELOG/BACKLOG ❓
  - ✅ MEMORY.md + Kilo references removed from instructions ❓

## v0.7.8 — Ecosystem & Compliance

  - ✅ /sandbox — built-in template: checkpoint, diff, confirm, apply ❓
  - ✅ /mcp — built-in template: search, install, list, remove MCP servers ❓
  - ✅ /ollama — built-in template: auto-detect, configure, switch to local Ollama models ❓
  - ✅ P3-B1: LICENSE.md — Chapter 69 Civil Code РФ ❓
  - ✅ P3-B2: Consent dialog на первом запуске TUI ❓
  - ✅ P3-B4: /forget — команда очистки всех данных ❓
  - ✅ P3-B3: Локализация данных — SQLite в .nocowboy/storage/ ❓
  - ✅ P3-B5/B6: Правовое обоснование + полный анализ 152-ФЗ ❓
  - ✅ scripts/publish-all.sh — скрипт публикации 9 MCP-пакетов ❓
  - ✅ 9 пакетов @nocowboy/mcp-* готовы к публикации ❓

## v0.7.9 — Sandbox + Share

  - ✅ /sandbox-docker — Docker sandbox isolation template ❓
  - ✅ /share — session sharing template ❓
  - ✅ MCP marketplace — mcp search template ❓

## v0.8.0 — Full Auto-Wiring

  - ✅ NUTAUSIK Auto-Wiring: fetchContext, onSessionCreated, fetchCoherenceCheck ❓
  - ✅ Session Handoff: auto-save/load HANDOFF через nutausik-client ❓
  - ✅ Escalation Statuses: DONE/DONE_WITH_CONCERNS/BLOCKED в critical rules ❓
  - ✅ verify-roadmap.ts + pre-commit hook — механический страж false positive ❓
  - ✅ Single-source-of-truth: roadmap.json → generate .md docs ❓

## v0.9.0 — Ecosystem

  - ✅ Ponytail 7-rung ladder — lazy-senior.md rule file for code agent ❓
  - ✅ Auto-grill — context check before work (auto-grill.md) ❓
  - ✅ Debug loop — 6-step disciplined diagnosis (debug-loop.md) ❓
  - ✅ Spec-compliance verify axis — spec-compliance.md + score-engine dimension ❓
  - ✅ /to-spec command — conversation to structured NUTAUSIK task ❓
  - ✅ /wayfinder command — investigation tickets for multi-session work ❓

## v0.10.0 — Russian Language & Localization

  - ✅ Russian system prompts для ВСЕХ агентов (сейчас только code.ru + debug.ru) ❓
  - ✅ Russian instruction files — instructions/ru/ ❓
  - 🔄 YandexGPT / GigaChat провайдеры 📐
  - 🔄 UI Локализация (русские метки + переключатель языка) 📐
  - ✅ Diff Sandbox — изоляция AI-изменений до принятия (Plandex-style) ❓
  - ✅ Переключатель языка в настройках TUI (Settings → Language) ❓

## v0.11.0 — Quality & Infrastructure — verification loop как DEFAULT behavior

  - ⬜ Turso — production SQLite для multi-machine sync ❓
  - ⬜ Publish: npm org @nocowboy + npm run publish-all ❓
  - ⬜ Permission timeout — доработка (из P2-A4) ❓
  - ⬜ Agent Audit (P2-C1): inventory 21 агентов, name collisions ❓
  - ⬜ Deep Context (2M tokens с бюджетированием) ❓
  - ⬜ MCP Framework — merge plugin-registry в NUTAUSIK ❓
  - ⬜ Command deduplication (P2-C3) ❓
  - ⬜ Goal judge — интегрировать в agent stop loop (Effect-native) ❓
  - ⬜ Test harness — исправить 39 flaky тестов под параллельной нагрузкой ❓
  - ⬜ Distill command — сканировать сессии → генерировать skills/commands ❓
  - ⬜ Verification Loop — LSP diagnostics check DEFAULT (✅ check tool + auto-verify + prompt enforcement) ❓
  - ⬜ Self-Being Meta-Cognitive Architecture (P3-SELF) ❓
  - ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject prompt templates) ❓
  - ⬜ Instruction Files Analysis (P2-C2): починить пути, смержить no-shortcuts ❓
  - ⬜ Per-task cost tracking с леджером ❓
  - ⬜ Vector store switcher UI ❓
  - ✅ DeepSeek prefix-cache optimization (promptCacheKey + agent fallback + preflight cost estimation)
  - ⬜ Lazy-load tree-sitter WASMs (40MB savings) ❓
  - ⬜ FTS5 query builder (fts-query.ts) ❓
  - ⬜ FTS5 schema + migration ❓
  - ⬜ Memory reconcile — index MEMORY.md, prune dead ❓
  - ⬜ Channels (webhooks MCP) ❓
  - ⬜ Bash firewall hook — блокировать опасные команды ❓
  - ⬜ Task-gate hook — блокировать code tool calls без активного task ❓
  - ✅ Programmatic gate в task done — complete_task отклоняет если check не прошёл (✅ done) ❓
  - ✅ Tool `check` для агента — явный вызов LSP diagnostics (language-agnostic) ❓
  - ✅ Auto-verify после edit/write/apply_patch — если ошибки, блокировать продолжение ❓
  - ✅ Prompt enforcement — агент ОБЯЗАН вызвать check перед task_done (записано в code.ru.txt) ❓
  - ⬜ Secret-scan hook — сканировать на секреты перед записью ❓
  - ⬜ Activity logging hook — PostToolUse для Write/Edit/Bash ❓
  - ⬜ Memory-audit hook — проверка дубликатов ❓
  - ⬜ Session-metrics hook — сбор метрик сессии ❓
  - ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject templates) ❓
  - ⬜ Auto-dream programmatic — программаторное сканирование сессий ❓
  - ⬜ Obsidian integration — connect NoCowboy to Obsidian vault via MCP ❓
  - ⬜ UI для выбора модели каждого агента в Settings TUI 📐
  - ✅ todowrite: блокировать status=completed — удалять пункты вместо completed 📐

## v1.0.0-alpha — Alpha — internal testing

  - ⬜ v0.10.0 + v0.11.0 — все фичи реализованы ❓
  - ⬜ Все тесты проходят — bun test ❓
  - ⬜ Manual smoke test — основные сценарии пройдены ❓
  - ⬜ Нет критических багов — known issues документированы ❓

## v1.0.0-rc — RC — release candidate, user testing

  - ⬜ Alpha feedback incorporated ❓
  - ⬜ Пользовательское тестирование — 5+ тестеров ❓
  - ⬜ Performance testing — startup < 500ms, memory < 200MB ❓
  - ⬜ Все известные issues закрыты или имеют миграционный план ❓
  - ⬜ Документация обновлена — CHANGELOG, ROADMAP, README ❓

## v1.0.0 — Production release

  - ⬜ RC feedback incorporated ❓
  - ⬜ All tests green — 0 failures, 0 flaky ❓
  - ⬜ Typecheck clean — 0 errors ❓
  - ⬜ Roadmap verified — 100% DONE features pass verify ❓
  - ⬜ npm publish — @nocowboy v1.0.0 ❓

## v0.12.0 — UI/UX — Terminal User Interface improvements

  - ✅ Inline diff в permission dialog — показывать diff прямо в диалоге подтверждения 📐
  - ✅ Smart cost display — цветной индикатор остатка запросов до лимита (🟢🟡🔴) 📐
  - ✅ Context mention (@file, @folder) в prompt — автодополнение из repomap 📐
  - ✅ Timeline view — /timeline — хронология изменений с diff по точкам ❓
  - ✅ Markdown превью — таблицы, ссылки, подсветка кода в TUI ❓
  - ✅ Collapse tool output по умолчанию — сворачивать bash/edit результаты ❓

