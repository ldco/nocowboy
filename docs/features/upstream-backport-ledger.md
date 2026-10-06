# Upstream Backport Ledger — SHA → потребность → контракт → адаптация → verify

Структурированный ledger селективных upstream-переносов. По каждому переносу
фиксируется: upstream SHA → локальная потребность → затронутый контракт → где
живёт адаптация (локальный commit/файлы) → проверка → статус. Смысл — не дать
повторному переносу вернуть уже исправленную семантику и не дать ручному
переносу незаметно разойтись с оригиналом.

## Что сделано

- **Данные:** `backport-ledger.json` — 13 записей, засеяны из реальной истории
  портов (`docs/reference/upstream-port-list.md`, Port log Tier-0).
- **Ядро (чистое):** `packages/opencode/src/nocowboy/backport/ledger.ts` —
  `validateBackportLedger` (пять частей на запись, уникальность id, валидный
  статус, `done` обязан назвать SHA) и `duplicateUpstreamShas` (дубликат SHА —
  нарушение: перенос фиксируется один раз).
- **Проверка:** `scripts/backport-ledger.ts --check` — валидирует ledger,
  падает на любой проблеме.
- **Тесты:** `packages/opencode/test/nocowboy/backport-ledger.test.ts` — ядро,
  дубликаты, и валидность закоммиченного ledger.

## Проверка

```bash
bun run scripts/backport-ledger.ts --check
cd packages/opencode && bun test test/nocowboy/backport-ledger.test.ts
```

Формат и правила — `docs/reference/upstream-backport-ledger.md`.
