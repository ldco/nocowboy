# Live run indicator — режим и шаги прогона

> Фича v1.0.7-alpha. Пользовательский гайд: [docs/guides/autopilot.md](../guides/autopilot.md).
> Контекст: [Autopilot — режим, roadmap — цель](autopilot-mode-vs-roadmap-target.md).

## Проблема

Бейдж в промпт-баре показывал только `[AUTOPILOT]` / `[AUTOPILOT ON]`. Из этого
нельзя было понять:

1. **В каком режиме идёт сессия** — roadmap-прогон или своя (custom) цель. Оба
   выглядели одинаково.
2. **На каком шаге мы сейчас** — какой пункт `docs/roadmap.json` выполняется и
   сколько ходов/пунктов осталось.

Последствие: живой roadmap-прогон, который на паузе ожидания ходил по
`GoalService` и ход за ходом инжектил synthetic-продолжения, выглядел как
«обычный режим».

## Решение

Две поверхности, каждая — про своё:

| Поверхность | Что показывает |
|---|---|
| Бейдж в промпт-баре | только **режим** и состояние: `[ROADMAP ▶]` / `[ROADMAP ⏸]` / `[AUTOPILOT ▶]` / `[AUTOPILOT]` |
| Сайдбар, секция **Roadmap** | `done/total`, текущий пункт и **список оставшихся пунктов** чек-листом |

Длинная строка в бейдже (`[ROADMAP ▶ r16 · 13 · 84/146]`) — плохой DX: она
распирает промпт-бар и дублирует то, что должно жить списком. Поэтому детали
уехали в сайдбар.

### Переиспользование нативного Todo-сайдбара

В TUI уже есть секция «Todo» (`feature-plugins/sidebar/todo.tsx`) — список
задач, который обновляется событием `todo.updated`. Оттуда переиспользованы:

- слот `sidebar_content`;
- компонент `TodoItem` (галочки/`•`/отступы);
- паттерн сворачивания длинного списка.

**Данные — свои.** Нативный `Todo` — рабочий список агента (per-session,
статусы `pending`/`in_progress`/`completed`, управляется `todowrite`).
Roadmap — план проекта (`docs/roadmap.json`, статусы `planned`/`in_progress`/
`done`/`blocked`/`abandoned`). Смешивать их нельзя: агент перезаписал бы план
своими подзадачами, а прогон — рабочий список агента. Поэтому секция «Roadmap»
питается из `session.goal`, а не из таблицы `todo`, и живёт рядом с «Todo».

### Поток данных

1. `Autopilot.RoadmapSummary` несёт `done`/`total`; `Autopilot.currentStage` —
   текущий пункт (первый `in_progress`, иначе первый actionable);
   `Autopilot.actionItems` — оставшиеся пункты `{id, status}`.
2. `Event.Goal` расширен опциональными `stage`/`done`/`total`/`items` (старые
   клиенты продолжают декодировать событие).
3. Публикуется: на каждом **bump** прогона (из уже прочитанного summary), в
   командах `/goal`/`/autopilot`/`/roadmap` (helper `publishGoalState` →
   `Autopilot.goalStage`), и в **seed при подключении клиента** (`global.ts`
   читает directory сессии из `SessionTable`) — секция заполнена сразу.
4. `sync.tsx` кладёт state в `sync.data.goal[sessionID]`; плагин
   `sidebar-roadmap.tsx` рендерит секцию, а `runLabel` — бейдж.

## Ключевые файлы

- `packages/opencode/src/nocowboy/components/run-label.ts` — короткий бейдж
  (без TUI-импортов, юнит-тестируется отдельно).
- `packages/opencode/src/nocowboy/plugins/sidebar-roadmap.tsx` — секция
  «Roadmap» в сайдбаре.
- `packages/opencode/src/cli/cmd/tui/plugin/internal.ts` — регистрация плагина.
- `packages/opencode/src/nocowboy/session/autopilot.ts` — `currentStage`,
  `actionItems`, `goalStage`, `done`/`total` в `RoadmapSummary`.
- `packages/opencode/src/nocowboy/session/index.ts` — схема `Event.Goal`.
- `packages/opencode/src/session/prompt.ts` — публикация на bump и в командах.
- `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts` —
  seed при подключении.
- `packages/opencode/src/cli/cmd/tui/context/sync.tsx` — тип goal-состояния.

## Верификация

- `bun test test/nocowboy/run-label.test.ts` — режим/состояние бейджа.
- `bun test test/nocowboy/autopilot.test.ts` — `RoadmapSummary` с `done`/`total`,
  `currentStage`, `actionItems`, `goalStage`.
- `bun test test/session/prompt.test.ts -t autopilot` — continuation и то, что
  `session.goal` несёт `stage`/`done`/`total`/`items`.
- `bun run typecheck` — чисто.

## Что это НЕ решает

Индикатор показывает состояние прогона, но не меняет логику остановки. Прогон
по-прежнему останавливается при `roadmap complete`, исчерпании бюджета или
stall-guard; `continue`/`/autopilot resume` возобновляют его, потому что цель
живёт на диске.
