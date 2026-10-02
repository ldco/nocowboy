# Autonomous harness hardening — no more blocking without a human

> Фича v1.0.9-alpha. Документация/пайплайн: [docs/README.md](../README.md).

## Проблема

Автономная работа (сабагенты, автопилот, roadmap) упиралась в человека в трёх
местах:

1. **`suggest` и `question` блокировали навсегда.** Оба инструмента паркуются
   на промис, который может разрешить только человек. В сессии, где человека
   нет — сабагент (spawn через `task`) или автопилот/roadmap-прогон — промис не
   разрешается никогда. Родительский агент, ждущий результат `task`, встаёт
   намертво: в UI это выглядит как вечное «~ Suggesting next step...»; в
   roadmap-режиме сабагент, предложивший «review uncommitted changes», замораживает
   весь конвейер до ручного клика.
2. **YOLO не снимал read-only потолки агентов.** `Permission.ask` проверял
   `veto(hardRuleset)` и `rule.action === "deny"` **до** гранта YOLO, а
   `hardPermissions()` возвращает весь ruleset агента для `architect`/`planner`/
   `reviewer`. Их `readOnlyBash` (deny `&&`, `|`, `>`, `git add/commit`,
   `nocowboy *`) переживал YOLO, поэтому read-only агент не мог закоммитить или
   выполнить `nocowboy roadmap generate` и останавливался с просьбой к
   пользователю — даже в yolo-режиме.
3. **Auto был настроен делегировать всё.** Встроенный `auto.txt`/`auto.ru.txt`
   заявлял «ты НЕ делаешь инженерную работу сам», что плодило сабагентов на
   одиночные линейные задачи.

## Решение

### 1. `noHumanReason` — блокирующие инструменты знают, что человека нет

`NoCowboySession.noHumanReason(id)` (`nocowboy/session/index.ts`) возвращает
причину, по которой человек не может ответить:

- `parents.has(id)` — это сабагент-сессия, её никто не смотрит;
- `GoalService.get(id)?.auto` — идёт автономный прогон (autopilot/roadmap).

`suggest` (`nocowboy/suggestion/tool.ts`) и `question` (`tool/question.ts`)
вызывают его первым делом и при наличии причины мгновенно возвращают результат с
инструкцией «не вызывай инструмент и не жди пользователя, продолжай сам», вместо
`Suggestion.show()` / `Question.ask()`. В обычной пользовательской сессии
поведение не меняется.

### 2. YOLO действительно разрешает всё, кроме настоящих инвариантов

`permission/index.ts` переставлен:

- **Абсолютны всегда:** hard-veto для `external_directory` и защита конфигов
  (`ConfigProtection`, edit/чтение `nocowboy.json`, `.nocowboy/`, `AGENTS.md`) —
  даже под YOLO.
- **YOLO читается до** hard-ruleset veto и deny-проверок и снимает политику
  агентов, включая read-only потолки `architect`/`planner`/`reviewer`.
- **Держатся под YOLO:** явные `deny` из верхнеуровневого конфига пользователя
  (`fromConfig(cfg.permission).filter(action === "deny")`).
- **Без YOLO** hard-ceiling по-прежнему сильнее даже сохранённого «always allow»
  (`next.always-rules.test.ts` остаётся зелёным).

### 3. Auto работает сам по умолчанию

`agent/prompt/auto.txt` и `auto.ru.txt` переписаны: «по умолчанию делай работу
сам; `task` — исключение для 2+ реально параллельных потоков или изоляции/другой
модели; один линейный шаг делегировать нельзя». Явный NEVER-список: одна
линейная задача, мелкие правки, вопросы, чтение кода, диагностика, поиск;
«сомневаешься — делай сам».

## Ключевые файлы

- `packages/opencode/src/nocowboy/session/index.ts` — `noHumanReason`.
- `packages/opencode/src/nocowboy/suggestion/tool.ts` — short-circuit.
- `packages/opencode/src/tool/question.ts` — short-circuit.
- `packages/opencode/src/permission/index.ts` — порядок YOLO vs veto/deny.
- `packages/opencode/src/agent/prompt/auto.{txt,ru.txt}` — «работай сам».
- Тесты: `test/nocowboy/suggestion/tool.test.ts`,
  `test/tool/question.test.ts`,
  `test/nocowboy/server/permission-allow-everything.test.ts`.

## Верификация

- `bun run typecheck` — чисто (`tsgo` + `turbo` 9/9 пакетов).
- `bun test test/nocowboy/suggestion/tool.test.ts` — включает тесты
  «does not block in a subagent session» и «does not block in an autonomous
  (autopilot) session».
- `bun test test/tool/question.test.ts` — «does not block in a subagent
  session».
- `bun test test/nocowboy/server/permission-allow-everything.test.ts` — YOLO
  снимает agent/read-only deny, но не снимает config-path protection и
  external-directory hard veto.
- `bun run scripts/verify-roadmap.ts` — grep-директивы подтверждают присутствие
  `noHumanReason`, порядка YOLO и правила «работай сам» в auto-промпте.
