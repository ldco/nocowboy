# Built-in AC Verification Stop Hook — superseded

Статус: **abandoned (superseded)**, 2026-10-05.

## Исходный замысел

После каждого turn проверять AC текущей NUTAUSIK-задачи: если все AC пройдены —
turn завершается, если нет — продолжается. Интеграция с verify system.
Реализация: `ACVerificationHook.evaluate({ sessionID, agent })`, активный для
агента `goal` и читающий незавершённые задачи из внутреннего `TaskRegistry`.

## Почему закрыто

Замысел никогда не был подключён к реальности:

- `TaskRegistry.create/start/done` не вызываются **нигде** в репозитории — у
  внутреннего дерева задач нет ни одного продюсера, поэтому `list()` всегда
  возвращает `[]`.
- Встроенного агента `goal` не существует (`patchAgents` его не создаёт;
  `run --agent goal` — это псевдо-агент, который резолвится в команду
  `/autopilot`). Значит `evaluate` всегда возвращал `{ continue: false }`.

Обе функции, ради которых пункт существовал, уже работают в другом виде:

- **Блокировка завершения turn** — `stop-hooks-turn-level`: плагинный
  `session.stop`, вернувший `continue: true`, реально блокирует turn (harness
  сохраняет синтетическое `<stop-hook-continue>` и продолжает цикл, кап 8).
- **Гейт «работать, пока AC не выполнены»** — `autopilot-roadmap-runner`:
  детерминированно по `docs/roadmap.json` (нет actionable-пунктов → стоп) плюс
  reviewer-гейт стадии, а не транскрипт-хук.

## Что убрано

- `packages/opencode/src/nocowboy/task/ac-verification-hook.ts`
- `packages/opencode/test/nocowboy/ac-verification-hook.test.ts`
- обвязка в `packages/opencode/src/session/prompt.ts`

Будущая реализация сначала потребует реальной ассоциации
session ↔ NUTAUSIK-задача (сейчас её нет).
