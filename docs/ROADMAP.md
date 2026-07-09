# ROADMAP.md
> generated from docs/roadmap.json — do not edit directly.
> Run `nocowboy roadmap generate` to regenerate.
> 📋 Use `/backlog-promote "feature"` to add new features.

## v0.10.0 — Russian Language & Localization

  - 🏗️ YandexGPT / GigaChat провайдеры 📐
  - 🏗️ UI Локализация (русские метки + переключатель языка) 📐

## v0.11.0 — Quality & Infrastructure

  - ⬜ Publish: npm org @nocowboy + npm run publish-all ❓
  - ⬜ Permission timeout — доработка (из P2-A4) ❓
  - ⬜ Agent Audit (P2-C1): inventory 21 агентов, name collisions ❓
  - ⬜ Deep Context (2M tokens с бюджетированием) ❓
  - ⬜ MCP Framework — merge plugin-registry в NUTAUSIK ❓
  - ⬜ Command deduplication (P2-C3) ❓
  - ⬜ Goal judge — интегрировать в agent stop loop (Effect-native) ❓
  - ⬜ Test harness — исправить 39 flaky тестов под параллельной нагрузкой ❓
  - ⬜ Distill command — сканировать сессии → генерировать skills/commands ❓
  - ⬜ Agent Quality Enforcement — coherence_check, agent_log, task-gate hook ❓
  - ⬜ Self-Being Meta-Cognitive Architecture (P3-SELF) ❓
  - ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject prompt templates) ❓
  - ⬜ Instruction Files Analysis (P2-C2): починить пути, смержить no-shortcuts ❓
  - ⬜ Per-task cost tracking с леджером ❓
  - ⬜ Vector store switcher UI ❓
  - ⬜ DeepSeek prefix-cache optimization ❓
  - ⬜ Lazy-load tree-sitter WASMs (40MB savings) ❓
  - ⬜ FTS5 query builder (fts-query.ts) ❓
  - ⬜ FTS5 schema + migration ❓
  - ⬜ Memory reconcile — index MEMORY.md, prune dead ❓
  - ⬜ Channels (webhooks MCP) ❓
  - ⬜ Bash firewall hook — блокировать опасные команды ❓
  - ⬜ Task-gate hook — блокировать code tool calls без активного task ❓
  - ⬜ Task-verify hook — авто-запуск verify перед task_done ❓
  - ⬜ Secret-scan hook — сканировать на секреты перед записью ❓
  - ⬜ Activity logging hook — PostToolUse для Write/Edit/Bash ❓
  - ⬜ Memory-audit hook — проверка дубликатов ❓
  - ⬜ Session-metrics hook — сбор метрик сессии ❓
  - ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject templates) ❓
  - ⬜ Auto-dream programmatic — программаторное сканирование сессий ❓
  - ⬜ Obsidian integration — connect NoCowboy to Obsidian vault via MCP ❓
  - 🔴 Turso — production SQLite для multi-machine sync ❓ — **Blocked:** drizzle-orm/libsql has no subpath — @libsql/client (v0.17.4) установлен, но не может быть интегрирован через Drizzle ORM. Ждём drizzle-orm/libsql export. Подробнее: docs/reference/turso-database-adoption.md

## v1.0.0 — Production release

  - ⬜ RC feedback incorporated ❓
  - ⬜ All tests green — 0 failures, 0 flaky ❓
  - ⬜ Typecheck clean — 0 errors ❓
  - ⬜ Roadmap verified — 100% DONE features pass verify ❓
  - ⬜ npm publish — @nocowboy v1.0.0 ❓

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

