# Knowledge Graph AST engine — tree-sitter definitions, call edges, AST provider

> Реализует пункт роадмапа `knowledge-graph-ast-engine`. Заменяет *наполнение*
> графа в `GraphProvider`, не меняя ни одного consumer.

## Что это

`knowledge-graph-stub` описал устойчивый контракт `GraphProvider` — `snapshot()`
/ `impacted()` / `layer()` — и in-memory fallback. Этот пункт добавляет за ним
тяжёлое наполнение из реального AST: структурированные определения, рёбра
вызовов и готовый `AstGraphProvider`, который отдаёт снимок через тот же
интерфейс. Consumers (`diff-impact-analysis`, `arch-layer-detection`,
`deep-context-selection`) продолжают зависеть только от `GraphProvider`.

## Извлечение (в `@nocowboy/indexing`)

`packages/nocowboy-indexing/src/tree-sitter/ast.ts`:

- `parseDefinitionsForFile(filePath)` → `AstDefinition[]` = `{name, kind, line}[]`.
  Прогоняет те же per-language definition-запросы, что и
  `parseSourceCodeDefinitionsForFile`, но возвращает структуру, а не текстовый
  блоб. Поддерживаются обе конвенции капчуров: TS `@name.definition.<kind>` и
  JS/TSX `@name` рядом с `@definition.<kind>`. `kind` — сегмент после
  `definition.`; дедуп по `(kind,name,line)`, сортировка по строке.
- `parseCallEdgesForFile(filePath)` → `AstCallEdge[]` = `{from, to, line}[]`.
  Прогоняет call-запрос (`(call_expression function: (identifier) @callee)` и
  member-форму). `from` — ближайшее объемлющее именованное определение (по
  предкам узла) либо `"<module>"`; `to` — простое имя вызванного.
- Scope: TS/JS/TSX. Неподдерживаемое расширение, недоступный WASM, нечитаемый
  файл или ошибка парсинга → `[]`; функции тотальны и не бросают.

Обе функции и типы экспортируются из барреля `src/index.ts` пакета.

## Граф (в `packages/opencode`)

`packages/opencode/src/nocowboy/knowledge-graph/ast.ts`:

- `buildAstGraph(root)` → `GraphSnapshot` (`source: "ast"`, `generatedAt`).
  Обходит исходники (`listSourceFiles`), строит:
  - `file`-ноды (по одной на файл) и `symbol`-ноды `path#name` (по одной на имя —
    несколько kinds одного имени схлопываются в один узел);
  - `import`-рёбра — переиспользованы из `buildImportGraph` (exact/heuristic);
  - `contains`-рёбра файл → символ (exact);
  - `call`-рёбра, разрешённые консервативно (см. ниже).
- `AstGraphProvider implements GraphProvider` — держит снимок, `snapshot()`
  отдаёт его, `impacted()` обходит обратные рёбра (nearest-first, worst-case
  confidence вдоль пути), `layer()` использует правила из `layers.ts`.
  Обход зеркалит `InMemoryGraphProvider` делегированием — единственный способ
  гарантировать совпадение семантики и не дублировать логику.

## Семантика confidence для call-рёбер

| Ситуация | Результат |
|---|---|
| Цель объявлена в том же файле | `exact` |
| Цель объявлена ровно в одном импортируемом файле | `exact` |
| Цель объявлена в нескольких импортируемых файлах | drop (неоднозначно) |
| Ровно одно объявление с таким именем где угодно | `heuristic` |
| Ноль или >1 кандидата без импорта | drop |

Правило: никогда не угадывать. Неоднозначное имя не резолвится в один файл.

## Файлы

- `packages/nocowboy-indexing/src/tree-sitter/ast.ts` — извлечение
- `packages/nocowboy-indexing/src/index.ts` — экспорт из барреля
- `packages/nocowboy-indexing/test/nocowboy/tree-sitter/ast.test.ts` — unit-тесты
- `packages/opencode/src/nocowboy/knowledge-graph/ast.ts` — граф + провайдер
- `packages/opencode/test/nocowboy/knowledge-graph-ast.test.ts` — AC-тесты

## Verification

- `bun test` в `packages/nocowboy-indexing` (извлечение определений и вызовов)
- `bun test test/nocowboy/knowledge-graph-ast` в `packages/opencode` (AC1–AC3)
- `bun test test/nocowboy/knowledge-graph-stub` — контракт не сломан
- `bun run typecheck` в обоих пакетах
