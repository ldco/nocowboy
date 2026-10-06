# Over-Engineering Review — `/ponytail-review`

Свежий взгляд на текущий diff специально на **переинжиниринг**: агент читает diff
и возвращает список того, что можно **удалить или упростить**. Лестница
(`lazy-senior.md`) говорит, что НЕ писать; `/ponytail-review` — что УБРАТЬ из уже
написанного. Вдохновлено Ponytail.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/review/over-engineering.ts`

- `OE_CATEGORIES` — `duplication`, `unnecessary-abstraction`, `dead-code`,
  `premature-generalization`, `unneeded-dependency`, `over-configuration`, `other`.
- `normalizeCategory(text)` — свободный текст категории → известная (неизвестное → `other`).
- `parseFindings(text)` — разбирает отчёт: либо fenced JSON-массив
  `{category,target,suggestion}`, либо канонические строки
  `- [<category>] <target> — <suggestion>` (разделитель — длинное/короткое тире или
  ` - `). Не-находки игнорируются.
- `hasFindings(text)`, `renderFindings(findings)` (детерминированно, round-trip),
  `summarizeFindings(findings)` (итог и разбивка по категориям).

### Команда — `.nocowboy/command/ponytail-review.md`

`/ponytail-review` читает `git diff`, ищет шесть категорий переинжиниринга и
выдаёт находки в каноническом формате. Явно запрещает резать safety-инварианты
(trust-boundary, error handling, data-loss, security, a11y). Файл force-added
(`.nocowboy/` в `.gitignore`).

### Дисциплина — `.nocowboy/rules/lazy-senior.md`

Секция «Проверка перед коммитом»: перед закрытием deliverable прогони
`/ponytail-review`; находки — в каноническом формате `parseFindings`.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/over-engineering-review.test.ts
bun run typecheck
```

Покрыто: нормализация категорий и алиасов; разбор bullet-формата (несколько
находок, игнор не-находок, ` - `-разделитель); fenced JSON + дефолт категории +
фолбэк на bullets при невалидном JSON; round-trip `parse(render(x)) === x`;
`summarizeFindings` по категориям.
