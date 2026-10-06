# Upstream Backport Ledger

**Data:** `backport-ledger.json`
**Check:** `bun run scripts/backport-ledger.ts --check`
**Validator:** `packages/opencode/src/nocowboy/backport/ledger.ts`

## Зачем

Селективный backport безопасен, только если мы помним по каждому переносу:
откуда он (upstream SHA), зачем он нам, какой контракт затронут, где живёт
адаптация и чем проверяется. Без этого повторный перенос способен вернуть уже
исправленную семантику, а ручной перенос — незаметно разойтись с оригиналом.
Ledger — единственный источник правды по каждому переносу.

## Запись

Каждый entry содержит ровно пять частей плюс статус:

| Поле | Значение |
| --- | --- |
| `id` | стабильный id (roadmap item или audit-ссылка, напр. `T0.1`) |
| `upstream_shas` | SHA upstream-коммитов, откуда портировано (`local`/`none` — нет upstream-переноса) |
| `need` | локальная потребность, одно предложение |
| `contracts` | затронутый контракт — файлы/модули |
| `adaptation` | где живёт адаптация: локальный commit SHA или файлы |
| `verify` | команда/проверка, подтверждающая, что перенос держится |
| `status` | `done` / `planned` / `blocked` / `abandoned` / `n/a` |

`done`-запись обязана назвать `upstream_shas` (для «наших» правок — `local`).
Один и тот же upstream SHA не может стоять в двух entries — это и есть защита
от повторного переноса, check-скрипт падает на дубликате.

## Источник данных

Ledger засеян из `docs/reference/upstream-port-list.md` (Port log) — реальной
истории портов Tier-0 с upstream- и локальными SHA. Обновление: при новом
переносе добавь entry с его SHA и verify, затем прогони `--check`.

## Как проверяется

```bash
bun run scripts/backport-ledger.ts --check
bun test packages/opencode/test/nocowboy/backport-ledger.test.ts
```

- обязательные поля каждой записи;
- уникальность `id`;
- валидность `status`;
- `done` без `upstream_shas` — ошибка;
- дубликат upstream SHA между записями — ошибка.
