# Vector store switcher — выбор бэкенда в Settings + перестройка/откат

Выбор векторного хранилища индексации из TUI и явное решение о последствиях.
Смена бэкенда несовместима с уже построенным индексом (векторы живут в конкретном
бэкенде и размерности), поэтому переключение — не просто запись поля. Спек:
`.nocowboy/specs/vector-store-switcher.md`.

## Что сделано

### UI + решение — `packages/opencode/src/nocowboy/components/dialog-indexing.tsx`
- `VectorStoreSelect` (Settings → Indexing) показывает текущий бэкенд и даёт выбрать
  другой (AC1).
- `chooseRebuildAction` — при смене бэкенда предупреждение «Index will be rebuilt» с
  тремя вариантами: rebuild now / later / **cancel**; cancel не пишет конфиг (AC2).
- Availability-гейт: перед `saveScopedIndexing` вызывается `checkVectorStore`; недоступный
  бэкенд (qdrant без URL) не сохраняется, показывается ошибка (AC3).

### Логика — `packages/opencode/src/nocowboy/indexing-vector-store.ts` (чистая)
- `checkVectorStore` (lancedb всегда ок; qdrant требует валидный URL; неизвестный → нет),
  `isVectorStore`, `needsRebuild`.
- Rollback: `rollbackTarget`, `watchRollback`, `applyWithRollback` — откат к прежнему
  бэкенду только при терминальной ошибке сборки; медленная сборка не считается ошибкой (AC5).
- `watchBackend` в диалоге опрашивает `indexing.status` (состояние `Complete`/`Error`) и
  откатывает конфиг при ошибке.

### Цепочка конфиг→переиндексация (корневой фикс) — `nocowboy/indexing.ts` + `nocowboy/bootstrap.ts`
- Раньше смена `indexing.vectorStore` только сохраняла поле: запись кэшировалась по
  `Instance.directory` и конфиг не перечитывался. Теперь `KiloIndexing.reload()` +
  `onConfigUpdated()` пересоздают запись при изменении индексационного конфига (AC4).
- Детектор — `indexing-config-key.ts`: `indexingConfigKey` (только поля, влияющие на
  индекс; тюнинг не триггерит) и `indexingStoreId` (идентичность хранилища).
- Подписка: `bootstrap.ts` слушает `global.config.updated` через `GlobalBus`, обёрнуто в
  `Instance.bind` (колбэк шины вне instance-контекста).

### Удаление старого индекса (AC6) — НЕ реализовано (откачено)

Попытка реализации AC6 (удалить данные старого бэкенда после успешной сборки)
откачена после независимой верификации: `KiloIndexing.init()` резолвится на
`track()` **до** реальной сборки, поэтому «чистить после успеха» чистит раньше
(нарушение инварианта спеки №2), а воркер держит **один manager на ключ**
`${directory}\0${root}`, поэтому `clearIndexData` после reload попадёт в НОВЫЙ
manager и удалит новый индекс. Корректная реализация требует отдельного
дескриптора старого стора и live-прогона. См. `blocker` в `docs/roadmap.json`.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/indexing-vector-store.test.ts
bun test test/nocowboy/indexing-config-key.test.ts
bun test test/nocowboy/indexing-startup.test.ts
bun run typecheck
```

Покрыто: availability-гейт и его unit-тест; rollback-контроллер (успех/ошибка/медленно);
детектор изменения конфига (rebuild-поля vs тюнинг); идентичность стор (смена бэкенда vs
смена провайдера). Live-подтверждение фоновой перестройки и удаления старого стора
требует запущенного индексатора.
