# NoCowboy: Архитектурный анализ — август 2026

> **Дата:** 1 августа 2026
> **Версия:** v0.11.0
> **Форк от:** [Kilo-Org/kilocode](https://github.com/kilo-org/kilocode) (26.7K ★, 3K форков, 26,890 коммитов)
> **Цель:** Оценить текущее состояние, сравнить с оригиналом, выявить сильные и слабые стороны

---

## 1. Масштаб проекта

| Метрика | Значение |
|---------|----------|
| Общий размер репозитория | 818M (node_modules) + ~15M (код) |
| Строк TS/TSX (opencode) | **146,931** |
| Строк в `nocowboy/` | **31,734** (21.6%) |
| Строк в shared opencode | **115,197** (78.4%) |
| Строк тестов | **127,801** |
| Тест-файлов всего | **489** |
| Тест-файлов nocowboy | **239** |
| Нерабочих тестов | **10 из 275** (96.4% pass rate) |
| Коммитов в репозитории | **~350** (оценка) |
| Коммитов впереди origin | **15** |
| Пакетов в монорепо | 12 |
| `nocowboy_change` маркеров | **14** в shared-файлах |
| Shared-файлов с импортом из nocowboy | **20** |

---

## 2. Архитектура верхнего уровня (C4 Level 1 — System Context)

```
┌─────────────────────────────────────────────────────────────┐
│                        NoCowboy TUI                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent       │ │
│  │  architect│  │  auto    │  │  code    │  │  overseer    │ │
│  │ (plan)   │  │ (route)  │  │ (write)  │  │ (review)     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │             │             │                │        │
│       └─────────────┴──────┬──────┴────────────────┘        │
│                            │                                 │
│                    ┌───────┴───────┐                         │
│                    │  LLM Engine   │                         │
│                    │ (Vercel AI)   │                         │
│                    └───────┬───────┘                         │
└────────────────────────────┼────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────┴────┐       ┌──────┴──────┐      ┌─────┴─────┐
    │DeepSeek│       │   NUTAUSIK   │      │  LiteLLM   │
    │  V4     │       │   MCP :9210  │      │  Proxy     │
    │ Pro/Flash│      │  memory/tasks│      │  :8080     │
    └─────────┘       └──────┬──────┘      └─────┬─────┘
                             │                   │
                    ┌────────┴────────┐    ┌─────┴─────┐
                    │  ~/.nutausik/   │    │ 200+ LLM  │
                    │   SQLite +      │    │ providers │
                    │   FTS5 +        │    │ (OpenAI,  │
                    │   vector store   │    │  Bedrock, │
                    └─────────────────┘    │  Vertex…) │
                                           └───────────┘
```

### Ключевые внешние системы

| Система | Роль | Критичность |
|---------|------|-------------|
| **DeepSeek API** (через LiteLLM) | Основной LLM-провайдер | 🔴 Критическая |
| **NUTAUSIK MCP** (порт 9210) | Память, задачи, handoff, coherence | 🔴 Критическая |
| **LiteLLM Proxy** (порт 8080) | Мульти-провайдерный шлюз | 🟡 Важная |
| **OpenRouter** | Альтернативный провайдер | 🟢 Вспомогательная |
| **MoonShot/Kimi** | Резервный провайдер (overseer) | 🟢 Вспомогательная |
| **~/.config/kilo/instructions/** | Глобальные правила (16 файлов) | 🟡 Важная |

---

## 3. Архитектура кодовой базы (C4 Level 2 — Containers)

### 3.1 Монорепо-пакеты

| Пакет | Размер | Роль |
|-------|--------|------|
| `packages/opencode` | 818M | **Ядро** — форк OpenCode + весь NoCowboy-код |
| `packages/core` | 3.9M | Утилиты: Log, Glob, Error, Process, Storage, Fn |
| `packages/sdk` | 2.6M | TypeScript SDK для TUI↔Server коммуникации |
| `packages/ui` | 9.6M | OpenTUI — SolidJS-терминальный UI-фреймворк |
| `packages/llm` | 1.5M | Абстракции LLM |
| `packages/nocowboy-indexing` | 1.9M | Индексация кодовой базы (LanceDB) |
| `packages/nocowboy-gateway` | 252K | Шлюз API |
| `packages/nocowboy-telemetry` | 48K | Телеметрия |
| `packages/nocowboy-vscode` | 240K | VS Code расширение |
| `packages/nocowboy-cli` | 16K | CLI-обёртка |
| `packages/plugin` | 224K | Плагины (GitHub Copilot, xAI, Codex, etc.) |
| `packages/http-recorder` | 20K | HTTP-recorder (VCR-кэш, отключён) |

### 3.2 Структура `packages/opencode/src/` (C4 Level 3 — Components)

#### 3.2.1 Shared OpenCode (115K строк)

```
src/
├── agent/          — Агенты (prompt, info, permission)
├── auth/           — Аутентификация
├── bus/            — Event Bus (публикация/подписка)
├── cli/            — CLI + TUI (SolidJS/OpenTUI)
│   ├── cmd/run/    — Команда run (стриминг сессий)
│   └── cmd/tui/    — Терминальный UI
├── config/         — Конфигурация
├── control-plane/  — Управление workspace
├── effect/         — Effect-TS обёртки (Runtime, InstanceState)
├── file/           — Файловые операции (glob, grep, ripgrep, watcher)
├── git/            — Git-операции
├── lsp/            — Language Server Protocol
├── mcp/            — MCP-клиент
├── provider/       — LLM-провайдеры (transform, models, schema)
├── session/        — Сессии (llm, system, prompt, compaction)
├── server/         — HTTP-сервер (Hono + OpenAPI)
│   └── routes/     — API-роуты
└── tool/           — Инструменты (bash, read, write, edit, etc.)
```

#### 3.2.2 NoCowboy-специфичный код (31.7K строк)

```
src/nocowboy/
├── agent/               — Кастомные агенты (arсhitect, overseer, auto, debug)
│   └── index.ts (483)   — patchAgents() — модификация агентов
├── agent-manager/       — Менеджер агентов (worktree-изоляция)
├── background-process/  — Фоновые процессы (592 строки)
├── cli/                 — NoCowboy CLI (daemon, run-message, profile, distill, setup)
├── commit-message/      — Генерация commit-сообщений
├── components/          — TUI-компоненты (dialog-indexing: 704, model-info, yolo, voice)
├── config/              — Конфигурация NoCowboy (config: 440, overlay, sources)
├── daemon/              — Демон (daemon: 400, client)
├── indexing/            — Индексация кодовой базы (indexing: 509)
├── mcp/                 — MCP: launcher, lifecycle, proxy
├── memory/              — FTS5-память (fts-query, reconcile, schema, paths)
├── permission/          — Расширенная система разрешений
├── plugins/             — TUI-плагины (sidebar, home-onboarding, attention)
├── provider/            — Баланс, модели, фильтры, кеш
├── review/              — Локальное ревью
├── server/              — NoCowboy HTTP API (13 групп + handlers)
│   └── httpapi/groups/  — agent-builder, indexing, telemetry, remote, etc.
├── session/             — Расширенные сессии (compaction, checkpoint, goal, overflow)
├── session-export/      — Экспорт сессий в облако (capture, envelope, worker, zstd)
├── snapshot/            — Снапшоты состояния (track: 612, diff, seed)
├── suggestion/          — Панель подсказок
├── task/                — Задачи (gate, verify, registry, schema)
├── tool/                — Дополнительные инструменты (task, plan, semantic-search, question)
├── tui/                 — TUI-расширения (keybinds, diff, config, app-exit)
└── worktree-*           — Worktree-изоляция (cleanup, family)
```

### 3.3 Fork Isolation Pattern

**Принцип:** минимизировать изменения в shared-файлах, вынося NoCowboy-логику в `src/nocowboy/`.

**Оценка качества изоляции:** 🟢 Отлично

| Метрика | Значение |
|---------|----------|
| `nocowboy_change` маркеров в shared | 14 |
| Shared-файлов с импортом из nocowboy | 20 |
| Строк NoCowboy-кода в shared | <100 (оценка) |

Маркеры сосредоточены в:
- UI (dialog-export-options: 4, session/index: 3, sidebar: 2, home: 1, prompt: 1, permission: 1)
- Server (server.ts: 1)
- Config (config.ts: 1)
- Provider (provider.ts: 2 в nocowboy/)

**Вывод:** форк чистый. При обновлении upstream нужно будет смержить ~14 точечных изменений в 10 shared-файлах.

---

## 4. Что у нас есть (чего нет в оригинале)

### 4.1 NUTAUSIK — Персистентная память между сессиями 🔴 Ключевое

**Файлы:** `nutausik-client.ts`, `nutausik-auto-wire.ts`, весь `session/` (compaction, checkpoint, handoff)

Аналогов в Kilocode нет. NUTAUSIK обеспечивает кросс-сессионную персистентность:

**⚠️ Важно:** NUTAUSIK — это память и контекст МЕЖДУ сессиями, а не автономное выполнение ВНУТРИ сессии. Claude Code умеет запускать агентов, которые работают без остановки и без участия человека. В NoCowboy/Kilocode каждая сессия требует взаимодействия с пользователем. NUTAUSIK НЕ решает проблему автономности — он решает проблему амнезии.

- **Память:** сохранение знаний между сессиями (FTS5 + векторный поиск)
- **Задачи:** создание, отслеживание, верификация acceptance criteria
- **Handoff:** передача контекста от предыдущей сессии к следующей
- **Coherence:** проверка согласованности памяти
- **Auto-wire:** автоматическое создание/закрытие сессий, логирование tool calls
- **Auto-dream:** периодическая консолидация памяти (каждые 7 дней)
- **Distill:** извлечение рабочих процессов из истории

### 4.2 Агенты с русской идентичностью

**Килокод:** code, plan, ask, debug, review (5 агентов, английские промпты)

**NoCowboy:** architect, auto, code, overseer, nocowboy, debug (6 агентов)

| Агент | Модель | Роль | Аналог в Kilo |
|-------|--------|------|---------------|
| `architect` | deepseek-v4-pro | Планирование, спеки, AC | plan |
| `auto` | deepseek-v4-flash | Оркестратор архитектор→code→overseer | ❌ Нет аналога |
| `code` | deepseek-v4-flash | Написание кода | code |
| `overseer` | kimi-k2-thinking | Кросс-модельное ревью | ❌ Нет аналога |
| `debug` | deepseek-v4-flash | Диагностика багов | debug |
| `nocowboy` | deepseek-v4-flash | Полная автоматизация | ask |

Ключевое отличие: агенты имеют русскоязычные промпты, русскую культурную идентичность, и более агрессивную модель поведения (no shortcuts, no workarounds, root cause only).

### 4.3 Система чекпоинтов (Resumable Progress)

**Файлы:** `session/checkpoint*.ts`, `session/compaction*.ts`

Килокод не имеет чекпоинтов. Каждая сессия независима. NoCowboy:
- Сохраняет прогресс задачи между перезапусками
- Компактит контекст при переполнении
- Восстанавливает состояние из предыдущих сессий
- Валидирует чекпоинты на целостность

### 4.4 DeepSeek Cost Optimization

Внедрено за последнюю неделю (коммиты `be0d8f7fe`, `44e6bf8e2`):
- Префикс-кеш стабилизация (статика→динамика)
- Repomap TTL-кеш вместо mtime
- System prompt кеш (5 минут)
- Lazy PM context
- Preflight cost estimation
- Peak pricing индикатор ($2/день vs $10-15 было)

### 4.5 Plan-Followup (Структурированная имплементация)

**Файл:** `plan-followup.ts` (570 строк)

Килокод: агент читает план и имплементирует ad-hoc.

NoCowboy: `#route` парсит план, создаёт NUTAUSIK-задачи, отслеживает прогресс по acceptance criteria, проверяет статус после каждого шага. Системный подход вместо ad-hoc.

### 4.6 Task Gate / Verify System

**Файлы:** `task/gate.ts`, `task/gate-state.ts`

Перед выполнением задачи агент должен пройти через "ворота":
1. Прочитать acceptance criteria
2. Создать план проверки
3. Выполнить проверки (тесты, typecheck, lint)
4. Зафиксировать результаты
5. Только потом `complete_task`

Килокод: агент просто говорит "готово". NoCowboy: требует доказательств.

### 4.7 Семантический поиск

**Файлы:** `tool/semantic-search.ts`

Встроенный `semantic_search` tool с локальными векторными эмбеддингами. Килокод полагается на grep + структурный поиск.

### 4.8 Agent Manager (Worktree Isolation)

**Файлы:** `agent-manager/`, `worktree-family.ts`, `worktree-cleanup.ts`

Каждый агент работает в изолированном git worktree. Нет конфликтов между параллельными задачами. Килокод: всё в одном workspace.

### 4.9 Расширенная система разрешений

**Файлы:** `permission/` (allow-everything, config-paths, drain, external-directory, rule)

Более гранулярная чем в Килокоде: разрешения на внешние директории, YOLO-режим, таймауты разрешений.

### 4.10 Экспорт сессий в облако

**Файлы:** `session-export/` (16 файлов, включая worker)

Полный пайплайн: capture → scrub → zstd → upload → sync. Килокод имеет cloud-режим, но архитектура экспорта — собственная.

### 4.11 TUI-расширения

- Model info panel (информация о модели)
- Balance indicator (цветной индикатор средств)
- Peak pricing (×2 пик / ×1 normal)
- Free model disclosure
- YOLO mode toggle
- Voice input button
- Background process sidebar
- Indexing status
- News/tips компонент
- Score widget

### 4.12 CLI-расширения

- `nocowboy daemon` — фоновый режим
- `nocowboy distill` — извлечение рабочих процессов
- `nocowboy profile` — профилирование
- `nocowboy roll-call` — статус всех сессий
- `nocowboy run-message` — отправка сообщения в работающую сессию
- `nocowboy console` — веб-консоль

---

## 5. Что хуже, чем в оригинале

### 5.1 10 падающих тестов 🔴

265 pass / 10 fail. Типы ошибок:
- Schema drift (SDK не синхронизирован с сервером)
- `KiloClient` не имеет поля `kilo` (неполный мок)
- `Event` union type не включает NoCowboy-события
- Отсутствующие модули (`@opencode-ai/plugin-gitlab-auth`)
- Type errors в провайдерах

**Причина:** NoCowboy-расширения добавляют поля в API, но SDK не регенерируется автоматически. Тесты используют моки без новых полей.

### 5.2 Отсутствие интеграций (по сравнению с Kilo)

| Возможность | Kilo | NoCowboy |
|-------------|------|----------|
| VS Code Extension | ✅ | 🔴 (есть пакет, не основной фокус) |
| JetBrains Plugin | ✅ | 🔴 |
| Cloud Agent | ✅ | 🔴 |
| CLAW (always-on) | ✅ | 🔴 |
| Code Reviews (PR) | ✅ | 🟡 (есть локальное ревью) |
| MCP Marketplace | ✅ | 🔴 |
| Inline Autocomplete | ✅ | 🔴 |

### 5.3 Расхождение с upstream

15 коммитов впереди origin только в этом репозитории. Upstream (kilocode) имеет 26,890 коммитов. Нет автоматического механизма синхронизации. Риск: чем дальше расходимся, тем сложнее мержить.

### 5.4 Раздутие системного промпта

AGENTS.md (107 строк) + 16 instruction-файлов (~1150 строк после оптимизации) = ~1257 строк статического контента в каждом системном промпте. Килокод имеет похожий объём, но английский компактнее русского. Русский текст в среднем на 20-30% длиннее.

### 5.5 Bus factor = 1

Один разработчик (Никита/ldco). Все архитектурные решения, код, документация — в одной голове. При масштабировании это риск.

### 5.6 Effect-TS порог входа

Килокод (и NoCowboy) построен на Effect-TS — функциональной библиотеке с высоким порогом входа. `Effect.gen`, `Layer`, `Context.Service`, `Effect.fn` — паттерны, незнакомые большинству TypeScript-разработчиков. Это замедляет онбординг контрибьюторов.

### 5.7 Отсутствие CI/CD

Нет видимых GitHub Actions, автоматических прогонов тестов, линтеров на PR. Всё делается локально через husky pre-commit хуки.

---

## 6. Анализ качества кода

### 6.1 Fork Isolation: 🟢 Отлично

14 маркеров в shared-файлах — это очень мало для форка с 31K строк кастомного кода. Паттерн изоляции работает.

### 6.2 Тестовое покрытие: 🟡 Среднее

| Компонент | Строк кода | Строк тестов | Соотношение |
|-----------|-----------|-------------|-------------|
| provider (shared) | ~5000 | 4,202 | 0.84 |
| config (shared) | ~3000 | 2,847 | 0.95 |
| session (shared) | ~3000 | 2,584 | 0.86 |
| compaction | ~1000 | 2,150 | 2.15 |
| plan-followup | ~570 | 1,521 | 2.67 |
| agent/index | ~483 | — | 0 (нет тестов) |
| session/index | ~462 | — | 0 (нет тестов) |

Ключевые NoCowboy-модули (`agent/index.ts`, `session/index.ts`, `background-process/index.ts`) не имеют выделенных тестов. Тесты есть в основном для shared-кода.

### 6.3 Дублирование и мёртвый код: 🟡 Есть

- `http-recorder` — VCR-кэш, отключён (`hasCassetteSync() → false`)
- `nocowboy-gateway` — `createNoCowboy() { return { models: [] } }` — заглушка
- `multi-provider.md` — справочный материал, частично дублирует другие инструкции

### 6.4 Самые тяжёлые модули

| Файл | Строк | Проблема |
|------|-------|----------|
| `dialog-indexing.tsx` | 704 | UI-монолит, нуждается в декомпозиции |
| `snapshot/track.ts` | 612 | Сложная логика трекинга |
| `background-process/index.ts` | 592 | Крупный файл без тестов |
| `plan-followup.ts` | 570 | Хорошо протестирован (1521 строка тестов) |
| `indexing.ts` | 509 | Индексация, приемлемый размер |

---

## 7. Долг проекта (по roadmap)

Из `docs/roadmap.json`: ~90 фич, многие в статусе `planned`.

### Ключевой незавершённый функционал

| Фича | Статус | Важность |
|------|--------|----------|
| Fork from kilocode | done | — |
| Компилируемый бинарник | planned | HIGH |
| Repomap | in_progress | HIGH |
| Memory FTS5 | in_progress | HIGH |
| Goal Judge | planned | HIGH |
| Deep Context (2M токенов) | planned | HIGH |
| Indexing | planned | MEDIUM |
| Агенты 15→5 | done | — |
| NUTAUSIK Phase 1 | done | — |
| Token Cost Optimization | done | — |
| Memory Migration (MEMORY.md → NUTAUSIK) | done | — |
| Auto-dream | in_progress | MEDIUM |
| DeepSeek Prefix Cache | done | — |
| Verify System | in_progress | HIGH |
| Agent Audit | planned | MEDIUM |
| Self-Being (мета-когнитивная архитектура) | planned | HIGH |
| Publish NPM (@nocowboy) | in_progress | HIGH |
| Нулевой конфиг-визард | planned | HIGH |
| 152-ФЗ compliance | done | — |
| Alpha Release | planned | CRITICAL |

---

## 8. Архитектурные риски

| Риск | Вероятность | Влияние | Митигация |
|------|------------|--------|-----------|
| Расхождение с upstream kilocode | 🟡 Средняя | 🔴 Высокое | Автоматический sync скрипт, регулярные мержи |
| NUTAUSIK — единая точка отказа | 🟡 Средняя | 🔴 Высокое | Локальный fallback без MCP |
| DeepSeek стоимость растёт | 🟢 Низкая (после фиксов) | 🟡 Среднее | Multi-provider, Kimi fallback уже есть |
| Bus factor = 1 | 🔴 Высокая | 🔴 Высокое | Документация, архитектурные решения, онбординг |
| Effect-TS migration/upgrade | 🟡 Средняя | 🟡 Среднее | Версионирование зависимостей |
| Schema drift SDK↔Server | 🟡 Средняя | 🟡 Среднее | Авто-регенерация SDK в CI |

---

## 9. Сравнительная матрица: NoCowboy vs Kilocode

| Критерий | Kilocode | NoCowboy | Оценка |
|----------|----------|----------|--------|
| **Агенты** | 5 базовых | 6 (с русскими промптами + auto-router) | 🟢 Лучше |
| **Память между сессиями** | Нет | NUTAUSIK (FTS5 + vector) | 🟢 Уникально |
| **Автономное выполнение** | ✅ (Claude Code — задача запускается, агенты сами делают без остановки) | 🔴 Требует участия человека | 🔴 Хуже |
| **Структурированная имплементация** | Ad-hoc | Plan-followup + task gate | 🟢 Уникально |
| **Контроль качества** | Базовый | Verify system + AC checking | 🟢 Уникально |
| **Worktree изоляция** | Нет | Agent Manager | 🟢 Уникально |
| **Стоимость LLM** | Не контролируется | Cost estimation + peak pricing + prefix cache | 🟢 Уникально |
| **Русский язык** | Перевод readme | Родной язык агентов, промптов, документации | 🟢 Уникально |
| **VS Code** | ✅ | 🔴 | 🔴 Хуже |
| **JetBrains** | ✅ | 🔴 | 🔴 Хуже |
| **Cloud Agent** | ✅ | 🔴 | 🔴 Хуже |
| **MCP Marketplace** | ✅ | 🔴 | 🔴 Хуже |
| **Автодополнение** | ✅ Inline | 🔴 | 🔴 Хуже |
| **CI/CD** | ✅ GitHub Actions | 🔴 Только husky | 🔴 Хуже |
| **Сообщество** | 26.7K ★ | 1 разработчик | 🔴 Хуже |
| **Стабильность** | Стабильный релиз | v0.11.0, 10 failing tests | 🟡 Средне |
| **Документация** | Обширная (EN) | Средняя (RU) | 🟡 Средне |
| **Fork isolation** | — | 14 маркеров — отлично | 🟢 Отлично |

---

## 10. Рекомендации

### Критические (сейчас)
1. **Починить 10 падающих тестов** — schema drift + неполные моки
2. **Написать тесты для agent/index.ts** (483 строки, 0 тестов)
3. **Написать тесты для session/index.ts** (462 строки, 0 тестов)

### Важные (эта неделя)
4. **Автоматизировать регенерацию SDK** после изменений API
5. **Создать sync-скрипт** для мержа апстрим-изменений из kilocode
6. **Декомпозировать dialog-indexing.tsx** (704 строки UI)

### Стратегические
7. **Снизить bus factor** — задокументировать архитектурные решения в ADR
8. **Настроить CI** (хотя бы typecheck + test на push)
9. **Решить, нужны ли VS Code / JetBrains** или фокус на TUI
10. **План выхода из v0.x** — Alpha → Beta → RC → Release pipeline

---

## 11. Вывод

**NoCowboy — не просто форк.** Это самостоятельный продукт с уникальной идентичностью, архитектурой памяти (NUTAUSIK), русскоязычными агентами, и системой контроля качества. 31.7K строк собственного кода при 14 точках интеграции с форком — признак зрелой архитектуры форка.

**Ключевое преимущество:** NUTAUSIK-память решает проблему амнезии между сессиями — агент помнит контекст предыдущих задач, паттерны, ошибки. Этого нет в Kilocode.

**Ключевой недостаток:** отсутствие автономного выполнения. Claude Code может запустить задачу, и агенты сами работают без остановки, переключаясь между собой. NoCowboy требует участия человека в каждой сессии. Это архитектурный разрыв, который NUTAUSIK не закрывает — он решает другую проблему (память), а не эту (автономность).

**Ключевой риск:** расхождение с upstream и bus factor. При масштабировании beyond одного разработчика потребуется команда и процесс синхронизации.

**Текущая фаза:** v0.11.0, pre-alpha. Продукт работает, но ещё не готов к широкому распространению. 10 падающих тестов — главный блокер перед alpha-релизом.
