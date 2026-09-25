# Autopilot — режим, roadmap — цель (разделение кнопки)

> Фича v1.0.6-alpha. Пользовательский гайд: [docs/guides/autopilot.md](../guides/autopilot.md).
> Проектное решение: [ADR-006, Amendment 2](../adr/006-autopilot-continuation.md).

## Проблема

Кнопка `[AUTOPILOT]` смешивала два разных понятия:

1. **Цель** — что надо сделать. Без аргумента `/autopilot` ставил цель «доделать
   весь `docs/roadmap.json`».
2. **Режим** — как это делать (не ждать человека, продолжать на каждом стопе хода).

Из-за слияния:

- имя кнопки лгало — пользователь, который хотел автопилот для своей цели,
  внезапно получал «сделай весь roadmap»;
- тоггл был **разрушительным** — `handleAutopilotCommand("")` звал
  `GoalService.set`, что сбрасывало `condition`, бюджет и `react` в 0. Случайный
  клик (например, mouse-up кнопки «Parent» в футере сабагента, которая стоит там
  же, где бейдж) перезапускал прогон с первого хода.

## Решение

Прогон = **цель** + **режим**. Это две ортогональные оси, а не одна кнопка:

| | Что это | Команда | UI |
|---|---------|---------|-----|
| **Цель** | что сделать | `/roadmap` — весь roadmap; `/goal` — своя цель; `/autopilot <scope>` — своя цель под автопилотом | `[FINISH ROADMAP ▶]` (home) + палитра |
| **Режим** | продолжать без человека | `/autopilot` — армить активную цель; `off`/`pause` — пауза; `toggle` — переключить | `[AUTOPILOT]` / `[AUTOPILOT ON]` (сессия) |

Roadmap-прогон — это просто autopilot-прогон, у которого цель = roadmap. Отсюда
«пересечение»: композиция, а не дублирование.

### Ключевые правила

- **`/roadmap` идемпотентен.** Если roadmap-прогон уже активен — он не
  сбрасывается: `armed` → сообщение «already active»; `paused` → ре-арм с
  сохранением `react`; нет roadmap-цели или явный `--max-turns` → (пере)запуск.
  Так палитра и кнопка безопасны из любого чата.
- **Arm не разрушает.** `/autopilot` без аргумента меняет только `auto` через
  `GoalService.setAuto` — `condition`, `maxTurns`, `react` не трогаются. Пауза и
  повторный арм никогда не перезапускают прогон.
- **Подкоманды — точное совпадение** по `arguments.trim()`, поэтому
  `/autopilot off the flaky test` — это scope «off the flaky test», а не пауза.
- **`$ARGUMENTS` может быть переопределён целью.** Результат `run` несёт
  `arguments`, и `SessionPrompt.command` рендерит шаблон с реальной целью — иначе
  arm-без-аргумента отдал бы кондуктору пустой scope.
- **Headless.** `nocowboy run --autopilot` без сообщения → `/roadmap`; с
  сообщением → `/autopilot <scope>`.

## Ключевые файлы

- `packages/opencode/src/nocowboy/session/prompt.ts` —
  `handleRoadmapCommand`, `handleAutopilotCommand`, `DEFAULT_ROADMAP_SCOPE`.
- `packages/opencode/src/nocowboy/session/goal.ts` — `GoalService.setAuto`.
- `packages/opencode/src/session/prompt.ts` — диспатч `/roadmap`, `commandArguments`.
- `packages/opencode/src/command/index.ts`,
  `packages/opencode/src/nocowboy/autopilot/command.ts` — регистрация `/roadmap`.
- `packages/opencode/src/nocowboy/components/autopilot-button.tsx` —
  `AutopilotButton` (режим), `RoadmapButton` (цель).
- `packages/opencode/src/nocowboy/cli/cmd/run-autopilot.ts`, `cli/cmd/run.ts` —
  headless-маппинг.

## Верификация

- `bun test test/nocowboy/goal-command.test.ts` — идемпотентность `/roadmap`,
  арм/пауза/тоггл `/autopilot`, сохранение цели и бюджета.
- `bun test test/nocowboy/goal-persistence.test.ts` — `setAuto` не трогает
  цель/бюджет/прогресс.
- `bun test test/nocowboy/run-autopilot.test.ts` — headless-маппинг.
- `bun test test/cli/tui/tui-headless.test.ts` — `[FINISH ROADMAP ▶]` рендерится.
- `bun run typecheck` — чисто.
