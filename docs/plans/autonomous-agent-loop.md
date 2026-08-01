# План: Автономное выполнение задач — Goal Loop + Agent Teams

> **Дата:** 1 августа 2026
> **Статус:** Proposed
> **Основание:** Claude Code задаёт стандарт — агенты работают без остановки, без участия человека. NoCowboy требует взаимодействия в каждой сессии. Это ключевой архитектурный разрыв.
> **Исследование:** Claude Code `/goal`, Agent Teams, Auto Mode, Stop Hooks, Verification Subagents
> **Цель:** NoCowboy запускает задачу и работает автономно до выполнения acceptance criteria. Пользователь наблюдает, вмешивается по желанию, но не ОБЯЗАН.

---

## 1. Как это работает в Claude Code (архитектурный бенчмарк)

### 1.1 `/goal` — Контур автономности (ядро)

```
Пользователь: /goal all tests in test/auth pass and lint is clean

┌─────────────────────────────────────────────────────────┐
│                    GOAL LOOP                             │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐      │
│  │  Agent   │───▶│ Evaluator│───▶│ Condition    │      │
│  │  Turn    │    │ (Haiku)  │    │ Met?         │      │
│  └──────────┘    └──────────┘    └──┬────────┬──┘      │
│       ▲                             │ YES    │ NO       │
│       │                             ▼        ▼          │
│       │                         ┌──────┐ ┌──────────┐  │
│       │                         │ DONE │ │ NEXT     │  │
│       │                         │      │ │ TURN     │──┤
│       │                         └──────┘ └──────────┘  │
│       │                                     │          │
│       └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

**Ключевые компоненты:**
1. **Evaluator** — отдельная быстрая модель (Haiku), которая после КАЖДОГО turn проверяет условие
2. **Condition** — измеримое условие: тесты проходят, линт чист, файл существует, вывод содержит X
3. **Auto Mode** — классификатор разрешений, авто-одобряет безопасные tool calls внутри turn
4. **Совместимость:** `/goal` + Auto Mode = unattended execution. Без Auto Mode — каждый turn требует подтверждения tool calls.

### 1.2 Agent Teams — Мульти-агентная координация

```
┌──────────────────────────────────────────────────────────┐
│                   AGENT TEAM                             │
│                                                          │
│  ┌──────────────┐                                       │
│  │  Team Lead   │── spawn ──▶ ┌──────────┐  ┌────────┐ │
│  │  (orchestr.) │              │ Teammate │  │Teammate│ │
│  └──────┬───────┘              │  (code)  │  │(review)│ │
│         │                      └────┬─────┘  └───┬────┘ │
│         │                           │             │      │
│    ┌────┴────┐              ┌───────┴─────────────┴───┐ │
│    │  SHARED  │              │     MAILBOX SYSTEM       │ │
│    │  TASKS   │              │  (inter-agent messages)  │ │
│    └─────────┘              └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Ключевые компоненты:**
1. **Shared Task List** — файловая система задач с блокировками (file locking для race conditions)
2. **Mailbox** — JSON-файлы для сообщений между агентами
3. **Team Lead** — оркестратор: создаёт задачи, назначает, синтезирует результаты
4. **Quality Gates** — `TeammateIdle`, `TaskCreated`, `TaskCompleted` hooks
5. **Self-claim** — агенты сами берут следующую невыполненную задачу

### 1.3 Stop Hooks — Детерминированные проверки

```
Agent finishes turn
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Stop Hook    │────▶│ Script/Prompt│
│ fires        │     │ evaluates    │
└──────────────┘     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼              ▼
           PASS          FAIL          BLOCK
         (turn ends)  (continue)   (max 8 blocks,
                                   then force-end)
```

---

## 2. Что у NoCowboy уже есть

