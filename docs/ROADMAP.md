# NoCowboy — Roadmap

> **Только планируемое.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.
> **Единственный источник:** `docs/roadmap.json`. `.md` файлы генерируются автоматически.
> **Правило:** DONE-пункт обязан иметь verify-директивы. Если регрессия ломает verify — DONE недействителен.

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## v1.0.0 — Production

- 🚫 Turso — production SQLite для multi-machine sync
  > Event-sourcing фундамент есть (src/sync/). Turso multi-machine — НЕ РЕАЛИЗОВАН. ADR: Phase 1 blocked.
  > **Блокер:** drizzle-orm/libsql has no subpath — @libsql/client (v0.17.4) установлен, но не может быть интегрирован через Drizzle ORM. Ждём drizzle-orm/libsql export. Подробнее: docs/reference/turso-database-adoption.md
  - src/sync/turso-sync.ts — push/pull sync engine
  - CLI: tausik turso setup/sync/status
  - turso секция в NutausikConfig (url, authToken, syncInterval)
  `verify:file packages/opencode/src/sync/turso-sync.ts`
- ⬜ Publish: npm org @nocowboy + npm run publish-all
  > 9 MCP-пакетов готовы, publish-all.sh есть. Нужно создать npm org и запустить.
  `verify:cmd npm org ls nocowboy 2>/dev/null`

---

## v1.1.0 — Ecosystem & Localization

- ⬜ Russian system prompts для ВСЕХ агентов (сейчас только code.ru + debug.ru)
  > 2/12 prompts русские. Нужно: nocowboy.ru.txt, overseer.ru.txt, explore.ru.txt, scout.ru.txt, router.ru.txt, compaction.ru.txt и т.д.
- ⬜ Russian instruction files — instructions/ru/
  > Было заявлено как DONE в старом роадмапе, но директория не существует.
- ⬜ YandexGPT / GigaChat провайдеры
  > Код детекции есть, реализации провайдеров нет.
- ⬜ UI Локализация (русские метки + переключатель языка)
  > Русские метки в sidebar, диалогах, ошибках. Переключатель языка в Settings. Использует lang из nocowboy.json. Сейчас: lang в конфиге есть, system prompts русские есть, UI-меток нет.
- ⬜ Переключатель языка в настройках TUI (Settings → Language)
  > Должен менять lang в nocowboy.json и перезагружать UI

---

## v1.2.0 — Quality & Infrastructure

- ⬜ Permission timeout — доработка (из P2-A4)
  > Базовое есть. Нужна доработка: настройка через UI, разные таймауты для разных tool.
- ⬜ Agent Audit (P2-C1): inventory 21 агентов, name collisions
  > Два name collision (plan, explore). Один deprecated (orchestrator).
- ⬜ Deep Context (2M tokens с бюджетированием)
  > checkpoint-validator.ts имеет частичное бюджетирование, но не 2M.
- ⬜ MCP Framework — merge plugin-registry в NUTAUSIK
  > P2-C4. Решить судьбу first-party MCP серверов.
- ⬜ Goal judge — интегрировать в agent stop loop (Effect-native)
  > /goal команда есть, не интегрирована в lifecycle.
- ⬜ Test harness — исправить 39 flaky тестов под параллельной нагрузкой
  > Файлы: packages/opencode/test/
- ⬜ Distill command — сканировать сессии → генерировать skills/commands
  > auto-dream.ts есть (только dream, не distill).
- ⬜ Agent Quality Enforcement — coherence_check, agent_log, task-gate hook
  > coherence_check частично реализован.
- ⬜ Instruction Files Analysis (P2-C2): починить пути, смержить no-shortcuts
  > Kilo-референсы, auto-memory пути.
- ⬜ Per-task cost tracking с леджером
  > cost-propagation.ts частично есть, леджера нет
- ⬜ FTS5 query builder (fts-query.ts)
  > pure, 0 deps. Из MiMo
- ⬜ FTS5 schema + migration
  > Из MiMo
- ⬜ Memory reconcile — index MEMORY.md, prune dead
  > Базовое есть, полный reconcile нет
- ⬜ Channels (webhooks MCP)
  > Инструменты в MCP есть, не стабильны
- ⬜ Bash firewall hook — блокировать опасные команды
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Task-gate hook — блокировать code tool calls без активного task
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Task-verify hook — авто-запуск verify перед task_done
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Secret-scan hook — сканировать на секреты перед записью
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Activity logging hook — PostToolUse для Write/Edit/Bash
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Memory-audit hook — проверка дубликатов
  > В NUTAUSIK hooks есть, не портировано
- ⬜ Session-metrics hook — сбор метрик сессии
  > В NUTAUSIK hooks есть, не портировано
- ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject templates)
  > В NUTAUSIK-side, не в NoCowboy
- ⬜ Auto-dream programmatic — программаторное сканирование сессий
  > auto-dream.ts есть, но ручной

---
