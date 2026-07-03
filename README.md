# NoCowboy

![NoCowboy](logo.svg)

**ИИ под твоим контролем.** Терминальный AI-агент для разработки. Создан для российского рынка — без привязки к западным сервисам, без санкционных ограничений, без вендор-лока.

---

## Почему NoCowboy

В 2022–2026 годах 1.7 миллиона российских разработчиков оказались отрезаны от западных AI-инструментов. Санкции, блокировки платежей, geo-restrictions, отзыв API-ключей — GitHub Copilot, Cursor, Claude Code, ChatGPT стали недоступны. Западные AI-агенты привязаны к OpenAI/Anthropic, требуют западные платёжные системы и игнорируют российскую правовую реальность (152-ФЗ, требования РКН, локализация данных).

NoCowboy создан чтобы это исправить.

## Что NoCowboy решает

### Общие боли разработчика

| Боль | Как решает NoCowboy |
|------|---------------------|
| **Медленный старт** | Один скомпилированный бинарник, 227 MB, мгновенно — не нужен Node.js, не нужен Docker |
| **Переключение между сервисами** | Один TUI для всего: агенты, MCP-серверы, код, планы, отладка |
| **Качество AI-кода** | 5 специализированных агентов + overseer для строгого review + Constitution AST-проверка |
| **Потеря контекста** | FTS5-память сохраняет паттерны, баги и решения между сессиями |
| **Привязка к одному провайдеру** | 200+ моделей через LiteLLM — DeepSeek, Kimi, Mistral, GLM, любые open-source |
| **Зоопарк плагинов** | Встроенные MCP-серверы (Constitution, Git, Puppeteer, SQLite) — запускаются автоматически |

### Специфические боли разработчика из РФ

| Боль | Как решает NoCowboy |
|------|---------------------|
| **Санкции и блокировки** | Никаких зависимостей от OpenAI, Anthropic, GitHub, Stripe. Китайские и российские модели из коробки |
| **Платёжные ограничения** | Бесплатно. Open source. Не нужен API-ключ западных сервисов |
| **152-ФЗ и РКН** | Встроенный справочник IT-права РФ (скилл `russian-it-law`). Compliance из коробки |
| **Английский AI** | Русские системные промпты, русские инструкции, русский TUI |
| **Локальные модели** | Поддержка Ollama, GigaChat, YandexGPT — запускай полностью офлайн |
| **Независимость** | Self-hosting: NoCowboy разрабатывает сам себя. Никаких внешних зависимостей |

---

## Быстрый старт

NoCowboy пока не опубликован в npm. Сборка из исходников:

```bash
bun install --cwd packages/opencode build --single
cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy ~/.local/bin/nocowboy
```

Первый запуск:

```bash
nocowboy init          # мастер настройки (2 вопроса)
nocowboy mcp start     # запуск MCP-серверов
nocowboy               # старт TUI
```

Конфигурация: `~/.config/nocowboy/nocowboy.jsonc`

---

## Агенты

NoCowboy использует 5 специализированных агентов вместо зоопарка из 15 (как было в форке Kilo Code):

| Агент | Роль | Модель |
|-------|------|--------|
| **code** | Пишет код | Flash (быстрая) |
| **architect** | Планирует архитектуру, ADR, C4 | Pro (глубокая) |
| **debug** | Системная отладка | Flash |
| **overseer** | Ревьюир и оркестратор. Traycer-like: передаёт задачу code и проверяет результат **другой моделью** | Kimi K2 / Pro |
| **nocowboy** | Автоматизация всего: браузер, файлы, система | Flash |

Агенты делегируют работу друг другу через `task()`. Например: overseer → code → overseer (review) → готово.

---

## Стек

**TypeScript + SolidJS + OpenTUI + Yoga flexbox + Bun runtime.**

Скомпилирован в один бинарный файл — не нужен Node.js, не нужен Docker.

```
packaging/
├── mcp-servers/       # 8 собственных MCP-серверов
└── config/            # nocowboy.json, агенты, инструкции, скиллы

packages/
├── opencode/          # CLI: TUI, агенты, инструменты, MCP, сервер
├── core/              # Модели данных
├── plugin/            # Интерфейс плагинов
├── sdk/js/            # TypeScript SDK
└── nocowboy-indexing/ # Индексация кодовой базы
```

---

## Статус проекта

**v0.7.3** 🐕 — 2026-07-02 (первый dogfooding-релиз: NoCowboy разрабатывает сам себя)
**v0.7.4** — 2026-07-03 (текущая: 15→5 агентов, tool groups, delegation briefs)

См. [CHANGELOG.md](docs/CHANGELOG.md) и [ROADMAP.md](docs/ROADMAP.md).

---

## Разработка

```bash
bun install
bun run --cwd packages/opencode dev       # TUI с авто-перезапуском
bun run --cwd packages/opencode typecheck
bun test --cwd packages/opencode test/nocowboy/
```

Релизный бинарник:

```bash
bun run --cwd packages/opencode build --single
# бинарник: packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy
```

См. [docs/dogfooding-workflow.md](docs/dogfooding-workflow.md).

---

## Лицензия

Проприетарная. Право Российской Федерации. Условия лицензии разрабатываются — см. P3-L1 в [ROADMAP.md](docs/ROADMAP.md).