| Компонент | Статус | Что делает |
|-----------|--------|------------|
| `auto` агент | ✅ | Оркестратор: архитектор → code → overseer |
| `task` tool | ✅ | Создаёт NUTAUSIK-задачи для под-агентов |
| `verify system` | ✅ | Проверяет AC перед complete_task |
| `plan-followup` | ✅ | Структурированная имплементация плана |
| `compaction` | ✅ | Авто-сжатие контекста |
| Agent Manager (worktrees) | ✅ | Изоляция агентов |
| Permission system (YOLO) | ✅ | Бинарное: всё разрешено или ручной контроль |
| Hooks system | ✅ | PreToolUse, PostToolUse, SessionStart/End |
| NUTAUSIK tasks | ✅ | Задачи с AC, статусами, зависимостями |
| `blocked-tools` | ✅ | Блокировка опасных инструментов |

## Что ОТСУТСТВУЕТ (разрыв с Claude Code)

| Компонент | Что это | Почему критично |
|-----------|---------|-----------------|
| **Goal Loop** | Evaluator model после каждого turn | Без этого — ручной контроль каждого шага |
| **Auto-Permission Classifier** | Классификатор безопасных команд | YOLO — слишком грубо; ручной режим — слишком медленно |
| **Turn-level Stop Hooks** | Блокировка завершения turn | Без этого нельзя гарантировать качество шага |
| **Agent Task Resumption** | Под-агент продолжает работу асинхронно | Task tool синхронный, агенты ждут друг друга |
| **Inter-Agent Mailbox** | Сообщения между агентами | Без этого агенты изолированы, нет координации |
| **Headless Goal Mode** | `nocowboy run --goal "..."` | Нельзя запустить автономно из CLI/CI |

---

## 3. План реализации

### Фаза 1: Goal Loop — Базовый контур автономности 🚨

**Цель:** `nocowboy run --auto "почини все тесты"` работает без участия человека от начала до конца.

**Архитектура:**

```
nocowboy run --goal "all tests pass"

┌─────────────────────────────────────────────────────────┐
│                   GOAL LOOP                             │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Agent   │───▶│ Goal         │───▶│ Condition    │  │
│  │  Turn    │    │ Evaluator    │    │ Met?         │  │
│  │(auto mode)│   │ (flash model)│    │              │  │
│  └──────────┘    └──────────────┘    └──┬────────┬──┘  │
│       ▲                                 │ YES    │ NO   │
│       │                                 ▼        ▼      │
│       │                             ┌──────┐ ┌──────┐  │
│       │                             │ DONE │ │ NEXT │  │
│       │                             │ AC ✓ │ │ TURN │──┤
│       │                             └──────┘ └──────┘  │
│       │                                     │          │
│       └─────────────────────────────────────┘          │
│                                                         │
│  Max turns: configurable (default 20)                   │
│  Emergency stop: Esc, Ctrl+C, SIGTERM                   │
└─────────────────────────────────────────────────────────┘
```

**Что нужно сделать:**

#### 1.1 Goal Evaluator

```
Файл: packages/opencode/src/nocowboy/session/goal-evaluator.ts
```

- **Модель:** `deepseek-v4-flash` (лёгкая, быстрая) — аналог Haiku в Claude
- **Вход:** condition (строка) + transcript последнего turn (сжатый)
- **Выход:** `{ met: boolean, reason: string }`
- **Логика:** промпт вида «Given this condition and what the agent just did, is the condition now met? Answer YES or NO with a brief reason.»
- **Кеширование:** не кешировать — evaluator должен видеть свежий контекст

#### 1.2 Goal Loop Controller

```
Файл: packages/opencode/src/nocowboy/session/goal-loop.ts
```

- Запускает agent turn → evaluator → decision → repeat
- Счётчик turns (макс. 20 по умолчанию)
- Обработка прерываний (Esc → pause, Esc+Esc → stop)
- Индикатор в TUI: `◎ goal: "all tests pass" [turn 5/20]`
- Логирование каждого turn: action, evaluator result, reason

#### 1.3 Auto-Permission Classifier

```
Файл: packages/opencode/src/nocowboy/permission/auto-classifier.ts
```

**Текущая проблема:** YOLO mode разрешает ВСЁ. Это опасно для автономного режима.

**Решение:** трёхуровневая система:

