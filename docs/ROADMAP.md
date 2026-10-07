# NoCowboy — Roadmap

> **Только планируемое.** Что уже сделано → [CHANGELOG.md](CHANGELOG.md). Идеи на будущее → [BACKLOG.md](BACKLOG.md).
> **Версионирование:** x.y.z — z только для багфиксов. Роадмап планирует x.y.0.
> **Единственный источник:** `docs/roadmap.json`. `.md` файлы генерируются автоматически.
> **Правило:** DONE-пункт обязан иметь verify-директивы. Если регрессия ломает verify — DONE недействителен.

<!-- AUTO-GENERATED from docs/roadmap.json. Do not edit manually. -->

## v0.11.0 — Quality & Infrastructure — verification loop как DEFAULT behavior

- 🚫 Turso — production SQLite для multi-machine sync
  > Event-sourcing фундамент есть (src/sync/). Turso multi-machine — НЕ РЕАЛИЗОВАН. ADR: Phase 1 blocked.
  > **Блокер:** drizzle-orm/libsql has no subpath — @libsql/client (v0.17.4) установлен, но не может быть интегрирован через Drizzle ORM. Ждём drizzle-orm/libsql export. Подробнее: docs/reference/turso-database-adoption.md
  - src/sync/turso-sync.ts — push/pull sync engine
  - CLI: tausik turso setup/sync/status
  - turso секция в NutausikConfig (url, authToken, syncInterval)
  `verify:file packages/opencode/src/sync/turso-sync.ts`
- ⬜ Deep Context (2M tokens с бюджетированием)
  > checkpoint-validator.ts имеет частичное бюджетирование, но не 2M.
  - Явный бюджет токенов 2M + порог деградации
  - Интеграция с checkpoint-validator
  - Тест на переполнение
- ⬜ MCP Framework — merge plugin-registry в NUTAUSIK
  > P2-C4. Решить судьбу first-party MCP серверов.
  - Реестр first-party MCP серверов
  - Приоритет запуска/дедуп имён
  - Тест launcher precedence
- ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject prompt templates)
  > Было в старом ROADMAP как NOT DONE.
  - Описать prompt templates на стороне NUTAUSIK
  - Прокинуть в MCP get/list
  - Тест неизвестного prompt
- ⬜ Vector store switcher UI
  > Был в старом P2 роадмапе
  - Config→reindex chain без рестарта
  - Безопасная очистка старого backend после rebuild
  - Rollback-тест
- ⬜ Obsidian integration — connect NoCowboy to Obsidian vault via MCP
  > Install obsidian-local-rest-api (2.6k★, MIT) plugin in Obsidian → add MCP entry in nocowboy.json. Plugin already has built-in MCP server at /mpc/. Analysis saved in NUTAUSIK memory #51.
  - MCP-запись в nocowboy.json
  - Коннектор list/read vault
  - Тест изоляции ошибок MCP
- ⬜ Lang switcher — переключатель ru/en в TUI Settings
  > i18n система есть (35 ключей), I18nProvider создан, но lang только в nocowboy.json. Нужно: добавить lang в TuiConfig, кнопку в Settings, переключение на лету.
  - lang в TuiConfig
  - Кнопка Settings → Language
  - Переключение на лету + тест ключей

---

## v0.12.0 — Autonomous Agent Loop + Subagent Reliability — Goal Agent, Agent Teams, subagent watchdog, TUI polish

- ⬜ SkillOpt Integration — Self-Evolving Agent Skills (Microsoft Research)
  > Интеграция Microsoft SkillOpt (v0.2.0, MIT) в NoCowboy. SkillOpt-Sleep: nightly self-evolution агента через harvest NUTAUSIK сессий, bounded edits к SKILL.md, validation gate. MCP сервер (паттерн Copilot/Devin), NUTAUSIK Harvest Bridge, /sleep CLI команда, nocowboy backend. 22 задачи, ~92h, 5 фаз. Полный pipeline: init → dry-run → run → status → adopt → schedule.
  - MCP сервер (TypeScript wrapper вокруг python3 -m skillopt_sleep mcp)
  - NUTAUSIK Harvest Bridge (конвертация nocowboy сессий → TaskRecord JSON)
  - /sleep CLI команда в TUI (status/dry-run/run/adopt/schedule)
  - nocowboy backend для SkillOpt (использует провайдеров NoCowboy вместо API ключей)
  - Post-session hook (автоматический harvest+mine после сессии)
  - Skill Framework Bridge (перезагрузка скиллов после adopt)
  - Benchmark validation (SearchQA, gbrain-evals, deterministic experiment)
  `verify:file docs/features/skillopt-integration.md`

---

## v1.0.0-alpha — Alpha Release — internal testing, all features done, no critical bugs

- 🚫 Manual smoke test — основные сценарии пройдены
  > Проверить: init, /sandbox, /share, /ollama, /forget, roadmap verify
  > **Блокер:** Нужен ручной прогон в терминале; в автономной среде недоступен.
  `verify:agent`

---

## v1.0.0-rc — Release Candidate — user testing, performance, docs complete

- 🚫 Alpha feedback incorporated
  > Все фидбеки от alpha-тестеров обработаны и исправлены
  > **Блокер:** Фидбек alpha-тестеров недоступен.
