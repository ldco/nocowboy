# NoCowboy — Backlog

> Идеи, которые мы накидываем. Не в роадмапе, не в работе. Сюда складываем всё, что «было бы круто сделать».
> Когда идея созрела → переносим в [ROADMAP.md](ROADMAP.md) с verify-директивами.

---

## Turso Multi-Machine Sync

**Источник:** вынесено из ROADMAP (v1.0.0 — Sync & Deploy, false DONE)
**Суть:** Реализовать multi-machine sync через Turso (`@libsql/client`). Фундамент event-sourcing есть в `src/sync/`.
**Что нужно:**
- `src/sync/turso-sync.ts` — push/pull sync engine
- CLI: `tausik turso setup`, `sync`, `status`
- `turso` секция в конфиге (url, authToken, syncInterval)
- Интеграционные тесты

---

## YandexGPT / GigaChat

**Источник:** старый BACKLOG
**Суть:** Поддержка YandexGPT и GigaChat как LLM провайдеров.
**Что нужно:** регистрация провайдеров, API-клиенты, model list fetching.

---

## Permission Timeout (P2-A4)

**Источник:** `docs/plans/p2-a4-permission-timeout.md` (архивирован)
**Суть:** Когда permission prompt появляется в TUI, агент блокируется бесконечно. Добавить таймаут: через N секунд — auto-deny.
**Что нужно:** модификация `Permission.ask()` в `packages/opencode/src/permission/index.ts`.
**Файлы:** `src/permission/index.ts`, `src/config/config.ts` (новая опция `permissionTimeout`)

---

## Agent Audit (P2-C1)

**Источник:** `docs/plans/p2-c1-agent-audit.md` (архивирован)
**Суть:** Inventory всех 21 агента. Два name collision (`plan`, `explore`). Один deprecated (`orchestrator`).
**Что нужно:** аудит, переименование коллизий, удаление мёртвых агентов.

---

## MCP Framework Cleanup (P2-C4)

**Источник:** `docs/deferred/p2-c4-mcp-framework-analysis.md` (удалён)
**Суть:** Анализ first-party MCP серверов. Решить, что делать с plugin-registry.

---

## Instruction Files Analysis (P2-C2)

**Источник:** `docs/deferred/p2-c2-instructions-analysis.md` (удалён)
**Суть:** Починить Kilo-референсы, смержить no-shortcuts в engineering-rules, починить auto-memory пути.

---

## Agent Quality Enforcement (3 items)

**Источник:** `docs/plans/agent-quality-enforcement.md` (архивирован)
**Суть:**
- coherence_check auto-run при SessionStart
- agent_log tool call logging (частично реализовано)
- task-gate hook для блокировки кода без активной задачи

---

## Self-Being Meta-Cognitive Architecture (P3-SELF)

**Источник:** `docs/plans/p3-self-being-meta-cognitive.md` (архивирован)
**Суть:** NoCowboy как самосовершенствующееся существо. Наблюдает свою производительность, экспериментирует с конфигурациями, само-модифицируется.

---

## NUTAUSIK Auto-Wiring — Deep Integration

**Источник:** ROADMAP v0.8.0 (DONE: базовое)
**Суть:** Следующий уровень — агенты автоматически создают задачи, верифицируют код, логируют вызовы без ручного вмешательства.
- QG-0 gate: блокировать code tool calls пока нет активной задачи
- QG-2 gate: блокировать task_done пока не пройдёт verify

---

## UI Локализация

**Источник:** старый BACKLOG
**Суть:** Русские метки в sidebar, диалогах, ошибках. Подхватывает `lang: "ru"` из nocowboy.json.

---

## Test Harness (39 flaky tests)

**Источник:** v0.6.1 ROADMAP (P1.7)
**Суть:** 39 тестов падают под параллельной нагрузкой. Нужен test harness.
**Файлы:** `packages/opencode/test/`

---

## Distill Command

**Источник:** v0.6.1 ROADMAP (MiMo #3)
**Суть:** Сканировать сессии → извлекать паттерны → генерировать skills/commands.
**Сейчас:** `auto-dream.ts` существует, но делает только dream (извлечение знаний в память), не distill (генерация команд).

---

## Goal Judge (native Effect loop)

**Источник:** v0.6.1 ROADMAP (MiMo #4)
**Суть:** Интегрировать goal judge в agent stop loop (Effect-native).
**Сейчас:** `/goal` команда есть, но не интегрирована в lifecycle агента.

---

## P2-C4: MCP Framework → Merge into NUTAUSIK

**Источник:** docs/deferred/p2-c4-mcp-framework-analysis.md
**Суть:** Решить судьбу plugin-registry и других first-party MCP серверов.

---

## Publish

- Создать npm org `@nocowboy` на npmjs.com
- Запустить `npm run publish-all`
