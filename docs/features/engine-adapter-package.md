# @nocowboy/engine-adapter — единая точка входа в движок

Порты `@nocowboy/runtime` — чистые контракты. Их нужно связать с живым
движком ровно один раз. Раньше это происходило вразнобой: `tool/registry.ts` и
`tool/task.ts` каждый сам импортировал конкретную реализацию порта
(`nocowboy/agent/catalog`) и правило `mode !== "primary"` дублировалось.

## Что сделано

`packages/opencode/src/nocowboy/engine-adapter/index.ts` — **единственный**
модуль (кроме тестов), которому можно тянуть конкретные реализации портов:

- `EngineAdapter.agentCatalog()` → `AgentCatalogPort` (реализация `AgentCatalog`).
- `EngineAdapter.policy(ruleset)` → `PolicyPort` поверх `Permission.evaluate`.
- `EngineAdapter.session/model/memory/telemetry/edit(engine)` — привязка
  сервисных портов к движку (для следующих вертикалей).

Вертикаль **worker + task + permissions** переведена на адаптер:

- `tool/task.ts`: spawn-политика (`isSpawnable`/`spawnError`) — через
  `EngineAdapter.agentCatalog()`.
- `tool/registry.ts`: листинг `task`-типов и фильтр по `task`-правилу — через
  `EngineAdapter.agentCatalog()` и `EngineAdapter.policy(...)`.

## Гейт

`scripts/check-engine-adapter.ts` (в `.husky/pre-commit`):

1. `nocowboy/agent/catalog` импортируется только изнутри
   `nocowboy/engine-adapter/` — никаких параллельных путей.
2. `tool/task.ts` и `tool/registry.ts` обязаны импортировать адаптер.

## Проверка

```bash
bun run scripts/check-engine-adapter.ts --check
cd packages/opencode && bun test test/nocowboy/engine-adapter/engine-adapter.test.ts
cd packages/opencode && bun test test/tool/task.test.ts test/tool/registry.test.ts
```

Вертикаль остаётся зелёной: `test/tool/task.test.ts` + `registry.test.ts` (37),
permission-сьюты (149), порты (11).
