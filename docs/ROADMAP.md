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
- 🚫 Deep Context — отбор содержимого и учёт cache-read
  > Вынесено из deep-context-2m (там реализовано ядро бюджетирования). Источник: .nocowboy/specs/deep-context-2m.md, дизайн-пункты 3–5 и открытые вопросы. Помечено blocked 2026-10-06 после оценки: ядро (отбор) не имеет ни сигнала, ни потребителя.
  > **Блокер:** Нет acceptance_criteria; центральный дизайн-пункт (отбор содержимого: repomap → затронутые файлы → память, полный текст только для трогаемых файлов) требует сигнала «затронутые файлы», которого нет в точке сборки системного промпта (nocowboy/system-prompt.ts environment() не имеет доступа к сообщениям сессии) и нет потребителя. Открытые вопросы спеки (auto-выбор профиля по размеру задачи, вес cache-read в бюджете) не решены. Реализуемы лишь под-пункты (учёт стоимости cache-read в сайдбаре, auto-профиль) — их недостаточно для закрытия пункта как целого.
- 🚫 Vector store switcher UI
  > Spec: .nocowboy/specs/vector-store-switcher.md. ЧАСТИЧНО + BLOCKED (2026-10-06). Сделано+протестировано: AC3 availability-гейт checkVectorStore (qdrant без URL не сохраняется, ошибка видна) + unit-тест; AC2 предупреждение chooseRebuildAction «сейчас/позже/отмена» (отмена не пишет конфиг); AC5 rollback-логика rollbackTarget/watchRollback/applyWithRollback + watchBackend (состояние статуса — «Complete»); AC4 КОРНЕВОЙ ФИКС — цепочка конфиг→переиндексация (KiloIndexing.reload/onConfigUpdated + чистый детектор indexing-config-key.ts + подписка bootstrap на global.config.updated через GlobalBus с Instance.bind), тест 4/6 pass. НЕ ВЫПОЛНЕНО: AC6 — удаление данных СТАРОГО бэкенда после успешной сборки. Попытка реализации ОТКАЧЕНА: независимая read-only верификация (architect) показала, что (1) reload() не может дождаться завершения новой сборки — KiloIndexing.init() резолвится на track() ДО engine.init, поэтому «чистить после успеха» на деле чистит раньше (нарушение инварианта спеки №2), и (2) воркер держит один manager на ключ `${directory}\0${root}`, поэтому clearIndexData после reload попадёт в НОВЫЙ manager и удалит новый индекс (риск потери данных). Чтобы закрыть AC6 нужен отдельный дескриптор старого стора (clear по конфигу старого бэкенда) + live-прогон. AC4/AC5 подтверждены только на уровне логики/unit-тестов; end-to-end требует запущенного индексатора. Оговорка AC2: «сейчас» и «позже» обе сохраняют конфиг (жёсткое требование AC — только «отмена не пишет»).
  > **Блокер:** AC6 (удаление старого индекса после успешной перестройки) требует: (a) дождаться фактического завершения новой сборки (KiloIndexing.init резолвится раньше engine.init), (b) отдельного дескриптора СТАРОГО стора для clearIndexData — общий manager на ключ воркера делает очистку после reload неотличимой от очистки нового индекса. Плюс live-прогон индексатора для подтверждения AC4/AC5/AC6.
- 🚫 Obsidian integration — connect NoCowboy to Obsidian vault via MCP
  > BLOCKED 2026-10-06: requires installing the obsidian-local-rest-api plugin INSIDE the Obsidian desktop app (external app + user action) and a running vault — not doable autonomously. Needs: the user installs the plugin in Obsidian, then a nocowboy.json MCP entry. Analysis: NUTAUSIK memory #51.

---

## v0.12.0 — Autonomous Agent Loop + Subagent Reliability — Goal Agent, Agent Teams, subagent watchdog, TUI polish

