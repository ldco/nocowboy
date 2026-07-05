# NoCowboy — Roadmap

> **Только невыполненное.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).
> **Sync:** Релизы NoCowboy синхронизированы с [NUTAUSIK](https://github.com/nocowboy/nutausik-js/blob/master/ROADMAP.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.

---

## v0.8.0 — Full Auto-Wiring

**NUTAUSIK companion: v0.3.0**

### NUTAUSIK Auto-Wiring (Phases 2-4)
- **DONE** Phase 2: `context_inject` loaded via `fetchContext()` в каждом системном промпте
- **DONE** Phase 3: Session auto-wiring — `onSessionCreated`/`onSessionEnded` через `autoCreateTask`/`autoEndSession`
- **DONE** Phase 4: `fetchCoherenceCheck()` при старте сессии
- **DONE** `nutausik-hooks.sh` заменён на `nutausik-auto-wire.ts`

- **DONE** Авто-проверка AC: правило 6 в `criticalRules()` — LLM проверяет AC перед `task_done`
- **DONE** `logToolCall()` в `nutausik-client.ts` — вызов `nutausik_task_log` для любого tool
- **DONE** `autoEndSession()` логирует `task_log(phase: "close")` при завершении
- **DONE** Пер-тул логирование: авто-регистрация PostToolUse hook в hooks.json

### Session Handoff
- **DONE** Авто-сохранение HANDOFF при завершении: `autoEndSession()` → `nutausik_handoff_save`
- **DONE** Авто-загрузка при старте: `fetchHandoff()` → `nutausik_handoff_load`
- **DONE** Интеграция через `nutausik-client.ts`

### Escalation Statuses
- **DONE** Добавлены DONE / DONE_WITH_CONCERNS / BLOCKED в critical rules system.ts (rule 6)
- **DONE** LLM вызывает `task_done(DONE)` при успехе, `task_done(DONE_WITH_CONCERNS)` при проблемах, `task_update(blocked)` при блокере

### NUTAUSIK MCP — Prompt Support (Phase 4)
- Добавить prompt capability в NUTAUSIK MCP (± ext. repo)
- Prompt templates: `dream`, `memory`, `context_inject`

---

## v0.9.0 — Ecosystem

**NUTAUSIK companion: v0.4.0**

### Sandbox & Isolation
- **DONE** `/sandbox` — built-in template: checkpoint → diff → confirm → apply/revert
- **DONE** `/sandbox-docker` — built-in template: Docker isolation
- **DONE** `src/nocowboy/sandbox.ts` — Docker utility: wrapCommand, isDockerAvailable

### MCP Marketplace
- **DONE** `/mcp` — built-in template: search → install → list → remove
- **DONE** `plugin_search` + `plugin_install` tools already exist in plugin-registry MCP

### Offline & Cost
- **DONE** `/ollama` — built-in template: auto-detect, configure, switch to local models
- **DONE** Ollama is OpenAI-compatible — user adds `providers.ollama` in nocowboy.json

---

## v1.0.0 — Production

**NUTAUSIK companion: v1.0.0**

### 152-ФЗ Compliance
- **DONE** P3-B1: Лицензия под юрисдикцией РФ — Chapter 69 Civil Code в LICENSE.md
- **DONE** P3-B2: Consent dialog при первом запуске TUI — `consent_152fz` в kv, диалог на русском
- **DONE** P3-B3: Локализация данных по ст. 21 (данные в локальном SQLite)
- **DONE** P3-B4: `/forget` — built-in template: подтверждение → очистка config, storage, .nutausik
- P3-B5: Уведомление РКН по ст. 22 (юрист)
- P3-B6: Legal research (юрист)

### Sync & Deploy
- **DONE** `/share` — built-in template для публикации сессии
- Sync между машинами / деплой
- Turso — production SQLite для multi-machine

### Publish
- **DONE** `scripts/publish-all.sh` — готовый скрипт для публикации всех 9 MCP пакетов
- **DONE** 9 пакетов `@nocowboy/mcp-*` готовы к публикации
- npm org `@nocowboy` — создать на npmjs.com/org/create
- `npm run publish-all` — опубликовать все пакеты одной командой
