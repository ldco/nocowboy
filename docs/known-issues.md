# Known Issues

Текущая версия: **1.3.1** (`packages/opencode/package.json`).
Этот файл описывает состояние движка, а не историю релизов — историю см. в
[CHANGELOG.md](CHANGELOG.md).

## Что считается здоровым состоянием

Правда о состоянии — только у гейтов. Прогони их сам, не верь числам в тексте:

```bash
bun turbo typecheck                    # все пакеты
bun run --cwd packages/opencode test   # тест-сьют (не `bun test` из корня)
bun scripts/verify-roadmap.ts          # каждый DONE-пункт roadmap против кода
bun run docs:check                     # сгенерированные доки в синхроне
```

## Известные ограничения

Структурные, отслеживаются в [roadmap.json](roadmap.json) как `blocked`:

| Область | Статус | Причина |
|---|---|---|
| Turso — production SQLite для multi-machine sync | blocked | `drizzle-orm` не экспортирует `libsql` subpath, поэтому `@libsql/client` нельзя подключить через ORM. |
| Vector store switcher UI | blocked | Нужен корректный rollback старого индекса + live-верификация; наивный reload нарушает инвариант «старый индекс не удаляется до успешной сборки нового». |
| Obsidian MCP | blocked | Требуется живой Obsidian + плагин `obsidian-local-rest-api` для ручной проверки. |

## История

Предыдущая версия этого файла фиксировала снимок состояния `v0.11.0-alpha`
(2026-08-04). Она устарела и заменена этим файлом — числа вида «тесты 493/493»
намеренно не переносятся: единственный актуальный источник — вывод гейтов выше.