- 🚫 Пользовательское тестирование — 5+ тестеров
  > 5+ человек прогнали основные сценарии. Баги записаны.
  > **Блокер:** Внешние тестеры не запускались.
  `verify:agent`
- ⬜ Performance testing — startup < 500ms, memory < 200MB
  > Холодный старт: < 500ms. RSS: < 200MB
  - Починить benchmark (RSS/exit code)
  - Пороги 500ms/200MB
  - Fail при отсутствии зависимостей
- 🚫 Все известные issues закрыты или имеют миграционный план
  > **Блокер:** Нет полного инвентаря issues и их закрытия.
- ⬜ Документация обновлена — CHANGELOG, ROADMAP, README
  - generate-docs из JSON
  - --check в pre-commit
  - Убрать ложные roadmap-утверждения
  `verify:file docs/README.md`

---

## v1.0.0 — Production Release — all tests green, npm published, roadmap verified

- 🚫 RC feedback incorporated
  > Все фидбеки от RC-тестеров обработаны
  > **Блокер:** Фидбек beta-тестеров недоступен.
- 🚫 All tests green — 0 failures, 0 flaky
  > **Блокер:** Полный прогон тестов не продемонстрирован как релизный гейт.
  `verify:cmd bun run test 2>&1 | tail -5`
- ⬜ Roadmap verified — 100% DONE features pass verify
  - Убрать | tail без pipefail из verify-roadmap
  - Проверять exit code
  - Полный прогон verify
  `verify:cmd bun run scripts/verify-roadmap.ts`
- 🚫 npm publish — @nocowboy v1.0.0
  > npm publish --tag latest. Binary: nocowboy-linux-x64@1.0.0
  > **Блокер:** Релизные гейты не выполнены.
  `verify:cmd npm view @nocowboy/nocowboy version 2>/dev/null`

---

## v1.1.0 — Engine Isolation & Fork Management — pinned core + selective backport, runtime/port isolation so the engine can be swapped while preserving measurable rights, lifecycle, edit methods and user scenarios (audit: docs/analysis/fork-management-audit-2026-10-05.md)

- ⬜ Deep Context Selection — сигнал затронутых файлов для контекста
  > Отделено от knowledge-graph: сначала проектируется сигнал затронутых файлов, потом интеграция.
  - Сигнал затронутых файлов из git diff
  - Ранжирование соседей через impacted() при наличии графа
  - Fallback: только diff без графа
- ⬜ Knowledge Graph AST engine — tree-sitter символы/call edges + LLM-сводка
  > Долгосрочный бэклог. Требует новый экспорт из @nocowboy/indexing, возвращающий структурные определения (текущий parseSourceCodeDefinitionsForFile отдаёт текстовый блоб), и языковые запросы для CALL edges.
- ⬜ Структурированный Handoff вместо текстового #route
  > `session/router.ts` распознаёт `#route:` в тексте assistant; `session/prompt.ts:1685` запускает следующий loop с agentOverride. Текстовый handoff надо сохранить и формализовать при миграции.
- ⬜ Детерминированный stage machine: design → plan → implement → verify → accept/fix
  > ACVerificationHook проверяет имя агента `goal`, которого patchAgents не создаёт; order-of-magnitude: специализированные роли реализованы, но обязательность цепочки не установлена. Согласуется с in_progress stop-hooks-turn-level и ac-verification-hook.
- ⬜ Versioned facade + contract tests для experimental hooks
- ⬜ @nocowboy/i18n — стабильные ключи, locale context, отказ от phrase fallback
  > phrase lookup опирается на английский literal; в own sidebar остаются Token Usage/Input/Output/Cached, в custom sidebar — [+ New Session]/[ Share ]; environment/task reentry/autopilot/identityAnchor содержат английские строки; `NocowboyAgent.cacheKey` не включает lang; `packages/ui/src/context/i18n.tsx` — отдельная точка локализации.
- ⬜ @nocowboy/ui — виджеты через slots + facade view models
  > Готовая основа — `@nocowboy/plugin/tui` и `slots.register`; но `sidebar-usage` импортирует внутренние `useLocal` и `getUsage`, slots пока не дают полной автономии.
- ⬜ InputPort/UI facade — контракт mouse/focus/selection
  > Обработчики onMouseDown/onMouseUp в app/prompt/sidebar/own buttons используют JSX events и renderer API (прямой зависимости от приватных OpenTUI методов не найдено). Главная связность — расположение handlers внутри крупных upstream-компонентов, порядок mount/propagation, focus и SDK/context types.
- ⬜ Git/Balance — асинхронные сервисы, unknown ≠ 0
  > Git bar синхронно читает `.git/HEAD` и вызывает Git раз в 10 секунд — это polling, не event stream. Balance failure возвращает 0, поэтому zero не доказательство отсутствия средств.
- ⬜ ProviderPort/ProviderAdapters — baseURL/proxy и schema на границе
  > `rejectUnauthorized:false` в own balance fetch — workaround транспорта, не нормальный контракт. Generic AI SDK + custom schemas/loaders + packages/core plugin + gateway.
- ⬜ Семантика стоимости: usage-токены ≠ расчётная стоимость ≠ billing-баланс
- ⬜ Backport: сохранение recent tail при compaction + token budgeting/pruning
- ⬜ Backport: subagent depth limit + resume diagnostics
- ⬜ Backport: терпимость provider config к malformed model entry

---
