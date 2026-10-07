# Deep Context Selection — сигнал затронутых файлов для контекста

Отбор содержимого для «глубокого контекста» (`.nocowboy/specs/deep-context-2m.md` §3)
начинается с changelist'а diff'а: в контекст попадают **изменённые файлы и их
ближайшие импортёры**, а не весь репозиторий. Это чистая функция-сигнал — без
движка, без графа как обязательной зависимости.

## Модуль (чистый) — `packages/opencode/src/nocowboy/session/deep-context-selection.ts`

```ts
selectDeepContext({
  changedFiles: readonly string[],
  provider?: GraphProvider | null,   // опциональный knowledge-graph
  depth?: number,                    // глубина обхода импортёров
  maxFiles?: number,                 // бюджет отбора, по умолчанию 40
}): DeepContextSelection
```

Возвращает:

| Поле | Смысл |
| --- | --- |
| `files` | Итоговый отбор: сначала `changed` (порядок входа), затем ближайшие импортёры; дедуп и порядок |
| `changed` | Пригодные записи changelist'а (trim, непустые, дедуп) |
| `impacted` | Импортёры, реально добавленные в `files` (nearest first) |
| `usedGraph` | `true`, если провайдер был опрошен и не бросил исключение |
| `truncated` | `true`, если импортёры отброшены ради `maxFiles` |

Функция **тотальна и чиста**: никаких часов, файловой системы, глобалов. Одни и те
же входы → один и тот же результат.

## Сигнал: diff + граф

- `changedFiles` санитизируются: принимаются только строки, `trim`, пустые
  отбрасываются, дубликаты убираются с сохранением порядка.
- При наличии `provider` вызывается `provider.impacted(changed, depth)` внутри
  `try/catch`. Результат валидируется (отбраковка не-объектов и записей без
  строкового `file`), из него исключаются файлы из `changed`, затем сортировка:
  `distance` ↑, затем `exact` перед `heuristic`, затем путь ↑.
- Порядок итога: **все `changed` первыми** (порядок входа), затем импортёры.
- `maxFiles` (по умолчанию **40**) всегда сохраняет **все** изменённые файлы;
  импортёры добавляются до бюджета. Если `changed` сам превышает бюджет —
  импортёры не добавляются, `truncated = true`.

## Грациозная деградация

Провайдер графа — **опциональная и недоверенная** зависимость:

- нет провайдера (`undefined`/`null`) → diff-only: `files = changed`,
  `impacted = []`, `usedGraph = false`;
- пустой changelist → diff-only, провайдер даже не вызывается;
- провайдер бросил исключение → diff-only, вызывающий код не падает;
- провайдер вернул не-массив / битые записи → отбраковка, `usedGraph = true`.

## Ключевые файлы

- `packages/opencode/src/nocowboy/session/deep-context-selection.ts` — модуль.
- `packages/opencode/test/nocowboy/deep-context-selection.test.ts` — тесты.
- `packages/opencode/src/nocowboy/knowledge-graph/provider.ts` — контракт `GraphProvider` (переиспользуется, не меняется).
- `packages/opencode/src/nocowboy/knowledge-graph/importer.ts` — построение реального графа в тестах.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/deep-context-selection
bun run typecheck
```

Покрыто (17 тестов): импортёры из реального графа с сохранением `distance`/`confidence`;
`changed`-first и отсутствие дублей; `depth`; сортировка distance → confidence → path;
дедуп импортёров; отсутствие/`null`/бросающий провайдер → diff-only без падения;
битый ввод (не-строки, пустые, дубликаты) и битый результат провайдера;
`maxFiles` (накладывает предел на импортёров, сохраняет все `changed`, флаг
`truncated`); детерминизм.

## За рамками

Полная сборка запроса (repomap → тексты файлов → память) и учёт стоимости
cache-read — отдельные пункты спеки `deep-context-2m` §3–§4. Здесь реализован
только сигнал отбора.
