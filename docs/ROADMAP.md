# NoCowboy — Roadmap

> **Только планируемое.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.
> **Правило:** Каждый DONE-пункт обязан иметь verify-директивы.
>   Если регрессия ломает verify → DONE недействителен, даже если `**DONE**` в тексте.

---

## v0.8.0 — Full Auto-Wiring

### NUTAUSIK Auto-Wiring (Phases 2-4)
- **DONE** `context_inject` loaded via `fetchContext()` в каждом системном промпте
  `verify:grep src/nocowboy/nutausik-client fetchContext`
  `verify:grep src/session/system fetchContext`
- **DONE** Session auto-wiring — `onSessionCreated`/`onSessionEnded` через `autoCreateTask`/`autoEndSession`
  `verify:grep src/session/session onSessionCreated`
  `verify:grep src/nocowboy/nutausik-auto-wire autoCreateTask`
- **DONE** `fetchCoherenceCheck()` при старте сессии
  `verify:grep src/nocowboy/nutausik-client fetchCoherenceCheck`
  `verify:grep src/session/system fetchCoherenceCheck`
- **DONE** `nutausik-auto-wire.ts` — замена shell-хуков на нативный код
  `verify:file packages/opencode/src/nocowboy/nutausik-auto-wire.ts`

- **DONE** Авто-проверка AC: правило 6 в `criticalRules()` — LLM проверяет AC перед `task_done`
  `verify:grep src/session/system criticalRules`
- **DONE** `nutausik-client.ts` — вызов `nutausik_task_log` для любого tool
  `verify:file packages/opencode/src/nocowboy/nutausik-client.ts`
- **DONE** `autoEndSession()` логирует `task_log(phase: "close")` при завершении
  `verify:grep src/nocowboy/nutausik-client autoEndSession`
- **DONE** Пер-тул логирование: авто-регистрация PostToolUse hook в `.nocowboy/hooks.json`
  `verify:grep src/nocowboy/nutausik-auto-wire HOOKS_FILE`

### Session Handoff
- **DONE** Авто-сохранение HANDOFF при завершении
  `verify:grep src/nocowboy/nutausik-client handoff_save`
- **DONE** Авто-загрузка HANDOFF при старте
  `verify:grep src/nocowboy/nutausik-client handoff_load`
- **DONE** Интеграция через `nutausik-client.ts`
  `verify:file packages/opencode/src/nocowboy/nutausik-client.ts`

### Escalation Statuses
- **DONE** DONE / DONE_WITH_CONCERNS / BLOCKED в critical rules (rule 6)
  `verify:grep src/session/system DONE_WITH_CONCERNS`

---

## v0.9.0 — Ecosystem

### Sandbox & Isolation
- **DONE** `/sandbox` — built-in template: checkpoint → diff → confirm → apply/revert
  `verify:file packages/opencode/src/nocowboy/sandbox.ts`
- **DONE** `/sandbox-docker` — built-in template: Docker isolation
  `verify:grep src/nocowboy/sandbox isDockerAvailable`
- **DONE** `wrapCommand()`, `isDockerAvailable()` — Docker utility
  `verify:grep src/nocowboy/sandbox wrapCommand`

### MCP Marketplace
- **DONE** `/mcp` — built-in template: search → install → list → remove
  `verify:grep src/server/routes/instance/httpapi/groups mcp`
- **DONE** `plugin_search` + `plugin_install` tools exist in plugin-registry MCP
  `verify:file packaging/mcp-servers/plugin-registry/package.json`

### Offline & Cost
- **DONE** `/ollama` — built-in template: auto-detect, configure, switch to local models
  `verify:grep src/nocowboy/config/overlay ollama`
- **DONE** Ollama is OpenAI-compatible — `providers.ollama` in nocowboy.json
  `verify:grep src/nocowboy/config/overlay ollama`

---

## v1.0.0 — Production

### 152-ФЗ Compliance
- **DONE** P3-B1: Лицензия под юрисдикцией РФ — Chapter 69 Civil Code в LICENSE.md
  `verify:file LICENSE.md`
- **DONE** P3-B2: Consent dialog при первом запуске TUI — `consent_152fz`
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
- **DONE** P3-B3: Локализация данных — SQLite в `.nocowboy/storage/` (локально)
  `verify:grep src/nocowboy/session/checkpoint-paths .local/share/nocowboy`
- **DONE** P3-B4: `/forget` — built-in template: подтверждение → очистка
  `verify:grep src/nocowboy/server/httpapi/groups/background-process forget`
- **DONE** P3-B5: Правовое обоснование — уведомление РКН не требуется
  `verify:file docs/legal/152FZ-COMPLIANCE.md`
- **DONE** P3-B6: Полный правовой анализ 152-ФЗ
  `verify:file docs/legal/152FZ-COMPLIANCE.md`

### Sharing
- **DONE** `/share` — built-in template для публикации сессии
  `verify:file packages/opencode/src/share/share-next.ts`
  `verify:file packages/opencode/src/share/session.ts`

### Sync & Deploy
> **Честный статус:** Event-sourcing фундамент есть (`src/sync/`), но:
> - Turso multi-machine sync — **НЕ РЕАЛИЗОВАН** (ADR: Phase 1 blocked)
> - CLI-команды `tausik turso setup/sync/status` — **НЕ РЕАЛИЗОВАНЫ**
> - `turso` секция в конфиге — **НЕ РЕАЛИЗОВАНА**

- `src/sync/` — Event-sourcing система для session replayability
  `verify:file packages/opencode/src/sync/index.ts`
- Turso — production SQLite для multi-machine
  `verify:file packages/opencode/src/sync/turso-sync.ts`
- CLI: `tausik turso setup`, `tausik turso sync`, `tausik turso status`
- `turso` секция в NutausikConfig (url, authToken, syncInterval)

### Publish
- **DONE** `scripts/publish-all.sh` — скрипт для публикации всех 9 MCP пакетов
  `verify:file scripts/publish-all.sh`
- **DONE** 9 пакетов `@nocowboy/mcp-*` готовы к публикации
  `verify:file packaging/mcp-servers/constitution/package.json`
  `verify:file packaging/mcp-servers/score-engine/package.json`
- npm org `@nocowboy` — создать на npmjs.com/org/create
  `verify:grep scripts/publish-all npm`
- `npm run publish-all` — опубликовать все пакеты одной командой
  `verify:cmd npm org ls nocowboy 2>/dev/null`
