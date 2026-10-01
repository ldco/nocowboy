# Reviewer no longer receives planner boilerplate

> Фича v1.0.8-alpha. Документация/пайплайн: [docs/README.md](../README.md).

## Проблема

В review-режиме агент `reviewer` получал в промпт планировочный boilerplate —
`<system-reminder>` с заголовком `## Plan File` и инструкциями «пиши план,
вызови `plan_exit`». Ревьюер не планирует: он верифицирует результат работы
worker. Boilerplate путал модель и подталкивал её к неправильным действиям.

Причина — две ошибки в классификации агента:

1. **`planning()` включала reviewer.** В
   `packages/opencode/src/nocowboy/session/prompt.ts` предикат
   `planning()` возвращал `true` для трёх агентов — `architect`, `planner`
   **и `reviewer`**. Из-за этого `insertPlanReminders()` вставлял plan-file /
   `plan_exit` boilerplate в промпт любого из них.
2. **reviewer имел планировочные permissions.** В
   `packages/opencode/src/nocowboy/agent/index.ts` у reviewer стояли
   `plan_enter: "allow"` и `plan_exit: "allow"` — инструменты, которые нужны
   только стадии планирования, а не верификации.

## Решение

Разведены два набора, которые раньше смешивались:

- `modes = ["architect", "planner", "reviewer"]` — **read-only** агенты для
  merge permissions (`guardPermissions` / `hardPermissions`). Reviewer
  остаётся в этом наборе.
- `planning()` — **plan-like** агенты, которым вставляется plan-file
  boilerplate. Reviewer из этого набора **исключён**: теперь возвращает
  `true` только для `architect` и `planner`.

Плюс у reviewer убраны `plan_enter` и `plan_exit` из permissions.

## Ключевые файлы

- `packages/opencode/src/nocowboy/session/prompt.ts` — `planning()` больше не
  включает reviewer.
- `packages/opencode/src/nocowboy/agent/index.ts` — reviewer без
  `plan_enter`/`plan_exit`.
- `packages/opencode/test/nocowboy/plan-exit-detection.test.ts` —
  regression-тест «reviewer is NOT a planning agent».

## Верификация

- `bun run typecheck` — чисто.
- `bun test test/nocowboy/plan-exit-detection.test.ts` — тест подтверждает,
  что для `agent: { name: "reviewer" }` в промпт **не** попадают строки
  `Plan File`, `plan_exit`, `main plan file`.
- `bun run scripts/verify-roadmap.ts` — grep-директивы проверяют, что
  `planning()` матчит только `architect`/`planner` и что в файле есть
  поясняющий комментарий.
