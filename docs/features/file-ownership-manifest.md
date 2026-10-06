# Ownership-манифест: owned / adapted / generated

Классификация файлов репозитория по принадлежности к форку. Ключевая мысль
аудита: **ownership — это не «всё под `src/nocowboy`»**. Реальная адаптация
живёт в shared-core точках вызова (`session/prompt.ts`, `tool/task.ts`,
`permission/*`), которые остаются в upstream-пути, но вызывают NoCowboy-модули.
Симметрично: наш код в `script/`, `packages/nocowboy-*` не должен выглядеть как
«немодифицированный upstream».

## Классы (по приоритету)

| Класс | Правило |
|---|---|
| `generated` | произведено генераторами: `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `engine-manifest.json`, `ownership-manifest.json`, `docs/features/**` |
| `owned` | NoCowboy-authored/maintained: `packages/opencode/src/nocowboy/`, `packages/opencode/test/nocowboy/`, `packages/core/src/nocowboy/`, `packages/opencode/src/nocowboy-sessions/`, `packages/nocowboy-*`, `script/nocowboy/`, `.nocowboy/`, `scripts/`, `packaging/`, `docs/`; плюс `curated_owned` (`script/upstream/utils/compare-trees.ts` и его тест) |
| `adapted` | вне owned, и файл содержит маркер `nocowboy_change`/`kilocode_change` **или** импортирует `@/nocowboy/*` / `@nocowboy/*`; **сканируются все текстовые файлы без лимита размера** (`.ts/.tsx/.mjs/.cjs/.json/.css`, скрипты без расширения — не только `.ts`); бинарные файлы (NUL-байт в первых 8 КБ) пропускаются; плюс `curated_adapted` |
| `inherited` | всё остальное (немодифицированный upstream core) |

## Артефакты

- `ownership-manifest.json` — список `adapted` (686 файлов на 2026-10-05) и правила.
- `scripts/ownership-manifest.ts` — генератор + `--check` (без volatile `counts`:
  метаданные, которые не проверяются, не хранятся).

`permission/index.ts` попадает в `adapted` не из-за маркера (его там нет), а
потому что импортирует `@/nocowboy/permission/*` — ровно тот shared-core call
site, который AC2 запрещает проглядеть. Файлы `.mjs/.css/.json` и
extensionless-скрипты с маркерами (`postinstall.mjs`, `run-workspace-server`,
`tsconfig.json`, `button.css`, `install`) классифицируются так же — регресс-тест
закрепляет это.

## Гейт

`.husky/pre-commit` запускает `bun run scripts/ownership-manifest.ts --check`:
новое shared-core изменение (новый маркер или импорт) без регенерации манифеста
блокирует коммит с сообщением `unclassified shared-core change: <path>`.

```bash
bun run scripts/ownership-manifest.ts          # перегенерировать
bun run scripts/ownership-manifest.ts --check  # проверить (pre-commit)
```
