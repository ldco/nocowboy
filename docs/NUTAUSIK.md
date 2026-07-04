# NUTAUSIK — Competitive Analysis & Design Document

## 1. Current State

**NUTAUSIK v0.1.0** — отдельный TypeScript-репозиторий (`nutausik-js`). Полноценный фреймворк инженерного надзора, не просто MCP-сервер.

### 1.1 Architecture

```
Agent → { CLI (npx nutausik) | MCP (123 tools) }
              ↓
         Service Layer     ← бизнес-логика, валидация, QG-0, QG-2
              ↓
         Backend Layer     ← better-sqlite3 CRUD, FTS5, graph, metrics
              ↓
         SQLite (WAL)     ← .nutausik/nutausik.db (27 tables + 8 FTS5)
```

Три слоя, строгое разделение: **CLI не трогает БД. Service валидирует. Backend исполняет.**

### 1.2 Что уже есть

| Слой | Что | Статус |
|---|---|---|
| **MCP** | 131 инструмент (добавлены context_inject, handoff_save, handoff_load, coherence_check, loop_close) | ✅ v0.2.0 |
| **CLI** | context-inject, handoff-save, handoff-load, coherence-check, loop-close | ✅ v0.2.0 |
| **Service** | task.ts (250 lines, lifecycle FSM), session.ts, verification.ts, knowledge.ts, hierarchy.ts, validation.ts, **context-inject.ts**, **handoff.ts**, **coherence.ts**, **loop-close.ts** | ✅ |
| **Hooks** | 17 lifecycle hooks: session-start, task-gate, task-verify, activity, bash-firewall, secret-scan, etc. | ✅ Claude Code формат |
| **Tests** | 488 тестов, 45 файлов, 100% pass rate | ✅ v0.2.0 |
| **Metrics** | Throughput, first-pass success, defect escape rate, lead time | ✅ |

### 1.3 Task Lifecycle

```
planning → active → blocked/review → done
```

Переходы захардкожены в `LIFECYCLE_TRANSITIONS`. Нельзя прыгнуть из planning в done.

### 1.4 Hooks (существующие, Claude Code)

| Hook | Что делает | Файл |
|---|---|---|
| **session-start** | Проверяет есть ли активный task, сообщает агенту | `hooks/session-start.ts` |
| **task-gate** | Блокирует Write/Edit если нет активного task'а | `hooks/task-gate.ts` |
| **activity** | Логирует Write/Edit/Bash в activity.log | `hooks/activity.ts` |
| **bash-firewall** | Блокирует опасные команды (rm -rf, sudo, etc.) | `hooks/bash-firewall.ts` |
| **secret-scan** | Сканирует на секреты перед записью | `hooks/secret-scan.ts` |
| **task-verify** | Авто-запускает verify перед task_done | `hooks/task-verify.ts` |
| **memory-audit** | Аудирует память на дубликаты | `hooks/memory-audit.ts` |
| **session-metrics** | Собирает метрики сессии | `hooks/session-metrics.ts` |
| ... | ещё 9 хуков | `hooks/` |

**Проблема:** Все хуки написаны под Claude Code (`CLAUDE_PROJECT_DIR`). Нужно адаптировать под NoCowboy (`.nocowboy/hooks.json`).

### 1.5 Что отсутствует для Auto-Wiring

| # | Что нужно | Почему |
|---|---|---|
| 1 | **NoCowboy hooks** — адаптировать 17 Claude Code хуков | Сейчас они не работают в NoCowboy |
| 2 | **Todo Injection** — инжект NUTAUSIK-контекста в промпт | Есть `context_inject` MCP-инструмент. Нужно: модифицировать `session/prompt.ts` в NoCowboy для вызова. | 🔴 Critical v0.2.0 (tool) / Phase 2 (integration) |
| 3 | **context_inject tool** — MCP-инструмент для генерации prompt-блока | ✅ Реализовано — `nutausik_context_inject` (131-й инструмент) |
| 4 | **Task↔Session binding** — связь task slug ↔ session ID | Есть `handoff_save/load`. Нужно: NoCowboy hooks для авто-логирования. | 🔴 Critical |
| 5 | **Auto-handoff** — сохранение/загрузка HANDOFF при старте/конце сессии | Есть `handoff_save/load`. Нужно: NoCowboy hooks. | 🔴 Critical |

---

## 2. Competitive Analysis

