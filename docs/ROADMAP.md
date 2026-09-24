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
- ⬜ Turn-level Stop Hooks — блокировка завершения turn до проверки
  > Unmarked 2026-09-24: the plugin `session.stop` hook and the stopHookContinues cap exist, but the turn is NOT actually blocked — the counters are only logged and never used to continue the turn. The continuation that keeps a run going ships under `autopilot-roadmap-runner` (goal.auto + session/prompt.ts synthetic injection).
  `verify:file docs/features/stop-hooks-turn-level.md`
- ⬜ Built-in AC Verification Stop Hook
  > Unmarked 2026-09-24: ACVerificationHook is unreachable — it returns early unless agent === "goal", and no agent named `goal` is registered. The autopilot goal (goal.auto) now provides the continuation it was meant to drive. See `autopilot-roadmap-runner`.
  `verify:file docs/features/ac-verification-hook.md`
- ⬜ Goal Agent — автономный агент в TUI (выбор через Ctrl+B, /agent goal)
  > Unmarked 2026-09-24: no agent named `goal` is registered (agents are auto/planner/worker/reviewer/nocowboy + native). The intent is delivered by `/autopilot` (built-in conductor command running under `auto`) plus the harness auto-continue, not as a separate TUI agent. See `autopilot-roadmap-runner` and ADR-006.
  `verify:file docs/features/goal-agent.md`
- ⬜ Goal Headless — CLI режим для CI/CD: nocowboy run --agent goal '...'
  > Unmarked 2026-09-24: `--max-turns` is declared in cli/cmd/run.ts but never read, and `--agent goal` fails because no such agent exists. Headless autopilot is not wired. See `autopilot-roadmap-runner`.
  `verify:file docs/features/goal-headless.md`

---

## v1.0.0-alpha — Alpha Release — internal testing, all features done, no critical bugs

- ⬜ Manual smoke test — основные сценарии пройдены
  > Проверить: init, /sandbox, /share, /ollama, /forget, roadmap verify
  `verify:agent`

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
