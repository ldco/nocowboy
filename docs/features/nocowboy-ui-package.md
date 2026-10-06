# @nocowboy/ui — виджеты через slots + facade view models

Виджет боковой панели (`sidebar-usage`) импортировал **внутренние** контексты
TUI — `useLocal()` и `getUsage()` из `@tui/routes/session/usage` — и сам считал
terminalBench через `props.api.state.provider`. Слоты не давали виджету
автономии: любое изменение внутреннего контекста ломало плагин. Этот пункт
заводит **фасадные view models** на границе plugin API: виджет рендерит готовые
значения и не знает о внутренней структуре TUI.

## Что сделано

### Контракт фасада — `packages/plugin/src/tui.ts`

`TuiViewModels` — пять view models + `TuiPluginApi.viewModels`:

- `usage(sessionID) -> { input, output, cached, terminalBench? }` — токены,
  уже отформатированные для показа.
- `model() -> { providerID, modelID } | undefined`
- `agent() -> { name, mode } | undefined`
- `git() -> { branch } | undefined`
- `memory() -> { status: "available" | "degraded" | "unavailable" }`

### Реализация — `packages/opencode/src/nocowboy/plugin-view-models.ts`

`createTuiViewModels(deps)` — чистая сборка из инъектированных источников
(messages, model, agent, vcsBranch, terminalBench, memoryStatus). Форматирование
переиспользует `getUsage`/`formatCount` и `fmtScore`/`fmtAttemptCost`. Источники
инъектируются — фасад тестируется без рендерера.

### Провязка

- `packages/opencode/src/cli/cmd/tui/plugin/api.tsx` — `createTuiApi` собирает
  `viewModels` из `input.sync`/`input.local`/`memoryStatus()` (маркер
  `nocowboy_change`); `Input` получает `local`.
- `packages/opencode/src/cli/cmd/tui/app.tsx` — передаёт `local` в `createTuiApi`.
- `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts` — per-plugin API отдаёт
  `viewModels: api.viewModels`.
- `packages/opencode/src/nocowboy/plugins/sidebar-usage.tsx` — читает
  `api.viewModels.usage(session_id)`; импорты `useLocal`, `getUsage`,
  `formatCount`, `fmtScore`, `fmtAttemptCost` удалены.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/plugin-view-models.test.ts
bun run typecheck
# и контракт плагина:
cd ../plugin && bun run typecheck
```

Покрыто: форматирование input/output/cached; terminalBench только при наличии у
текущей модели; model/agent/git/memory отражают источники; присутствие всех пяти
view models; **невакуумный гард** — `sidebar-usage.tsx` содержит
`viewModels.usage` и НЕ содержит `useLocal`/`getUsage`/`@tui/context/local`/
`routes/session/usage` (тест упадёт при возврате внутренних зависимостей).
