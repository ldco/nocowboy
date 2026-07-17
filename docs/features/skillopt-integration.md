# SkillOpt Integration — Self-Evolving Agent Skills в NoCowboy

> **ID:** `skillopt-integration`
> **Status:** `planned`
> **Version:** `v0.12.0`
> **Source:** https://github.com/microsoft/SkillOpt (MIT, v0.2.0, 13k ★)
> **Автор анализа:** NoCowboy (сессия #3, звено цепи)
> **Дата:** 2026-07-17

---

## 1. Executive Summary

**SkillOpt** — фреймворк Microsoft Research для оптимизации natural-language
skill-документов через итеративный цикл с validation gate. Работает **без
изменения весов модели**. Оптимизирует только текстовый промпт/skill
(`SKILL.md`, 300–2000 токенов).

**SkillOpt-Sleep** — nightly self-evolution агента: читает сессии, извлекает
повторяющиеся задачи, проигрывает их офлайн, предлагает bounded edits к SKILL.md
через validation gate, и ставит proposal на утверждение пользователя.

**NoCowboy** получает:
- Self-improving агента без дообучения модели
- Validation gate — защита от деградации
- Прозрачность — всё в тексте, версионируется, откатывается
- Интеграцию через MCP (как Copilot/Devin) — 0 новых зависимостей в харнесе

### Ключевые метрики SkillOpt (из paper)

| Метрика | Значение |
|---------|----------|
| Бенчмарков | 6 (DocVQA, ALFWorld, OfficeQA, SearchQA, LiveMathematicianBench, SpreadsheetBench) |
| Target-моделей | 7 (GPT-5.5, Claude 4 Opus, Qwen 3, и др.) |
| Execution harnesses | 3 (direct chat, Codex CLI, Claude Code CLI) |
| Выигранных cells | **52/52** (best or tied-best) |
| Lift GPT-5.5 direct chat | **+23.5 pts** accuracy |
| Lift GPT-5.5 в Codex loop | **+24.8 pts** |
| Lift GPT-5.5 в Claude Code | **+19.1 pts** |
| Размер best_skill.md | 300–2000 токенов |
| Inference-time overhead | **0** (скилл применяется как промпт) |

---

## 2. Архитектура SkillOpt

```
┌─────────────────────────────────────────────────────────────┐
│                    SkillOpt Research Engine                   │
│                                                              │
│   Rollout → Reflect → Aggregate → Select → Update → Gate    │
│   (target      (optimizer    (merge    (rank &    (apply   (held-out
│    executes     analyzes      edit       clip      bounded   validation)
│    tasks)       trajectories) patches)   edits)    edits)    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SkillOpt-Sleep (deployment)                │
│                                                              │
│   Harvest → Mine → Replay → Consolidate → Gate → Adopt      │
│   (session    (extract   (offline   (reflect +   (validate  (apply if
│    reader)     recurring   replay     bounded      held-out   passes)
│                tasks)      tasks)     edits)       score)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.1. Deep Learning Analogy

| Deep Learning | SkillOpt |
|---|---|
| Model weights | Skill document (Markdown) |
| Forward pass | Rollout (target executes tasks) |
| Loss / gradient | Reflect (optimizer produces edit patches) |
| Gradient clipping | Edit selection (`learning_rate` = max edits) |
| SGD step | Patch application to skill document |
| Validation set | Gated evaluation on held-out split |
| LR schedule | `lr_scheduler`: cosine, linear, constant |
| Epochs | Multi-epoch with slow update & meta skill |
| Batch size | Mini-batch of tasks per rollout |

### 2.2. SkillOpt-Sleep Pipeline (детально)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ONE "NIGHT" CYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. HARVEST                                                             │
│     ├── читает ~/.claude/ транскрипты (или NUTAUSIK сессии)             │
│     ├── read-only, ничего не мутирует                                    │
│     └── флаги: --lookback-hours 72, --max-sessions 10                   │
│                                                                         │
│  2. MINE                                                                │
│     ├── извлекает повторяющиеся паттерны из сессий                      │
│     ├── создаёт TaskRecord[]: {id, instruction, rubric, answer}         │
│     └── флаги: --max-tasks 40                                           │
│                                                                         │
│  3. REPLAY                                                              │
│     ├── проигрывает задачи через target model (или mock)                │
│     ├── собирает траектории (prompt → response)                         │
│     └── флаги: --backend mock|claude|codex|handoff                      │
│                                                                         │
│  4. CONSOLIDATE                                                         │
│     ├── Reflect: optimizer анализирует траектории, пишет edit patches    │
│     ├── Bounded edit: add/delete/replace, лимит --edit-budget 4         │
│     ├── Gate: валидация на held-out задачах (не участвовали в training) │
│     └── Gate принимает edit только если held-out score строго улучшен   │
│                                                                         │
│  5. STAGE                                                               │
│     ├── proposal записывается в .skillopt-sleep/staging/                │
│     ├── backup оригинального SKILL.md создаётся                         │
│     └── ничего live не меняется до adopt                                │
│                                                                         │
│  6. ADOPT (manual)                                                      │
│     ├── пользователь вызывает sleep_adopt                               │
│     ├── новый SKILL.md = proposal (с backup)                            │
│     └── NoCowboy перезагружает скиллы                                    │
│                                                                         │
└─────────────────────────────────────────────────────────── adopt ──────┘
```

---

## 3. Интеграция в NoCowboy — архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NoCowboy Harness                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐    ┌────────────────────┐    ┌──────────────────┐  │
│  │   TUI / CLI    │    │   NUTAUSIK Core     │    │   MCP System     │  │
│  │                │    │                     │    │                  │  │
│  │  /sleep status │    │  session_store      │    │  mcp-migrator.ts │  │
│  │  /sleep run    │    │  memory FTS5        │    │  mcp серверы     │  │
│  │  /sleep adopt  │    │  task manager       │    │  (local/remote)  │  │
│  └───────┬────────┘    └──────────┬──────────┘    └────────┬─────────┘  │
│          │                       │                        │             │
│          ▼                       ▼                        ▼             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              NoCowboy SkillOpt Bridge (this feature)              │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐   │  │
│  │  │ MCP Server    │  │ NUTAUSIK Harvest  │  │ CLI Wrapper      │   │  │
│  │  │ (skillopt-    │  │ Bridge (конвертер  │  │ (/sleep команда) │   │  │
│  │  │  sleep MCP)   │  │  nocowboy→skillopt)│  │                  │   │  │
│  │  └──────┬───────┘  └────────┬──────────┘  └────────┬─────────┘   │  │
│  │         │                   │                       │             │  │
│  │         ▼                   ▼                       ▼             │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │
│  │  │           skillopt_sleep (Python engine, pip install)        │  │
│  │  │                                                              │  │
│  │  │  harvest → mine → replay → consolidate → gate → stage       │  │
│  │  └──────────────────────────────────────────────────────────────┘  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              SKILL.md File System (эволюционируемый скилл)        │  │
│  │                                                                   │  │
│  │  ~/.config/nocowboy/skills/<name>/SKILL.md  (глобальные скиллы)   │  │
│  │  .nocowboy/skills/<name>/SKILL.md           (проектные скиллы)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Компоненты интеграции

| Компонент | Технология | Отвечает за |
|-----------|-----------|-------------|
| **MCP сервер** | Python stdlib (JSON-RPC 2.0 stdio) | sleep_status/dry_run/run/adopt как MCP tools |
| **NUTAUSIK Harvest Bridge** | TypeScript, NUTAUSIK API | Конвертация nocowboy-сессий → TaskRecord JSON |
| **CLI Wrapper** | TypeScript, TUI command | `/sleep` команда в TUI/CLI |
| **Post-session Hook** | NUTAUSIK hooks | Автоматический harvest после сессии |
| **nocowboy backend** | Python, SkillOpt plugin | Использование провайдеров NoCowboy вместо API ключей |
| **Skill Framework Bridge** | TypeScript, skill/discovery.ts | Перезагрузка скиллов после adopt |

---

## 4. Полный Pipeline (от пользователя до эволюции)

### 4.1. Первый запуск: инициализация

```bash
# NoCowboy при старте (или при первом /sleep)
nocowboy skillopt init

# Что происходит:
# 1. Проверка Python 3.10+: python3 --version
# 2. pip install skillopt (если не установлен)
# 3. Проверка импорта: python3 -c "import skillopt_sleep"
# 4. Регистрация MCP сервера в конфиге .nocowboy/mcp.json
# 5. Создание ~/.skillopt-sleep/config.json с дефолтами
# 6. Проверка mock backend: python3 -m skillopt_sleep status --backend mock
```

### 4.2. Dry-run (проверка без изменений)

```bash
# Через MCP tool
/sleep dry-run

# Что происходит:
# 1. NUTAUSIK Harvest Bridge собирает сессии за последние 72h
# 2. Конвертирует в TaskRecord JSON
# 3. Передаёт в skillopt_sleep dry-run --tasks-file reviewed-tasks.json
# 4. SkillOpt: mine + replay (mock backend)
# 5. Вывод: сколько задач найдено, какой proposal был бы
# 6. Ничего не меняется
```

### 4.3. Полный цикл

```bash
/sleep run --backend mock                  # без API затрат
/sleep run --backend nocowboy             # через провайдеры NoCowboy
/sleep run --backend nocowboy --model deepseek-v4-flash
/sleep run --backend handoff              # ручные ответы на промпты

# Что происходит:
# 1. Harvest: NUTAUSIK сессии → TaskRecord[]
# 2. Mine: извлечение повторяющихся задач
# 3. Split: 80% train, 20% held-out validation
# 4. Replay: проигрывание задач
# 5. Reflect: optimizer пишет bounded edits
# 6. Gate: проверка на held-out
# 7. Stage: proposal + backup
# 8. Вывод: summary + diff
```

### 4.4. Adopt (применение)

```bash
/sleep status            # посмотреть proposal
/sleep adopt             # применить

# Что происходит:
# 1. Чтение staged proposal из .skillopt-sleep/staging/
# 2. Backup SKILL.md → SKILL.md.bak.<timestamp>
# 3. Запись нового SKILL.md
# 4. NoCowboy: перезагрузка скиллов через skill/discovery.ts
# 5. Логирование в nutausik_memory_add
```

### 4.5. Scheduled (автоматический режим)

```bash
/sleep schedule --hour 3 --minute 17      # каждый день в 3:17
/sleep unschedule                          # отмена

# crontab запись:
# 17 3 * * * nocowboy skillopt sleep run --scope invoked --auto-adopt
```

### 4.6. End-to-End Sequence Diagram

```
User                  NoCowboy CLI          MCP Server         NUTAUSIK          SkillOpt Engine
 │                        │                    │                  │                  │
 │  /sleep run            │                    │                  │                  │
 ├────────────────────────▶                    │                  │                  │
 │                        │  tools/call sleep_run                  │                  │
 │                        ├───────────────────▶                    │                  │
 │                        │                    │  harvest_sessions │                  │
 │                        │                    ├─────────────────▶│                  │
 │                        │                    │  ◄── sessions ───┤                  │
 │                        │                    │                  │                  │
 │                        │                    │  convert → TaskRecord.json          │
 │                        │                    ├────────────────────────────────────▶│
 │                        │                    │                  │                  │
 │                        │                    │  python -m skillopt_sleep run      │
 │                        │                    ├────────────────────────────────────▶│
 │                        │                    │                  │                  │
 │                        │                    │  ◄── proposal ─────────────────────┤
 │                        │                    │                  │                  │
 │                        │  ◄── result ───────┤                  │                  │
 │  ◄── report ───────────┤                    │                  │                  │
 │                        │                    │                  │                  │
 │  /sleep status         │                    │                  │                  │
 ├────────────────────────▶                    │                  │                  │
 │                        │  tools/call sleep_status              │                  │
 │                        ├───────────────────▶                    │                  │
 │  ◄── proposal diff ────┤                    │                  │                  │
 │                        │                    │                  │                  │
 │  /sleep adopt          │                    │                  │                  │
 ├────────────────────────▶                    │                  │                  │
 │                        │  tools/call sleep_adopt               │                  │
 │                        ├───────────────────▶                    │                  │
 │                        │                    │  apply proposal                    │
 │                        │                    ├────────────────────────────────────▶│
 │                        │                    │  ◄── done ────────────────────────┤
 │                        │                    │  reload skills                     │
 │                        │                    ├─── skill/discovery.ts ────────────▶│
 │  ◄── adopted ──────────┤                    │                  │                  │
 │                        │                    │                  │                  │
```

---

## 5. Техническая спецификация компонентов

### 5.1. MCP сервер (TypeScript wrapper → Python)

**Файл:** `packages/opencode/src/nocowboy/mcp/skillopt-sleep.ts`

```typescript
export namespace SkillOptSleepMCP {
  const SERVER_NAME = "skillopt-sleep"

  /** Проверка что Python 3.10+ и skillopt установлен */
  export async function checkPrerequisites(): Promise<{
    ok: boolean
    python?: string
    version?: string
    error?: string
  }> {
    // python3 --version >= 3.10
    // python3 -c "import skillopt_sleep"
  }

  /** Конфиг для built-in MCP сервера (local stdio transport) */
  export function getMcpConfig(): ConfigMCP.Local {
    return {
      type: "local",
      command: ["python3", "-m", "skillopt_sleep", "mcp"],
      vendor: "nocowboy",
      enabled: true,
    }
  }

  /** Tools, регистрируемые MCP сервером */
  export const TOOLS = [
    {
      name: "sleep_status",
      description: "Show SkillOpt-Sleep state and latest staged proposal",
      inputSchema: { /* project, json */ }
    },
    {
      name: "sleep_dry_run",
      description: "Preview a sleep cycle — nothing changes",
      inputSchema: { /* project, backend, scope, ... */ }
    },
    {
      name: "sleep_run",
      description: "Run a full sleep cycle — stages proposal",
      inputSchema: { /* project, backend, model, ... */ }
    },
    {
      name: "sleep_adopt",
      description: "Apply the latest staged proposal to SKILL.md",
      inputSchema: { /* project, target_skill_path */ }
    },
    {
      name: "sleep_harvest",
      description: "Debug — list mined recurring tasks",
      inputSchema: { /* project, lookback_hours */ }
    },
    {
      name: "sleep_schedule",
      description: "Install nightly cron for sleep cycle",
      inputSchema: { /* hour, minute, project */ }
    },
    {
      name: "sleep_unschedule",
      description: "Remove nightly cron entry",
      inputSchema: { /* project */ }
    },
  ]
}
```

### 5.2. NUTAUSIK Harvest Bridge

**Файл:** `packages/opencode/src/nocowboy/mcp/skillopt-harvest.ts`

```typescript
export namespace SkillOptHarvest {
  /** Формат задачи для SkillOpt */
  interface TaskRecord {
    id: string
    instruction: string       // что нужно сделать
    rubric?: string           // как оценивать результат
    answer?: string           // эталонный ответ
    difficulty?: "easy" | "medium" | "hard"
    tags?: string[]
  }

  /** Собрать задачи из NUTAUSIK */
  export async function harvestFromNutausik(
    opts: {
      lookbackHours: number   // 72 по умолчанию
      maxSessions: number     // 10 по умолчанию
      maxTasks: number        // 40 по умолчанию
    }
  ): Promise<{
    tasks: TaskRecord[]
    sessions: number
    source: "nutausik"
  }> {
    // 1. nutausik_task_list(status: "done")
    // 2. Для каждой задачи: nutausik_task_show → goal + acceptance_criteria
    // 3. nutausik_memory_list(type: "pattern" | "gotcha")
    // 4. Конвертация в TaskRecord[]
    // 5. Запись во временный JSON
  }

  /** Собрать задачи из рутовой директории сессий (fallback) */
  export async function harvestFromSessions(
    sessionsDir: string,
    opts: { lookbackHours: number }
  ): Promise<TaskRecord[]> {
    // Сканирование ~/.local/share/nocowboy/storage/
    // Парсинг JSON сессий
    // Извлечение интентов + результатов
  }
}
```

### 5.3. CLI команда `/sleep`

**Файл:** `.nocowboy/command/sleep.md` (кастомная команда)
**Файл:** `packages/opencode/src/nocowboy/cli/cmd/skillopt-sleep.ts` (TypeScript хендлер)

```yaml
# .nocowboy/command/sleep.md
---
name: sleep
description: "SkillOpt-Sleep: self-evolution агента через ночной цикл"
usage: |
  /sleep status              — статус и последний proposal
  /sleep dry-run             — превью (ничего не меняется)
  /sleep run                 — полный цикл (stages proposal)
  /sleep adopt               — применить proposal к SKILL.md
  /sleep harvest             — показать извлечённые задачи
  /sleep schedule [--hour]   — установить nightly cron
  /sleep unschedule          — убрать cron
variables:
  backend: "mock|nocowboy|claude|codex|handoff"
  scope: "invoked|all"
  lookback_hours: 72
  model: "deepseek-v4-flash"
context: |
  SkillOpt-Sleep анализирует твои сессии, находит повторяющиеся задачи,
  проигрывает их, и предлагает улучшения к SKILL.md через validation gate.
  Ничего не меняется без явного adopt.
```

### 5.4. Post-session Hook

```json
{
  "event": "SessionEnd",
  "matcher": "*",
  "type": "command",
  "command": "nocowboy-skillopt sleep harvest --scope invoked --backend mock --json",
  "timeout": 300
}
```

- **Не делает replay** — только harvest + mine
- **Mock backend** — 0 API затрат
- Результат пишется в `.skillopt-sleep/today-tasks.json`
- Пользователь может потом сделать `/sleep run --tasks-file today-tasks.json`

### 5.5. nocowboy backend для SkillOpt

**Файл:** `packages/opencode/src/nocowboy/mcp/skillopt-backend/` (Python)

```python
# nocowboy_backend.py — регистрируется как SkillOpt backend
# Вместо claude -p вызывает HTTP API NoCowboy

from skillopt.model.base import Backend
import httpx
import json

class NoCowboyBackend(Backend):
    """Использует провайдеров NoCowboy вместо API ключей."""

    def __init__(self):
        # Читает настройки из .nocowboy/nocowboy.json
        # Использует настроенного провайдера (OpenAI/DeepSeek/Qwen/...)
        pass

    def chat(self, messages, **kwargs) -> str:
        # POST /api/chat к локальному NoCowboy серверу
        # Поддерживает все модели, доступные в NoCowboy
        pass
```

### 5.6. Skill Framework Bridge

После `sleep_adopt`:

```typescript
export async function reloadSkillsAfterAdopt(skillPath: string): Promise<void> {
  // 1. Проверить что SKILL.md обновлён
  // 2. Вызвать skill/discovery.ts перезагрузку
  // 3. Обновить agent system prompt если нужно
  // 4. nutausik_memory_add: "skillopt-sleep: adopt applied"
}
```

---

## 6. Бэклог (Task-level)

### P0 — Critical Path (блокирующие)

| # | Задача | Оценка | Зависимости |
|---|--------|--------|-------------|
| 1 | **init command** — проверка Python 3.10+, pip install skillopt, MCP регистрация | 4h | — |
| 2 | **MCP сервер** — TypeScript wrapper вокруг python3 -m skillopt_sleep mcp | 8h | #1 |
| 3 | **NUTAUSIK Harvest Bridge** — конвертация nocowboy сессий → TaskRecord JSON | 8h | — |
| 4 | **/sleep CLI команда** — TUI command, routing to MCP tools | 4h | #2 |
| 5 | **Mock backend validation** — `/sleep dry-run --backend mock` работает end-to-end | 2h | #1, #2, #3, #4 |

### P1 — Core Experience

| # | Задача | Оценка | Зависимости |
|---|--------|--------|-------------|
| 6 | **/sleep run** — полный цикл с mock backend | 4h | #5 |
| 7 | **/sleep status** — просмотр proposal + diff | 2h | #5 |
| 8 | **/sleep adopt** — применение proposal к SKILL.md | 2h | #6 |
| 9 | **Backup system** — backup SKILL.md.bak перед adopt | 1h | #8 |
| 10 | **Skill reload** — перезагрузка скиллов после adopt | 2h | #8 |

### P2 — Production Hardening

| # | Задача | Оценка | Зависимости |
|---|--------|--------|-------------|
| 11 | **nocowboy backend** — Python бекенд для SkillOpt | 12h | — |
| 12 | **/sleep run --backend nocowboy** — полный цикл с провайдерами NoCowboy | 4h | #6, #11 |
| 13 | **/sleep schedule** — nightly cron setup | 2h | #6 |
| 14 | **Post-session hook** — автоматический harvest+mind после сессии | 3h | #3 |
| 15 | **Preferences** — `--preferences "..."` для кастомизации правил | 2h | #6 |

### P3 — Ecosystem & Polish

| # | Задача | Оценка | Зависимости |
|---|--------|--------|-------------|
| 16 | **/sleep handoff** — handoff режим (ручные ответы на промпты) | 4h | #6 |
| 17 | **SearchQA integration** — use SkillOpt SearchQA benchmark для валидации интеграции | 6h | #11 |
| 18 | **gbrain-evals validation** — прогон benchmark: deficient skill 0.00 → 1.00 | 4h | #11 |
| 19 | **TUI progress bar** — визуализация прогресса sleep run | 4h | #6 |
| 20 | **WebUI dashboard** — интеграция с существующим WebUI NoCowboy | 8h | #6 |
| 21 | **Multi-project support** — отдельные SKILL.md для разных проектов | 4h | #8 |
| 22 | **Adopt rollback** — откат последнего adopt | 2h | #8 |

### Статистика бэклога

| Приоритет | Задач | Суммарная оценка |
|-----------|-------|------------------|
| P0 | 5 | 26h |
| P1 | 5 | 11h |
| P2 | 5 | 23h |
| P3 | 7 | 32h |
| **Total** | **22** | **~92h** |

---

## 7. Роадмап (Phased Delivery)

### Фаза 0: Infrastructure (v0.12.0, ~1 день)

```
Цель: pip install + MCP регистрация + проверка mock backend

Длительность: ~6h
Команда: 1 developer

Чекпойнты:
  [ ] Python 3.10+ проверка
  [ ] pip install skillopt
  [ ] python3 -m skillopt_sleep status --backend mock → OK
  [ ] MCP сервер зарегистрирован в .nocowboy/mcp.json
  [ ] /sleep status показывает "ready"

Доказательство:
  nocowboy skillopt init && /sleep status
```

### Фаза 1: Core Loop (v0.12.0, ~2 дня)

```
Цель: dry-run → run → status → adopt с mock backend

Длительность: ~16h
Команда: 1 developer
Зависимости: Фаза 0

Чекпойнты:
  [ ] NUTAUSIK Harvest Bridge конвертирует сессии
  [ ] /sleep dry-run показывает задачи и предполагаемый proposal
  [ ] /sleep run создаёт proposal .skillopt-sleep/staging/
  [ ] /sleep status показывает diff
  [ ] /sleep adopt применяет proposal к SKILL.md
  [ ] Backup создаётся перед adopt
  [ ] SKILL.md перезагружается

Доказательство:
  /sleep dry-run → /sleep run → /sleep status → /sleep adopt
  → SKILL.md обновлён, backup существует
```

### Фаза 2: Real Backend (v0.12.0, ~1.5 дня)

```
Цель: nocowboy backend + real эволюция

Длительность: ~16h
Команда: 1 developer
Зависимости: Фаза 1

Чекпойнты:
  [ ] nocowboy_backend.py написан и зарегистрирован
  [ ] /sleep run --backend nocowboy работает
  [ ] /sleep run --backend handoff работает (ручной режим)
  [ ] --model флаг переключает модель
  [ ] --preferences флаг кастомизирует правила

Доказательство:
  /sleep run --backend nocowboy --model deepseek-v4-flash
  → staged proposal с реальными bounded edits
```

### Фаза 3: Automation (v0.12.0, ~1 день)

```
Цель: post-session hook + schedule + auto-adopt опция

Длительность: ~8h
Команда: 1 developer
Зависимости: Фаза 2

Чекпойнты:
  [ ] Post-session hook: harvest + mine после каждой сессии
  [ ] /sleep schedule: nightly cron
  [ ] --auto-adopt флаг (с осторожностью)
  [ ] Multi-project support: отдельные SKILL.md для проектов
  [ ] /sleep adopt rollback

Доказательство:
  Сессия → harvest silently → /sleep status видит задачи
  → /sleep schedule → crontab -l показывает запись
```

### Фаза 4: Validation & Benchmark (v0.12.0, ~1 день)

```
Цель: доказать что интеграция работает через публичные бенчмарки

Длительность: ~8h
Команда: 1 developer
Зависимости: Фаза 2

Чекпойнты:
  [ ] SearchQA benchmark: pip install -e ".[searchqa]" + materialize
  [ ] run_experiment --persona researcher --assert-improves
  [ ] gbrain-evals: 0.00 → 1.00 на deficient skill
  [ ] Регрессионные тесты: MCP сервер, harvest bridge

Доказательство:
  python -m skillopt_sleep.experiments.run_experiment --assert-improves
  → "Gate kept worst case bounded. Score improved."
```

### Фаза 5: Production Polish (v0.12.0, ~1 день)

```
Цель: UI, метрики, документация

Длительность: ~6h
Команда: 1 developer
Зависимости: Фаза 3

Чекпойнты:
  [ ] TUI progress bar для sleep run
  [ ] NutausikDot показывает статус sleep
  [ ] Документация: docs/features/skillopt-integration.md (этот файл)
  [ ] Changelog: запись изменений
  [ ] Memory: nutausik_memory_add с паттернами

Доказательство:
  Документация написана, тесты проходят
```

### Итоговый роадмап

```
Спринт 1 (v0.12.0, ~7 дней):
┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ Фаза 0 │ Фаза 1 │ Фаза 1 │ Фаза 2 │ Фаза 2 │ Фаза 3 │Фаза 4+5│
│  (6h)  │  (8h)  │  (8h)  │  (8h)  │  (8h)  │  (8h)  │ (14h)  │
│ init   │dry-run │  run   │backend │handoff │ schedule│bench+  │
│ MCP    │harvest │ status │nocowboy│        │ hook   │ polish │
│ mock   │        │ adopt  │        │        │        │        │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

---

## 8. Тестирование

### 8.1. Unit-тесты (bun test)

| Тест | Описание |
|------|----------|
| `skillopt-harvest.test.ts` | Конвертация NUTAUSIK сессий → TaskRecord |
| `skillopt-mcp.test.ts` | MCP сервер: initialize, tools/list, tools/call |
| `skillopt-cli.test.ts` | Парсинг аргументов `/sleep` команды |
| `skillopt-backend.test.ts` | nocowboy backend: chat, модель |k

### 8.2. Integration-тесты

| Тест | Описание |
|------|----------|
| `skillopt-dry-run.test.ts` | Полный dry-run cycle с mock backend |
| `skillopt-full-cycle.test.ts` | run → status → adopt с mock backend |
| `skillopt-schedule.test.ts` | crontab запись/удаление |

### 8.3. Benchmark-тесты

```bash
# SearchQA benchmark (требует pip install -e ".[searchqa]")
python3 scripts/materialize_searchqa.py
python3 scripts/train.py --config configs/searchqa/default.yaml --out_root test_searchqa
python3 scripts/eval_only.py --config configs/searchqa/default.yaml \
  --skill test_searchqa/best_skill.md --split valid_unseen

# gbrain-evals
python3 -m skillopt_sleep.experiments.run_gbrain \
  --backend mock --seeds brief-writer \
  --data-root /tmp/gbrain-evals/eval/data/skillopt-v1 \
  --nights 1 --limit-replay 3 --limit-holdout 3

# Deterministic proof
python3 -m skillopt_sleep.experiments.run_experiment \
  --persona researcher --assert-improves
```

### 8.4. Safety-тесты

| Тест | Описание |
|------|----------|
| Harvest read-only | Проверка что harvest не мутирует сессии |
| Gate rejection | Вредный edit rejected gate'ом |
| Backup exists | После adopt backup создаётся |
| Rollback | Откат до предыдущего SKILL.md |
| Max bounds | edit-budget не превышает лимит |

---

## 9. Безопасность и Data Boundary

### 9.1. Data flow

```
NUTAUSIK сессии (локально, SQLite)
  → Harvest Bridge (конвертация, локально)
    → TaskRecord JSON (локально, временный файл)
      → SkillOpt engine (локально, Python)
        → Backend (mock|nocowboy|claude|codex)
          → провайдер (только если backend != mock)
```

### 9.2. Что отправляется провайдеру

При использовании `--backend nocowboy` (или claude/codex):
- `instruction` — текст задачи (из сессии)
- `rubric` — как оценивать (автоматически сгенерировано)
- `answer` — ожидаемый ответ (если есть)
- Текущий `SKILL.md` — контекст для optimizer
- `reflection prompts` — анализ optimizer

**Не отправляется:**
- Полные транскрипты сессий (только извлечённые задачи)
- API ключи (используются существующие провайдеры NoCowboy)
- Файлы проекта (только SKILL.md)

### 9.3. Safety guarantees

| Гарантия | Механизм |
|----------|----------|
| Harvest read-only | Только чтение, никаких write операций |
| Mock backend = 0 API calls | Детерминированный engine, без провайдера |
| Validation gate | Edit принимается только если улучшает held-out score |
| Staged proposal | Ничего не меняется до явного adopt |
| Backup на adopt | SKILL.md.bak.<timestamp> создаётся автоматически |
| Bounded edits | --edit-budget максимум 4 изменения за цикл |
| Max tasks | --max-tasks ограничивает количество задач |

---

## 10. Откат и Troubleshooting

### 10.1. Проблемы и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| Python 3.10+ не найден | Нет Python или версия < 3.10 | `pip install skillopt` не сработает |
| `module skillopt_sleep not found` | SkillOpt не установлен | `nocowboy skillopt init` |
| MCP сервер не стартует | Port conflict или ошибка в python | `skillopt-sleep mcp --debug` |
| Harvest пустой | Нет сессий за lookback_hours | Увеличить `--lookback-hours` |
| Gate rejected все edits | SKILL.md уже хорош или задачи шумные | Это нормально — gate защищает |
| Proposal не staged | Run не завершён или ошибка | `sleep status` покажет |

### 10.2. Откат adopt

```bash
# Ручной откат
mv .skillopt-sleep/staging/backup/SKILL.md.bak.<timestamp> SKILL.md

# Через /sleep
/sleep adopt rollback  # откат к предыдущему backup
```

### 10.3. Полный сброс

```bash
nocowboy skillopt reset          # удалить все данные sleep
rm -rf ~/.skillopt-sleep         # очистить staging + config
nocowboy skillopt init           # переинициализировать
```

---

## 11. Связанные фичи

| Фича | Связь |
|------|-------|
| `nutausik-phase1` | NUTAUSIK hooks — фундамент для post-session hook |
| `auto-dream-rule` | Auto-dream — ручной аналог Sleep harvest |
| `skill-framework` | SKILL.md — то, что эволюционирует |
| `mcp-marketplace` | MCP marketplace — где будет опубликован сервер |
| `distill-command` | Distill — более лёгкая альтернатива Sleep |
| `deep-context-2m` | Deep context — контекст для optimizer |
| `quality-enforcement` | Verification loop — validation gate пересекается |

---

## 12. Решения (Architecture Decision Records)

### ADR-1: MCP вместо CLI subprocess

**Решение:** Использовать MCP сервер как основной API для взаимодействия
с SkillOpt-Sleep, а не прямой subprocess вызов.

**Почему:**
- У NoCowboy уже есть MCP инфраструктура (mcp-migrator.ts, ConfigMCP)
- MCP tools могут быть вызваны из любого агента (не только TUI)
- Стандартный интерфейс для всех интеграций (Copilot/Devin делают так же)

**Против:**
- Дополнительный слой абстракции
- MCP transport latency (stdio, но это незначительно)

### ADR-2: nocowboy backend вместо отдельных API ключей

**Решение:** Написать Python backend для SkillOpt, который использует
существующих провайдеров NoCowboy вместо отдельных API ключей.

**Почему:**
- Пользователь не должен настраивать API ключи дважды
- Единая конфигурация провайдеров в nocowboy.json
- Поддержка всех моделей (DeepSeek, Qwen, YandexGPT, GigaChat, OpenAI, и т.д.)

**Против:**
- Python backend должен общаться с NoCowboy HTTP API
- Дополнительная точка отказа

### ADR-3: NUTAUSIK как source of truth для harvest

**Решение:** Использовать NUTAUSIK (SQLite) как источник данных для harvest,
а не файлы ~/.claude/.

**Почему:**
- Сессии NoCowboy уже в NUTAUSIK
- Структурированные данные (task, goal, acceptance_criteria)
- Не нужно парсить Markdown транскрипты

**Против:**
- Потеря совместимости с Claude Code транскриптами
- Меньше сырых данных для mine (но более релевантные)

---

## 13. Метрики успеха

### KPI для v0.12.0

| Метрика | Target | Измерение |
|---------|--------|-----------|
| /sleep init успех | 100% | `bun test test/skillopt-init.test.ts` |
| /sleep dry-run цикл | < 30s | Измерение времени выполнения |
| /sleep run + adopt | Работает end-to-end | Ручная проверка |
| Gate rejection вредных edits | 100% | `python3 -m skillopt_sleep.experiments.run_experiment --assert-improves` |
| Backup создаётся | Всегда | После каждого adopt |
| Регрессия существующих тестов | 0 failures | `bun test` |

### Long-term KPI

| Метрика | Target | Измерение |
|---------|--------|-----------|
| Accuracy lift на задачах пользователя | > 10% | A/B тестирование SKILL.md |
| Gate acceptance rate | 30-70% | sleep_status history |
| Пользователей использующих /sleep | > 50% | Telemetry opt-in |
| Среднее время цикла sleep run | < 5 min | Логи |

---

## A. Приложение: Примеры использования

### A.1. Начало работы

```bash
# Установка
pip install skillopt
nocowboy skillopt init

# Проверка
/sleep status
# → SkillOpt-Sleep: ready
# → Last cycle: never
# → Latest proposal: none

# Превью
/sleep dry-run --backend mock
# → Harvested 12 sessions from last 72h
# → Mined 8 recurring tasks
# → Replayed with mock backend (0 API calls)
# → Proposal would edit SKILL.md:
#   - Replace section "Testing" with improved version
#   - Add section "Error Handling"
#   (staged for review — run /sleep run to stage)

# Полный цикл (mock)
/sleep run --backend mock
# → Full cycle complete
# → Proposal staged at .skillopt-sleep/staging/2026-07-17/
# → Run /sleep status to view

# Просмотр
/sleep status
# → 1 proposal staged (2026-07-17 03:17)
# ┌─────────────────────────────────────────────────────┐
# │ skill: testing.md                                    │
# │ ─────────────────────────────────────────────────── │
# │ @@ -12,5 +12,8 @@                                    │
# │  ## Testing                                          │
# │ -Run `bun test` before commit                        │
# │ +Run `bun test` before commit                        │
# │ +Run `bun run typecheck` for type errors             │
# │ +Run `bun run lint` for style issues                 │
# │ +All three must pass before commit                   │
# │                                                      │
# │ ## New: Error Handling                               │
# │ +Always wrap external calls in try/catch             │
# │ +Log errors with context (service, operation, error) │
# └─────────────────────────────────────────────────────┘
# Gate held-out score: 0.42 → 0.67 (+0.25 pts) ✓

# Применение
/sleep adopt
# → Backup: SKILL.md.bak.2026-07-17T03:17:00
# → Applied: SKILL.md updated
# → Reload: skills reloaded
```

### A.2. Автоматический режим

```bash
# Nightly cron в 3:17
/sleep schedule --hour 3 --minute 17

# С auto-adopt (только если gate passed)
/sleep schedule --auto-adopt

# С конкретным проектом
/sleep run --project /path/to/project --scope invoked
```

### A.3. Ручной режим (handoff)

```bash
# Когда API дорогой или нет ключа
/sleep run --backend handoff

# → Engine writes prompts to .skillopt-sleep-handoff/PROMPTS.md
# → You answer each in a fresh context:
#   Answer 1 → .skillopt-sleep-handoff/answers/1.md
#   Answer 2 → .skillopt-sleep-handoff/answers/2.md
# → Re-run: /sleep run --backend handoff
# → Engine resumes with your answers
```

### A.4. Продвинутые опции

```bash
# Кастомизация правил
/sleep run --preferences "Prefer pytest over unittest. Use f-strings. Keep functions pure."

# Ограничение ресурсов
/sleep run --max-sessions 5 --max-tasks 20 --edit-budget 2

# Охват
/sleep run --scope all --lookback-hours 168  # вся неделя

# Разные модели
/sleep run --backend nocowboy --model deepseek-v4-flash
/sleep run --backend nocowboy --model qwen3-72b
```

---

## B. Приложение: Структура файлов

```
.nocowboy/
  mcp.json                          # MCP конфиг, skillopt-sleep сервер
  command/
    sleep.md                        # /sleep команда

packages/opencode/src/nocowboy/
  mcp/
    skillopt-sleep.ts               # MCP сервер интеграция
    skillopt-harvest.ts             # NUTAUSIK → TaskRecord converter
    skillopt-backend/               # nocowboy backend для SkillOpt
      __init__.py
      nocowboy_backend.py
  cli/cmd/
    skillopt-sleep.ts               # CLI хендлер /sleep

~/.skillopt-sleep/
  config.json                       # конфиг engine
  state.json                        # состояние (сколько циклов)
  staging/                          # staged proposals
    <date>/
      proposal.json
      diff.md
      backup/
        SKILL.md.bak.<timestamp>
  tasks/                            # harvested tasks

~/.config/nocowboy/skills/learned/  # эволюционируемый скилл
  SKILL.md                          # ← SkillOpt-Sleep пишет сюда
```

---

## C. Приложение: Интеграция с существующими фичами NoCowboy

### C.1. Auto-dream

Auto-dream (ручное добавление памяти) и SkillOpt-Sleep (автоматический
harvest + gate) — комплементарны:

- **Auto-dream:** `nutausik_memory_add` — конкретные gotcha/pattern сейчас
- **SkillOpt-Sleep:** анализ десятков сессий → bounded edits к SKILL.md

Они не конфликтуют. Auto-dream — это оперативная память. Sleep — это
долговременная эволюция.

### C.2. Distill command

Distill (запланирован) — сканирование сессий → генерация skills/commands.
SkillOpt-Sleep — более мощный аналог с validation gate. Distill может быть
быстрым лёгким вариантом, Sleep — полным циклом.

### C.3. Verification Loop

Verification Loop (check tool + auto-verify) — quality gates на уровне кода.
SkillOpt-Sleep — эволюция инструкций на уровне skill-документа. Они работают
на разных уровнях: Loop — проверяет что код правильный, Sleep — улучшает
как агент пишет код.

---

*Документ создан: 2026-07-17*
*Автор: NoCowboy, звено #3*
*Репозиторий: https://github.com/microsoft/SkillOpt (MIT)*
*Версия на момент анализа: v0.2.0*
