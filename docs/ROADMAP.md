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
- 🚫 Vector store switcher UI
  > BLOCKED (2026-10-07 autopilot). Требуется live-верификация + архитектурное изменение; prior attempt (dump 2026-10-06) был реализован и затем ОТКАЧЕН как небезопасный. Что нужно: (1) цепочка конфиг→переиндексация без рестарта (KiloIndexing.reload/onConfigUpdated + чистый детектор indexing-config-key + подписка на global.config.updated), корректность которой наблюдаема только на запущенном индексаторе; (2) БЕЗОПАСНАЯ очистка старого индекса: KiloIndexing.init() резолвится на track() до реальной сборки, а кэш держит один manager на ключ `${directory}\0${root}` — поэтому наивный clearIndexData после reload попадёт в НОВЫЙ manager (нарушает инвариант спеки №2 «старый индекс не удаляется до успешного построения нового»). Корректный дизайн требует захваченного дескриптора СТАРОГО стора (backend+identity) и удаления по нему, затем live end-to-end проверки. Риск потери данных при неверной проводке. Spec: .nocowboy/specs/vector-store-switcher.md.
  - Config→reindex chain без рестарта
  - Безопасная очистка старого backend после rebuild
  - Rollback-тест
- 🚫 Obsidian integration — connect NoCowboy to Obsidian vault via MCP
  > BLOCKED (2026-10-07 autopilot). Требуется manual/live Obsidian. Интеграция = установить плагин obsidian-local-rest-api (MIT, built-in MCP server) и добавить MCP-запись в nocowboy.json (анализ — NUTAUSIK memory #51). Репозиторного кода нет (audit 2026-10-06: 'planned — no code'). AC1 явно 'ручная проверка MCP' — без запущенного Obsidian vault + плагина неверифицируемо. AC2 (ошибка коннектора не блокирует остальные MCP) — свойство MCP fault-isolation (per-client catch в src/mcp/index.ts), отдельного теста нет. Что нужно: живой Obsidian + плагин для AC1; при желании — тест MCP-isolation для AC2.
  - MCP-запись в nocowboy.json
  - Коннектор list/read vault
  - Тест изоляции ошибок MCP

---

## v0.12.0 — Autonomous Agent Loop + Subagent Reliability — Goal Agent, Agent Teams, subagent watchdog, TUI polish

- 🚫 SkillOpt Integration — Self-Evolving Agent Skills (Microsoft Research)
  > Интеграция Microsoft SkillOpt (v0.2.0, MIT) в NoCowboy. SkillOpt-Sleep: nightly self-evolution агента через harvest NUTAUSIK сессий, bounded edits к SKILL.md, validation gate. MCP сервер (паттерн Copilot/Devin), NUTAUSIK Harvest Bridge, /sleep CLI команда, nocowboy backend. 22 задачи, ~92h, 5 фаз. Полный pipeline: init → dry-run → run → status → adopt → schedule. BLOCKED (2026-10-07 autopilot): требуется ВНЕШНИЙ пакет Microsoft SkillOpt (v0.2.0) — отсутствует в репозитории/окружении; AC3 verify = 'ручная проверка'; AC4 требует внешнего раннера `python3 -m skillopt_sleep.experiments.run_experiment`. Mock-only pipeline без реального SkillOpt был бы не интеграцией. Что нужно: установленный/доступный SkillOpt-Sleep toolchain + человеческая валидация gate. Audit 2026-10-06: 'external package absent'; dump тоже держал его blocked.
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

- ⬜ Versioned facade + contract tests для experimental hooks
- ⬜ @nocowboy/ui — виджеты через slots + facade view models
  > Готовая основа — `@nocowboy/plugin/tui` и `slots.register`; но `sidebar-usage` импортирует внутренние `useLocal` и `getUsage`, slots пока не дают полной автономии.
- ⬜ InputPort/UI facade — контракт mouse/focus/selection
  > Обработчики onMouseDown/onMouseUp в app/prompt/sidebar/own buttons используют JSX events и renderer API (прямой зависимости от приватных OpenTUI методов не найдено). Главная связность — расположение handlers внутри крупных upstream-компонентов, порядок mount/propagation, focus и SDK/context types.
- ⬜ Git/Balance — асинхронные сервисы, unknown ≠ 0
  > Git bar синхронно читает `.git/HEAD` и вызывает Git раз в 10 секунд — это polling, не event stream. Balance failure возвращает 0, поэтому zero не доказательство отсутствия средств.
- ⬜ Backport: subagent depth limit + resume diagnostics
- ⬜ Backport: терпимость provider config к malformed model entry
- ⬜ LLM-сводка архитектуры по AST-графу
  > Вынесено из knowledge-graph-ast-engine (2026-10-07): в описании была LLM-сводка, но AC её не требовали. Отслеживается отдельно, статус ast-engine не обещает её.

---
