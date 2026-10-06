# Tool Capability Config — выбор edit-инструмента из конфига

Нет единственной обязательной методики редактирования: `apply_patch` или
`edit` (search/replace) — зависит от модели, доступных инструментов и промпта.
Раньше выбор был зашит проверкой имени модели в `tool/registry.ts`; теперь это
**capability**, которую задаёт конфиг, а прежняя эвристика осталась дефолтом.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/tool/edit-capability.ts`

- `EditMethod = "patch" | "edit"`.
- `legacyEditMethod(modelID)` — прежняя эвристика **дословно**: `apply_patch`
  для `gpt-*`, кроме `oss` и `gpt-4`; иначе `edit`.
- `resolveEditMethod({ modelID, e2e?, table? })` — приоритет:
  1. E2E-харнесс всегда `patch`;
  2. точный `modelID` в таблице capability;
  3. запись `"*"` в таблице (глобальный дефолт);
  4. `legacyEditMethod`.

### Конфиг — `packages/opencode/src/config/config.ts`

Новое поле `experimental.edit_method`:
`Record<model-id, "patch" | "edit">`, где `"*"` — дефолт для всех моделей.
Отсутствует → прежнее поведение (эвристика).

### Провязка — `packages/opencode/src/tool/registry.ts`

`tools()` больше **не ветвится по имени модели**: вызывает `resolveEditMethod`
с таблицей из `config.experimental.edit_method`. Без конфига результат
идентичен прежнему (`registry.test.ts` зелёный).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/edit-capability.test.ts
bun test test/tool/registry.test.ts
bun run typecheck
```

Покрыто: прежняя эвристика для gpt-* (кроме oss/gpt-4); точная запись
переопределяет эвристику; `"*"` — глобальный дефолт; точная запись важнее `"*"`;
отсутствующая модель → эвристика; E2E → всегда patch.
