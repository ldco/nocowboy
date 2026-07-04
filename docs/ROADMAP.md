# NoCowboy — Roadmap

> **Что выйдет:** Этот файл — план будущих релизов. Что уже вышло → [CHANGELOG.md](CHANGELOG.md).
> **Sync:** Релизы NoCowboy синхронизированы с [NUTAUSIK](https://github.com/nocowboy/nutausik-js/blob/master/ROADMAP.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.

---

## v0.8.0 — Full Auto-Wiring + Russian Language

**NUTAUSIK companion: v0.3.0**

### NUTAUSIK Auto-Wiring (Phases 2-4)
- Phase 2: Todo injection — `context_inject` block в каждом системном промпте
- Phase 3: Session auto-wiring — авто-создание task при старте, логирование tool calls, закрытие при завершении
- Phase 4: Verification loop — авто-проверка AC перед task_done, coherence check при старте
- `nutausik-hooks.sh` → перевести на автоматический режим (сейчас ручной)

### Session Handoff
- Автоматическое сохранение HANDOFF при завершении сессии
- Авто-загрузка контекста из предыдущей сессии при старте
- Интеграция с NUTAUSIK `handoff_save` / `handoff_load`

### Escalation Statuses
- DONE / DONE_WITH_CONCERNS / BLOCKED в NUTAUSIK task status

### TUI — Commands Tab
- Новая вкладка в sidebar: Info → History → **Commands** → Settings
- Список всех доступных команд с описанием и примерами
- Иконки, группировка по категориям, поиск

### Russian Language
- Русские системные промпты для всех агентов (code, debug, architect)
- Русские инструкции (`instructions/ru/`)
- Поддержка YandexGPT и GigaChat
- Поле `lang` в `nocowboy.json`
- UI локализация (метки, ошибки, помощь)

### Codebase
- Дедупликация и оптимизация 30 команд
- MCP server framework → merge в NUTAUSIK

---

## v0.9.0 — Ecosystem

**NUTAUSIK companion: v0.4.0**

### Sandbox & Isolation
- Diff review sandbox — изоляция AI-изменений до принятия (Plandex-style)
- Sandbox mode — выполнение команд в Docker (OpenHands-style)

### Deep Context
- 2M token context с бюджетированием
- Repomap через tree-sitter (AST-based, не regex)

### MCP Marketplace
- `mcp search` — поиск и установка MCP серверов (Cline-style)

### Offline & Cost
- Offline mode через Ollama (локальные модели)
- Per-task cost tracking с леджером

---

## v1.0.0 — Production

**NUTAUSIK companion: v1.0.0**

### 152-ФЗ Compliance
- P3-B1: Лицензия под юрисдикцией РФ (сейчас LICENSE отсутствует)
- P3-B2: Consent dialogs по ст. 9
- P3-B3: Локализация данных по ст. 21
- P3-B4: `nocowboy forget` — право на удаление
- P3-B5: Уведомление РКН по ст. 22
- P3-B6: Legal research — являются ли данные в nutausik.db персональными? (ответ юриста)

### LLM Providers
- YandexGPT и GigaChat с лёгким переключением

### Sync & Deploy
- Share chat / синхронизация между машинами
- Turso — production SQLite для multi-machine

### Publish
- npm org `@nocowboy`
- `@nocowboy/nocowboy`, `@nocowboy/mcp-*` (7 пакетов)
- `@nocowboy/nutausik`
