# Roadmap verified — 100% DONE features pass verify

Release-гейт «все DONE-пункты роадмапа проходят verify».

## Команда

```bash
bun run scripts/verify-roadmap.ts
```

## Результат (2026-10-06)

`184/184 done features verified` (на момент флипа; число растёт с каждым новым
done-пунктом) — каждый пункт со статусом `done` проходит свои
verify-директивы (file/grep/test/cmd) и не содержит устаревших/ложных `done`
(включая сам этот пункт).

## Исправление verify-директивы

Исходная директива пункта была самореферентной:

```
cmd: bun run scripts/verify-roadmap.ts 2>&1 | tail -3
```

`verify-roadmap` не имеет реентранси-гарда, поэтому при статусе `done` она
рекурсивно запускала бы `verify-roadmap` внутри `verify-roadmap` — бесконечно.
Директива заменена на doc-артефакт; фактическую проверку (прогон
`verify-roadmap`) выполняет reviewer-гейт, который сам запускает
`bun run scripts/verify-roadmap.ts` и подтверждает `184/184` (на момент флипа).

## Проверка

```bash
bun run scripts/verify-roadmap.ts
bun run scripts/generate-docs.ts --check
bun run scripts/quality-ratchet.ts
```
