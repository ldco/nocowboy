# Commitment-Boundary Review — обязательное ревью перед deliverable

Свежая модель (НЕ та, что вела сессию) читает diff с нуля и возвращает **ровно
один** вердикт: `ship` / `fix-first` / `rethink`. Запрашивается **один раз** в
конце deliverable (guard: повторный запрос для того же deliverable не выдаётся) —
это решение о коммите, а не ещё один проход ревью.
Вдохновлено Fable Advisor.

## Что сделано

`packages/opencode/src/nocowboy/review/commitment.ts` (чистое ядро):

- `COMMITMENT_VERDICTS` / `CommitmentVerdict` — только три вердикта, никаких
  «почти ship».
- `parseCommitmentVerdict(text)` — срезает fenced-блоки до матчинга (эхо-пример
  в ``` не перебивает реальный ответ); метка `Verdict:` приоритетна, регистр/
  пробелы/`_` нормализуются; разделитель `fix-first` обязателен (`fixfirst` —
  не вердикт); иначе первое standalone-слово; `undefined`, если вердикта нет.
- `buildCommitmentPrompt({ diff, task? })` — промпт для независимой модели:
  «fresh eyes», ровно один вердикт, обоснование, блокеры.
- `CommitmentBoundary` — guard «один раз на deliverable»: `shouldRun(id)` вернёт
  `true` только при первом вызове для id.

`.nocowboy/command/commitment-review.md` — команда `/commitment-review`: берёт
diff deliverable, запускает независимую модель через `task(subagent_type:
"reviewer")` с commitment-промптом, разбирает и докладывает вердикт.

Интеграция «один запрос в конце deliverable»: `complete_task` при успехе смотрит
в общий `commitmentBoundary` и ровно один раз на task-slug добавляет в вывод
приглашение запустить `/commitment-review` (провязка закреплена grep-директивой
roadmap на `packages/opencode/src/tool/complete_task.ts`).

## Проверка

```bash
cd packages/opencode && bun test test/nocowboy/commitment-review.test.ts
```

Покрыто: разбор всех трёх вердиктов + нормализация + метка-приоритет + отсутствие
вердикта; промпт содержит diff и три вердикта; guard «один раз на id» и
независимость разных id.
