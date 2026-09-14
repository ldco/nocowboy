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
- ⬜ MCP Framework — merge plugin-registry в NUTAUSIK
  > P2-C4. Решить судьбу first-party MCP серверов.
- ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject prompt templates)
  > Было в старом ROADMAP как NOT DONE.
- ⬜ Vector store switcher UI
  > Был в старом P2 роадмапе
- ⬜ NUTAUSIK MCP Prompt Support (dream, memory, context_inject templates)
  > В NUTAUSIK-side, не в NoCowboy
- ⬜ Obsidian integration — connect NoCowboy to Obsidian vault via MCP
  > Install obsidian-local-rest-api (2.6k★, MIT) plugin in Obsidian → add MCP entry in nocowboy.json. Plugin already has built-in MCP server at /mpc/. Analysis saved in NUTAUSIK memory #51.
- ⬜ Lang switcher — переключатель ru/en в TUI Settings
  > i18n система есть (35 ключей), I18nProvider создан, но lang только в nocowboy.json. Нужно: добавить lang в TuiConfig, кнопку в Settings, переключение на лету.

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

## v1.0.0-alpha — Alpha — internal testing

- ⬜ Manual smoke test — основные сценарии пройдены
  > Проверить: init, /sandbox, /share, /ollama, /forget, roadmap verify
  `verify:agent`

---

## v1.0.0-alpha — Alpha Release — internal testing, all features done, no critical bugs

- ⬜ Manual smoke test — основные сценарии пройдены
  > Проверить: init, /sandbox, /share, /ollama, /forget, roadmap verify
  `verify:agent`

---

## v1.0.0-rc — RC — release candidate, user testing

- ⬜ Alpha feedback incorporated
  > Все фидбеки от alpha-тестеров обработаны и исправлены
- ⬜ Пользовательское тестирование — 5+ тестеров
  > 5+ человек прогнали основные сценарии. Баги записаны.
  `verify:agent`
- ⬜ Performance testing — startup < 500ms, memory < 200MB
  > Холодный старт: < 500ms. RSS: < 200MB
- ⬜ Все известные issues закрыты или имеют миграционный план
- ⬜ Документация обновлена — CHANGELOG, ROADMAP, README
  `verify:file docs/README.md`

---

## v1.0.0-rc — Release Candidate — user testing, performance, docs complete

- ⬜ Alpha feedback incorporated
  > Все фидбеки от alpha-тестеров обработаны и исправлены
- ⬜ Пользовательское тестирование — 5+ тестеров
  > 5+ человек прогнали основные сценарии. Баги записаны.
  `verify:agent`
- ⬜ Performance testing — startup < 500ms, memory < 200MB
  > Холодный старт: < 500ms. RSS: < 200MB
- ⬜ Все известные issues закрыты или имеют миграционный план
- ⬜ Документация обновлена — CHANGELOG, ROADMAP, README
  `verify:file docs/README.md`

---

## v1.0.0 — Production release

- ⬜ RC feedback incorporated
  > Все фидбеки от RC-тестеров обработаны
- ⬜ All tests green — 0 failures, 0 flaky
  `verify:cmd bun run test 2>&1 | tail -5`
- ⬜ Roadmap verified — 100% DONE features pass verify
  `verify:cmd bun run scripts/verify-roadmap.ts 2>&1 | tail -3`
- ⬜ npm publish — @nocowboy v1.0.0
  > npm publish --tag latest. Binary: nocowboy-linux-x64@1.0.0
  `verify:cmd npm view @nocowboy/nocowboy version 2>/dev/null`

---

## v1.0.0 — Production Release — all tests green, npm published, roadmap verified

- ⬜ RC feedback incorporated
  > Все фидбеки от RC-тестеров обработаны
- ⬜ All tests green — 0 failures, 0 flaky
  `verify:cmd bun run test 2>&1 | tail -5`
- ⬜ Roadmap verified — 100% DONE features pass verify
  `verify:cmd bun run scripts/verify-roadmap.ts 2>&1 | tail -3`
- ⬜ npm publish — @nocowboy v1.0.0
  > npm publish --tag latest. Binary: nocowboy-linux-x64@1.0.0
  `verify:cmd npm view @nocowboy/nocowboy version 2>/dev/null`

---