| Уровень | Что разрешено | Примеры |
|---------|--------------|--------|
| **SAFE** (авто-одобрение) | Чтение файлов, grep, glob, запуск тестов/линта, git status/log | `Read`, `Grep`, `Glob`, `Bash(npm test)`, `Bash(git diff)` |
| **CAUTION** (авто-одобрение с аудитом) | Запись в project files, git add/commit, npm install | `Write`, `Edit`, `Bash(git add)`, `Bash(npm install)` |
| **BLOCK** (всегда запрос) | Запись вне project root, rm -rf, force push, curl to unknown hosts | `Bash(rm -rf)`, `Bash(git push --force)` |

**Реализация:**
- Классификатор на базе шаблонов (не LLM — быстро и дёшево)
- Конфигурируемый через `nocowboy.json`: `autoMode.safe`, `autoMode.caution`, `autoMode.block`
- Интеграция с существующей системой `blocked-tools`

#### 1.4 CLI: `--goal` флаг

```
nocowboy run --goal "all tests pass" --max-turns 20
nocowboy run --auto --goal "fix CI failures and commit"
```

- Совместимость с `--auto` флагом (auto mode для permissions)
- `--max-turns N` — лимит итераций
- `--output-format json` для CI/скриптов
- `--verbose` — streaming вывод каждого turn

#### 1.5 TUI Goal UX

- Команда `/goal "all tests pass"` — устанавливает цель
- Индикатор в статус-баре: `◎ goal: "all tests pass" [12/20]`
- `/goal` — показать статус
- `/goal clear` — снять цель
- Esc — пауза (агент останавливается после текущего turn)
- Esc+Esc — полная остановка
- Rewind support — можно откатиться к предыдущему turn

### Фаза 2: Turn-Level Quality Gates ⚡

**Цель:** Каждый turn проходит проверку качества перед тем как считаться завершённым.

#### 2.1 Stop Hooks — блокировка завершения turn

Расширить существующую hooks system:
- `Stop` hook (уже есть в схеме, но не используется для блокировки turn)
- Скрипт возвращает exit code: 0 = pass, 1 = continue (не выполнено), 2 = block (макс 8 блоков)
- Пример: после каждого `Write` — авто-запуск `prettier`

#### 2.2 Built-in Stop Hook: AC Verification

```
Файл: packages/opencode/src/nocowboy/session/ac-verification-hook.ts
```

- После каждого turn: проверяет AC текущей NUTAUSIK-задачи
- Если все AC пройдены → turn ends (успех)
- Если не все → продолжает
- Интеграция с `verify system`

### Фаза 3: Agent Task Resumption — Асинхронные под-агенты ⚡

**Цель:** Агент создаёт под-агента, тот работает автономно, результат приходит в NUTAUSIK.

#### 3.1 Async Task Spawning

```
Файл: packages/opencode/src/nocowboy/session/async-task-spawn.ts
```

- `task` tool получает флаг `async: true`
- Под-агент стартует в отдельной сессии (Agent Manager worktree)
- Статус обновляется в NUTAUSIK
- Родительский агент может продолжать работу параллельно
- Когда под-агент завершает → событие `TaskCompleted` → родитель получает результат

#### 3.2 Task Dependency Chain

```
Architect:   напиши план → [async] code: реализуй → [async] overseer: проверь
                                                           │
              ┌────────────────────────────────────────────┘
              ▼
         NUTAUSIK: задача "implement X" COMPLETED
              │
              ▼
         [auto-trigger] overseer: проверь реализацию
```

- NUTAUSIK-задачи с полем `depends_on: [task_id]`
- При `COMPLETED` родительской задачи → авто-запуск дочерней
- `TaskCompleted` hook

### Фаза 4: Agent Teams — Мульти-агентная координация 🟡

**Цель:** Несколько агентов работают параллельно над разными частями задачи, координируясь через shared task list.

#### 4.1 Shared Task List

```
Файл: packages/opencode/src/nocowboy/agent-teams/task-list.ts
```

- Файловая система: `~/.nocowboy/teams/{team-id}/tasks/{task-id}.json`
- Статусы: `pending`, `claimed`, `in_progress`, `completed`, `failed`
- File locking для race conditions (как в Claude Code)
- Dependencies: task может ждать завершения других

#### 4.2 Inter-Agent Mailbox

```
Файл: packages/opencode/src/nocowboy/agent-teams/mailbox.ts
```

