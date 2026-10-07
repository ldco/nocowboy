# Plugin Hook Facade

Версионируемая фасадная поверхность plugin-hooks. Интерфейс `Hooks` в
`@nocowboy/plugin` широкий и частично экспериментальный (часть — унаследованные
upstream-хуки, часть — собственные). Автор плагина не должен угадывать, какие из
них движок реально диспатчит. Фасад фиксирует гарантированный набор.

## Что сделано

### Фасад — `packages/plugin/src/facade.ts`

- `HOOK_FACADE_VERSION` — версия поверхности (`1.0.0`; бампается при ломающем
  изменении).
- `SUPPORTED_HOOKS` — официально поддерживаемые хуки, типизированы против
  `Hooks` (`satisfies readonly (keyof Hooks)[]`):
  - `tool.definition`
  - `tool.execute.before`
  - `tool.execute.after`
  - `experimental.chat.system.transform`
  - `experimental.session.compacting`
  - `experimental.compaction.autocontinue`
  - `session.stop`
- `ADAPTER_SEAM_HOOKS` — хуки, которые являются **явным adapter seam** NoCowboy,
  а не предполагаются в произвольном upstream-движке. Сейчас это `session.stop`.
- `isSupportedHook(name)` — тип-гард поверхности.

Реэкспортируется из `packages/plugin/src/index.ts` (`export * from "./facade.js"`).

### `session.stop` — adapter seam, не upstream-допущение

Блокировка turn требует **harness-половины** (синтетический continuation в
`nocowboy/session/stop-hooks.ts`): без неё хук не имеет эффекта. Поэтому
`session.stop` объявлен в `ADAPTER_SEAM_HOOKS`, а не считается свободным
upstream-хуком. Плагин, полагающийся на `session.stop`, полагается на наш адаптер.

### Контракт-тесты — `packages/opencode/test/plugin/hook-facade.test.ts`

- фасад покрывает все обязательные хуки;
- поверхность непустая и без дублей; `isSupportedHook` работает;
- `session.stop` ∈ `ADAPTER_SEAM_HOOKS`;
- **каждый** поддерживаемый хук реально диспатчится в движке (сканируем
  `src/tool/registry.ts`, `src/session/prompt.ts`, `src/session/compaction.ts`,
  `src/agent/agent.ts`, `src/session/llm.ts` на строковый литерал хука).

## Проверка

```bash
cd packages/opencode && bun test test/plugin/hook-facade.test.ts
cd packages/plugin && bun run typecheck
```