### Plandex (plandex-ai/plandex)
| Feature | How it works | NUTAUSIK equivalent |
|---|---|---|
| **Plans** — core work unit | Каждый plan = задача с контекстом, шагами, состоянием | task_add + task_plan |
| **Branches** | Несколько путей решения в одном плане | ❌ Missing |
| **Diff sandbox** | Изменения изолированы до принятия | ❌ Missing (но есть receipt_verify) |
| **Version control plans** | Каждое изменение плана версионируется | events_list (история событий) |
| **Auto-context** | Автоматически подгружает нужные файлы | ❌ Missing (нужен tree-sitter repomap) |
| **Autonomy slider** | Ползунок от manual до full auto | gates (enable/disable per gate) |

**Что Plandex делает лучше:** Diff sandbox — изолирует AI-изменения до review. Branches внутри планов.
**Что NUTAUSIK делает лучше:** Полноценная иерархия Epic→Story→Task. Memory, Decisions, Specs, Gates.

### Claude Code (Anthropic)
| Feature | How it works | NUTAUSIK equivalent |
|---|---|---|
| **TODO system** | Простой текстовый список в промпте | todowrite (встроен в NoCowboy) |
| **Session resume** | Продолжение с того же места | session_start + session_handoff |
| **Permission model** | ask/allow/deny per tool | gates_enable/disable |

**Что Claude Code делает лучше:** Интеграция todo в промпт агента — агент всегда видит свой TODO.
**Что NUTAUSIK делает лучше:** Персистентная память, решения, спецификации — между сессиями.

### Aider (paul-gauthier/aider)
| Feature | How it works | NUTAUSIK equivalent |
|---|---|---|
| **Chat history** | Список сообщений с summarization | session_list + session_handoff |
| **Repo map** | AST-based карта проекта | ❌ Missing (нужен tree-sitter) |
| **Auto-commits** | git commit после каждого изменения | ❌ Missing (можно через MCP git) |
| **Lint/test loop** | Авто-линт + авто-тест после изменений | verify |

**Что Aider делает лучше:** Repo map даёт понимание структуры проекта. Auto-lint/test loop.
**Что NUTAUSIK делает лучше:** Полноценный project management с иерархией задач.

### OpenHands (All-Hands-AI)
| Feature | How it works | NUTAUSIK equivalent |
|---|---|---|
| **Task planning** | Разбивает задачу на подзадачи | task_plan + task_step |
| **Agent delegation** | Делегирует подзадачи другим агентам | task_claim (агент берёт задачу) |
| **Sandbox** | Docker-контейнер для изоляции | ❌ Missing |

**Что OpenHands делает лучше:** Полная изоляция через Docker.
**Что NUTAUSIK делает лучше:** Гораздо более rich data model (specs, decisions, brain).

---

## 3. What NUTAUSIK Is Missing (vs Competitors)

| # | Missing Feature | Competitor | Priority |
|---|---|---|---|
| 1 | **Auto-wiring** — агенты автоматически вызывают NUTAUSIK | — | 🔴 Critical | 🟡 `context_inject` + `handoff` tools готовы, NoCowboy hooks не дописаны |
| 2 | **Branch per task** — несколько путей решения | Plandex | 🟡 Medium | ❌ Не реализовано |
| 3 | **Diff sandbox** — изоляция AI-изменений до review | Plandex | 🟡 Medium | ❌ Не реализовано |
| 4 | **Repo map** — tree-sitter AST карта проекта | Aider/Plandex | 🟡 Medium | ❌ Не реализовано |
| 5 | **Auto lint/test loop** — авто-проверка после каждого изменения | Aider | 🟢 Low (частично verify) | ❌ Не реализовано |
| 6 | **Todo injection** — инжект текущего TODO в промпт агента | Claude Code | 🔴 Critical | 🟡 `context_inject` tool готов, NoCowboy prompt.ts не модифицирован |
| 7 | **Docker sandbox** — изоляция исполнения | OpenHands | 🟢 Low | ❌ Не реализовано |
| 8 | **Plan versioning UI** — визуальная история изменений плана | Plandex | 🟢 Low | ❌ Не реализовано |

---

## 4. Auto-Wiring Design

### 4.1 Session Lifecycle Hooks

Каждая сессия NoCowboy автоматически интегрируется с NUTAUSIK:

```
SESSION_START:
  1. Создать task в NUTAUSIK (task_quick)
  2. Связать session ID ↔ task slug
  3. Инжектить task context в промпт агента (Todo Injection)

TOOL_USE:
  4. Логировать значимые tool calls в task_log
  5. После edit/bash — авто-запускать verify если настроено

SESSION_END:
  6. task_done с ac_verified
  7. Сохранить memory (извлечённые уроки)
  8. Сгенерировать HANDOFF для следующей сессии
```

### 4.2 Todo Injection (Critical)

