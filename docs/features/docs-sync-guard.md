# Generated docs stay in sync with roadmap.json

> Фича v1.0.7-alpha. Документация/пайплайн: [docs/README.md](../README.md).

## Проблема

`docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/BACKLOG.md` генерируются из
`docs/roadmap.json` (`scripts/generate-docs.ts`). Источник правды — только JSON;
`.md` никто не редактирует вручную. Но **ничто не гарантировало, что
закоммиченные `.md` соответствуют `roadmap.json`**:

1. **pre-commit перегенерировал после `git add`.** Хук бежит после индексации,
   поэтому перезапись рабочего дерева не попадает в коммит — в него уходит
   **устаревший снапшот** сгенерированных файлов. Классическая ошибка
   pre-commit: изменил файл — обязан сделать `git add`.
2. **Ошибки генератора глотались:** `bun run scripts/generate-docs.ts 2>/dev/null || true`.
   Упавшая генерация не блокировала коммит.
3. **Не было режима проверки.** Ни CI, ни pre-push, ни `verify-roadmap` не
   сравнивали `.md` с `roadmap.json` — рассинхрон можно было протащить в remote.

## Решение

### `--check` у генератора

`scripts/generate-docs.ts --check` строит все три документа в памяти и
**сравнивает** с файлами на диске; при расхождении печатает, какие файлы
устарели, и возвращает `1`. Ничего не пишет — безопасно для гейтов.

### pre-commit: сгенерировать и **застейджить**

```bash
bun run "$ROOT/scripts/generate-docs.ts" || exit 1   # fail loudly
git add -- docs/ROADMAP.md docs/CHANGELOG.md docs/BACKLOG.md
bun run "$ROOT/scripts/verify-roadmap.ts"
```

Генерация больше не глотает ошибки, а `git add` кладёт свежие доки в коммит —
расхождение невозможно, даже если автор правил только `roadmap.json`.

### pre-push: гейт `--check`

```bash
bun run "$ROOT/scripts/generate-docs.ts" --check
```

Ловит коммиты, сделанные с `--no-verify` (они проскакивают pre-commit), до
отправки на remote.

## Ключевые файлы

- `scripts/generate-docs.ts` — режим `--check`.
- `.husky/pre-commit` — генерация + `git add` + `verify-roadmap`.
- `.husky/pre-push` — гейт `--check`.
- `docs/roadmap.json` — единственный источник; `.md` генерируются.

## Верификация

- `bun run scripts/generate-docs.ts --check` → `0` при синхроне.
- Рассинхрон (дописать строку в `CHANGELOG.md`) → `--check` возвращает `1` и
  называет файл.
- `bun run scripts/verify-roadmap.ts` включает `cmd`-директиву
  `bun run scripts/generate-docs.ts --check`.
