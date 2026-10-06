# AgentCatalog и единая политика spawnable agents

Политика «кого можно делегировать через `task`» была размазана: листинг
(`tool/registry.ts` → `describeTask`) фильтровал `mode !== "primary"`, а executor
(`tool/task.ts`) не проверял ничего — `KiloTask.validate()` был no-op. Поэтому
`auto` (dispatcher, `mode: "primary"`) не показывался в списке, но **спавнился**,
если его назвать явно.

## Что сделано

- Новый `packages/opencode/src/nocowboy/agent/catalog.ts` — **единственный
  источник политики**:
  - `AgentCatalog.isSpawnable(agent)` — `mode !== "primary"`;
  - `AgentCatalog.spawnable(list)` — фильтр для листинга;
  - `AgentCatalog.spawnError(name, mode)` — типизированная ошибка.
- `tool/registry.ts` (describeTask) → `AgentCatalog.spawnable(agents.list())`.
- `tool/task.ts` (executor) → `if (!AgentCatalog.isSpawnable(next)) return yield*
  Effect.fail(AgentCatalog.spawnError(...))`.
- `KiloTask.validate` (no-op) удалён.

Оба конца вызывают один и тот же объект, поэтому листинг и исполнение не могут
разойтись. Primary-агенты (`auto`, а также hidden `compaction`/`title`/`summary`)
не спавнятся; `all`/`subagent` (worker, planner, reviewer, architect, nocowboy,
reference) — спавнятся.

Guard в executor стоит **до** `ctx.ask` и до любых side-effects: запрещённая
роль не доходит до permission-системы (не поднимает промпт и не может осесть
широким `task:*` always-allow). Порядок запиннен тестом через записывающий
`ask`-стаб (`expect(asked).toHaveLength(0)`).

## Побочный root-fix тест-харнеса

`test/lib/effect.ts` теперь всегда передаёт конкретный таймаут (60000, как в
`packages/opencode/bunfig.toml`): `test(name, fn)` / `test(name, fn, undefined)`
игнорируют bunfig `[test] timeout` и берут хардкод 5000ms, из-за чего
boot-тяжёлые `it.instance`-тесты (в т.ч. в `test/tool/task.test.ts`) флакали
под нагрузкой. `<...>.only`/`.skip` покрыты тем же хелпером.

Capability-профили ролей не меняются этим пунктом: `auto` остаётся dispatcher'ом
со своим prompt, `nocowboy` — companion (не chat-only).

## Проверка

```bash
cd packages/opencode && bun test test/nocowboy/agent-catalog.test.ts   # unit: политика
cd packages/opencode && bun test test/tool/task.test.ts                # executor: spawn auto → отказ
```

`test/tool/task.test.ts` содержит тест «execute rejects spawning a primary
(non-spawnable) agent»: вызов `task` с `subagent_type: "auto"` падает, ошибка
содержит `not spawnable`.
