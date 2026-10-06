---
description: Review the current diff for over-engineering — list what to remove or simplify
mode: all
---

Over-Engineering Review (`/ponytail-review`). Прочитай **текущий diff** (`git diff`,
включая staged/untracked) и найди то, что можно **удалить или упростить** —
переинжиниринг, а не стилистику.

## Что искать

- **duplication** — один и тот же блок/логика в двух местах → общий хелпер.
- **unnecessary-abstraction** — обёртка/слой с одной реализацией и одним вызовом → инлайн.
- **dead-code** — неиспользуемые ветки, экспорты, параметры → удалить.
- **premature-generalization** — «на будущее»: параметры/интерфейсы без второго кейса → сузить.
- **unneeded-dependency** — пакет ради одной функции, которая есть в stdlib/нативном API.
- **over-configuration** — флаги/опции, которые никто не выставляет → убрать.

## Что НЕ трогать (никогда)

Валидацию на границах доверия, обработку ошибок, защиту от потери данных,
security/auth, доступность. Это не переинжиниринг — это обязательное.

## Формат вывода

Ровно одна строка на находку, разделитель — длинное тире `—`:

```
- [<category>] <target> — <suggestion>
```

`category` — из списка выше; `target` — `file:line`, символ или фича; `suggestion` —
конкретное действие (удалить, заинлайнить, слить, убрать зависимость).

Если чисто — одной строкой: `No over-engineering found.`

Разбор этой формы — `parseFindings` в `src/nocowboy/review/over-engineering.ts`;
свод по категориям — `summarizeFindings`.

Usage:
`/ponytail-review`
