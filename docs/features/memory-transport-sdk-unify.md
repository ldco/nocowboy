# Memory transport unify — один seam + общий lifecycle

Прямой JSON-RPC путь NUTAUSIK уже шёл через `MemoryAdapter` (memory-adapter-unified),
но generic MCP SDK-транспорт (`mcp/index.ts`) оставался отдельным: свой набор
project-scoped серверов (`PROJECT_SCOPED_MCP`), собственное склеивание
`projectDir` и своя жизнь — вызовы SDK не попадали ни в наблюдаемый `status()`,
ни в bounded `flush()` адаптера. Два seam'а могли разойтись. Этот пункт сводит
generic MCP SDK-транспорт к тому же адаптеру: **один seam для project/session,
observable status, bounded flush**.

## Что сделано

### Один seam — `packages/opencode/src/nocowboy/memory/scope.ts`

- `PROJECT_SCOPED_SERVERS` (`nutausik`) + `isProjectScopedServer(name)`.
- `withMemoryScope(args, { project, session }, { override? })` — единственная
  точка, где к аргументам вызова прикрепляются `projectDir`/`sessionID`:
  - по умолчанию выигрывает caller (контракт MCP-транспорта);
  - `override: true` делает namespace авторитетным (контракт MemoryAdapter —
    stray `projectDir` не может перекинуть проект);
  - не мутирует входные args.

### Общий lifecycle — `packages/opencode/src/nocowboy/memory/adapter.ts`

- `MemoryAdapter.call` строит params через `withMemoryScope(..., { override: true })`.
- `trackExternal(run)` — регистрирует ВНЕШНИЙ вызов (SDK-транспорт) в том же
  in-flight set → bounded `flush()` накрывает и SDK-вызовы.
- `note(status)` — внешний наблюдатель сообщает health.
- `sharedMemoryAdapter()` — один инстанс на весь NUTAUSIK (direct + SDK);
  `createNutausikAdapter()` без `fetchImpl` возвращает тот же shared-инстанс,
  а с `fetchImpl` — свежий (для тестов), поэтому `nutausik-client.ts` не меняется.

### Провязка — `packages/opencode/src/mcp/index.ts`

- Локальный `PROJECT_SCOPED_MCP` удалён; используется `isProjectScopedServer`.
- `withProjectDir` делегирует в `withMemoryScope` (поведение сохранено:
  non-scoped → args без изменений; caller `projectDir` выигрывает).
- `convertMcpTool`: для project-scoped серверов execute оборачивается в
  `sharedMemoryAdapter().trackExternal(...)` — успех → `note("available")`,
  tool-error (`result.isError`) или брошенная ошибка → `note("degraded")` — та
  же семантика, что у прямого пути. Сам транспорт не заменяется (model-facing
  путь не меняется) — унифицируются seam и lifecycle.
- `nutausik-client.ts` использует общий adapter (через `createNutausikAdapter()`,
  теперь memoized) вместо собственного инстанса.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/memory-transport-unify.test.ts
bun test test/mcp/project-dir.test.ts
bun run typecheck
```

Покрыто: predicate project-scoped; caller-wins vs override; attach session без
мутации args; `trackExternal` учитывается в `pending()`/`flush()`; `note`
обновляет `status()`; `sharedMemoryAdapter` — один инстанс. `withProjectDir`
сохраняет прежнее поведение (существующий `test/mcp/project-dir.test.ts`).