- 🚫 SkillOpt Integration — Self-Evolving Agent Skills (Microsoft Research)
  > Интеграция Microsoft SkillOpt (v0.2.0, MIT) в NoCowboy. SkillOpt-Sleep: nightly self-evolution агента через harvest NUTAUSIK сессий, bounded edits к SKILL.md, validation gate. MCP сервер (паттерн Copilot/Devin), NUTAUSIK Harvest Bridge, /sleep CLI команда, nocowboy backend. 22 задачи, ~92h, 5 фаз. Полный pipeline: init → dry-run → run → status → adopt → schedule.
  > **Блокер:** Требуется внешний пакет Microsoft SkillOpt (v0.2.0, MIT) + Python-backend: критичные AC проверяются через `python3 -m skillopt_sleep.experiments.run_experiment --assert-improves` и ручной `/sleep run --backend nocowboy`. Проверено 2026-10-06: в репозитории нет ни одного упоминания skillopt (grep по packages → пусто), `python3 -c 'import skillopt_sleep'` падает (модуль не установлен). Фича ~92h / 22 задачи / 5 фаз — неавтономна в этой среде.
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
  > BLOCKED 2026-10-06: a manual human smoke test (init, /sandbox, /share, /ollama, /forget, roadmap verify) — needs a person at a terminal with the release build; not autonomously verifiable.
  `verify:agent`

---

## v1.0.0-rc — Release Candidate — user testing, performance, docs complete

- 🚫 Alpha feedback incorporated
  > BLOCKED 2026-10-06: depends on real alpha-tester feedback, which requires rc-user-testing-complete (human testers) — not autonomous.
- 🚫 Пользовательское тестирование — 5+ тестеров
  > BLOCKED 2026-10-06: needs 5+ human testers to run the main scenarios and record bugs — external human access, not autonomous.
  `verify:agent`
- 🚫 Все известные issues закрыты или имеют миграционный план
  > BLOCKED 2026-10-06: gated on rc-user-testing-complete (human testers) — not autonomous.

---

## v1.0.0 — Production Release — all tests green, npm published, roadmap verified

- 🚫 RC feedback incorporated
  > BLOCKED 2026-10-06: needs real RC-tester feedback (human testers) — external, not autonomous.
- 🚫 All tests green — 0 failures, 0 flaky
  > BLOCKED 2026-10-06. Полный прогон (`cd packages/opencode && bun run script/test-runner.ts`): 541 files | 541 passed | 0 failed | 1 FLAKY (`nocowboy/indexing-startup.test.ts` прошёл на ретрае); в другом прогоне падал `server/httpapi-mdns.test.ts` (таймаут остановки листенера). Гейт требует 0 flaky. Частичный фикс уже внесён: `wait()/called()` теперь time-based (WAIT_TIMEOUT_MS=30s), а `afterEach` диспозит инстансы ДО сброса `IndexingWorker.override()` (раньше in-flight init подхватывал реальный воркер → настоящий CodeIndexManager коннектился к 127.0.0.1:1, вешал disposal на ~10s и утекал предупреждением). После фикса файл 6/6 напрямую и 4/4 при 4 параллельных копиях, но под полной нагрузкой runner'а всё ещё изредка флейкает. Оставшиеся корни (для полного де-flake): (1) дефолтный beforeEach-override конструирует реальный CodeIndexManager — убрать в лёгкий stub; (2) dispose×2; (3) утечка реального qdrant-предупреждения в тест retains-and-deduplicates; (4) mdns stop>10s под нагрузкой. Также сам verify полного набора (~6 мин) не влезает в 120s-таймаут cmd-директивы. См. docs/features/release-all-tests-green.md.
  `verify:file docs/features/release-all-tests-green.md`
- 🚫 npm publish — @nocowboy v1.0.0
  > BLOCKED 2026-10-06: requires npm registry credentials + the @nocowboy org and a built/published binary (nocowboy-linux-x64@1.0.0) — external publish access, not autonomous.
  `verify:cmd npm view @nocowboy/nocowboy version 2>/dev/null`

---
