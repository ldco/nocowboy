# Engine manifest — измеряемая база форка

> Артефакт: `engine-manifest.json` (корень репозитория).
> Генератор: `scripts/engine-manifest.ts`.

## Что фиксирует

| Поле | Значение |
|---|---|
| `engine.nocowboy_sha` | SHA NoCowboy на момент генерации (информационное) |
| `engine.root_commit` | корневой коммит дерева — `ca721a26f9942817652ee4cbc42bf76da7f5d638` (2026-06-19, «fork of KiloCode v7.3.46») |
| `fork_of` | заявленный источник: Kilo Code, tag `v7.3.46`, SHA `f388b60ab579adef7cf1a6c022082100338d6450` |
| `provenance.confidence` | `snapshot` — см. ниже |
| `dependencies` | OpenTUI `0.4.1`, AI SDK `6.0.168`, MCP SDK `1.29.0` (из `workspaces.catalog` / `packages/opencode/package.json`) |
| `upstream_backports` | элементы роадмапа с `phase: "backport"` |

## Provenance confidence — `snapshot`

Заявленный tag `v7.3.46` существует локально как commit-объект, но **не является
предком** NoCowboy-`HEAD`: между корневым коммитом `ca721a2` и тегом нет связи
(`git merge-base --is-ancestor` → нет). Дерево — **импортированный снимок**, а не
сохранённая Git-цепочка предков.

Практические следствия:

- `git log` не может показать дельту «upstream → NoCowboy»; сравнивать нужно
  нормализованные деревья, а не историю.
- Патчи upstream нельзя черри-пикать через ancestry — только вручную, через
  `kilocode_change`-маркеры (см. `docs/upstream-sync-audit.md`,
  `docs/adr/002-upstream-sync-strategy.md`).
- `confidence` поднимается до `chain` автоматически, если когда-нибудь будет
  собран сохранённый lineage (тег станет предком `HEAD`).

`upstream_remote` сейчас — `https://github.com/kilo-org/kilocode.git`;
это read-only reference для сравнения, не источник merge.

## Как обновлять

```bash
bun run scripts/engine-manifest.ts          # перегенерировать engine-manifest.json
bun run scripts/engine-manifest.ts --check  # упасть, если файл устарел
```

`--check` сравнивает только выводимые поля (SHA и timestamp исключены —
иначе манифест устаревал бы после собственного коммита).