Каждый агент должен видеть в своём промпте:
```
<nutausik_context>
Current task: P2-A7 NUTAUSIK Auto-Wiring
Status: active
Acceptance criteria:
- Agents auto-create tasks on session start
- Tool calls are auto-logged to tasks
- Session end triggers verification
Memory surfaced: [3 recent memories]
Decisions active: [2 relevant decisions]
</nutausik_context>
```

Это требует модификации `session/prompt.ts` — добавить вызов NUTAUSIK при сборке системного промпта.

### 4.3 Verification Loop

```
after_each_edit:
  if auto_verify enabled:
    run verify(task_slug)
    if FAIL:
      log to task
      notify agent
      block task_done until AC passed
```

### 4.4 Coherence Check

```
before_task_start:
  check plan vs memory surface
  check plan vs active decisions
  check plan vs ROADMAP (if present)
  if conflict → warn agent in prompt
```

---

## 5. NUTAUSIK Improvements (New Tools)

| # | New Tool | What it does |
|---|---|---|
| 1 | `task_branch` | Создать ветку задачи (Plandex-style) |
| 2 | `task_merge` | Слить ветку обратно |
| 3 | `task_diff` | Показать diff между ветками |
| 4 | `coherence_check` | ✅ v0.2.0 |
| 5 | `loop_close` | ✅ v0.2.0 |
| 6 | `handoff_save` | ✅ v0.2.0 |
| 7 | `handoff_load` | ✅ v0.2.0 |
| 8 | `context_inject` | ✅ v0.2.0 |

---

## 6. Implementation Phases

### Phase 1: NoCowboy Hooks (Quick win — 17 хуков уже написаны)

**Что:** Адаптировать существующие Claude Code хуки в `.nocowboy/hooks.json`.

**Как:** NoCowboy поддерживает хуки через `.nocowboy/hooks.json`. Каждый хук — это `PreToolUse`/`PostToolUse`/`SessionStart`/`SessionEnd` событие с shell-командой. Нужно:

1. Конвертировать 17 хуков из `packages/nutausik/src/hooks/*.ts` в формат `.nocowboy/hooks.json`
2. Заменить `CLAUDE_PROJECT_DIR` на NoCowboy-эквивалент (cwd передаётся через stdin JSON)
3. Скопировать скомпилированные `.js` файлы хуков в директорию, доступную для shell-вызова
4. Повесить хуки на правильные события:

| Hook | NoCowboy Event | Tool Matcher |
|---|---|---|
| session-start | SessionStart | — |
| task-gate | PreToolUse | Write, Edit |
| activity | PostToolUse | Write, Edit, Bash |
| bash-firewall | PreToolUse | Bash |
| secret-scan | PreToolUse | Write, Edit |
| task-verify | PreToolUse | task_done |
| session-metrics | SessionEnd | — |

**Файлы:** `.nocowboy/hooks.json` + скопированные `hooks/*.js`

### Phase 2: Todo Injection — NUTAUSIK side ✅ (v0.2.0)
- `context_inject` MCP tool — generates `<nutausik_context>` block with active task, memory, decisions
- CLI: `nutausik context-inject`

**Ещё нужно в NoCowboy:** Модифицировать `session/prompt.ts` — добавить вызов `nutausik_context_inject` при сборке системного промпта.

### Phase 3: Session Auto-Wiring — NUTAUSIK side ✅ (v0.2.0)
- `handoff_save` / `handoff_load` MCP tools — session handoff persistence
- CLI: `nutausik handoff-save`, `nutausik handoff-load`

**Ещё нужно в NoCowboy:** Хуки для SessionStart → auto-create task, PostToolUse → auto-log, SessionEnd → auto-handoff.

### Phase 4: Verification & Coherence — NUTAUSIK side ✅ (v0.2.0)
- `coherence_check` MCP tool — validates plan vs memory/decisions
- `loop_close` MCP tool — plan vs actual comparison
- CLI: `nutausik coherence-check`, `nutausik loop-close`

---

## 7. Open Questions (Resolved)

1. **NUTAUSIK — отдельный репо.** ✅ Решено — `nutausik-js` отдельно. MCP-сервер подключается по HTTP.
2. **Хуки — где хранить?** ✅ `.nocowboy/hooks.json` в проекте NoCowboy. Скомпилированные JS-файлы хуков из NUTAUSIK копируются при инициализации.
3. **AC Evidence — ручное или авто?** ✅ Phase 4 — авто через `verify`. Сейчас ручное (`ac_evidence_log`). Покрыто `coherence_check`.
4. **Brain sync — Notion интеграция нужна?** ✅ Есть (`brain_sync`). Оставляем как есть.
5. **Метрики SENAR — интегрировать в HUD?** ✅ В NUTAUSIK есть `metrics` и `hud`. Можно добавить вкладку в TUI — не критично для v0.2.0.