- `~/.nocowboy/teams/{team-id}/inboxes/{agent-id}.json`
- Формат сообщений: `{ from, to, type, content, timestamp }`
- Валидация при чтении (битые записи удаляются)
- SendMessage tool для агентов

#### 4.3 Team Lead

```
Файл: packages/opencode/src/nocowboy/agent-teams/lead.ts
```

- Оркестратор: разбивает задачу, создаёт под-задачи, назначает агентов
- Синтез результатов
- Мониторинг прогресса
- Перераспределение при stuck/failed задачах

---

## 4. Roadmap (порядок реализации)

| Фаза | Компонент | Приоритет | Зависит от |
|------|-----------|-----------|------------|
| **1.1** | Goal Evaluator | 🚨 P0 | — |
| **1.2** | Goal Loop Controller | 🚨 P0 | Goal Evaluator |
| **1.3** | Auto-Permission Classifier | 🚨 P0 | Permission system |
| **1.4** | CLI `--goal` флаг | 🚨 P0 | Goal Loop + Auto-Perm |
| **1.5** | TUI Goal UX | 🚨 P0 | Goal Loop |
| **2.1** | Stop Hooks (turn-level) | ⚡ P1 | Hooks system |
| **2.2** | Built-in AC Verification Hook | ⚡ P1 | Stop Hooks + Verify system |
| **3.1** | Async Task Spawning | ⚡ P1 | Agent Manager + NUTAUSIK |
| **3.2** | Task Dependency Chain | ⚡ P1 | Async Tasks |
| **4.1** | Shared Task List | 🟡 P2 | NUTAUSIK |
| **4.2** | Inter-Agent Mailbox | 🟡 P2 | — |
| **4.3** | Team Lead | 🟡 P2 | Shared Tasks + Mailbox |

---

## 5. Ожидаемый эффект

### До (сейчас)

```
Пользователь: почини все тесты
Agent: [turn 1] анализирую ошибки...
       [ждёт пользователя]
Пользователь: продолжай
Agent: [turn 2] исправляю test_auth.ts...
       [ждёт пользователя]
Пользователь: продолжай
Agent: [turn 3] запускаю тесты...
       3/5 проходят
       [ждёт пользователя]
...
```

### После (с Goal Loop)

```
Пользователь: /goal "all 5 tests pass and lint is clean"
Agent: [turn 1] анализирую ошибки... ✓
       [turn 2] исправляю test_auth.ts... ✓
       [turn 3] тесты: 3/5, чиним test_db.ts... ✓
       [turn 4] тесты: 4/5, чиним test_api.ts... ✓
       [turn 5] тесты: 5/5 ✓ линт: чист ✓
       ◎ goal achieved in 5 turns (3.2 min)
```

### CI (headless)

```bash
$ nocowboy run --goal "all tests pass" --max-turns 10
◎ goal: "all tests pass"
  [1/10] analyzing test failures... 3 tests failing
  [2/10] fixed test_auth.ts
  [3/10] fixed test_db.ts
  [4/10] all tests pass ✓
◎ goal achieved in 4 turns
```

---

## 6. Риски и митигация

| Риск | Митигация |
|------|-----------|
| Goal loop зависает в бесконечном цикле | `--max-turns` (default 20), Esc для остановки |
| Evaluator ошибается (false positive) | Built-in AC verification как второй уровень проверки |
| Auto-permission пропускает опасную команду | Block-лист для известных опасных паттернов, `--dry-run` preview |
| Высокая стоимость токенов (много turns) | Бесплатный evaluator (flash-модель), лимит turns |
| Асинхронные агенты создают конфликты (git) | Agent Manager worktree изоляция уже решает это |

---

## 7. Метрики успеха

- **Автономность:** пользователь ставит `/goal` и не взаимодействует до завершения
- **Надёжность:** <5% false positive evaluator (ошибочно считает задачу выполненной)
- **Производительность:** evaluator добавляет <2s к каждому turn
- **Стоимость:** evaluator стоит <1% от стоимости основного turn (flash модель)
- **CI:** `nocowboy run --goal --max-turns 10` завершается с exit code 0 при успехе
