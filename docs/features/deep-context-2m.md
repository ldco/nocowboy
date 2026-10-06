# Deep Context 2M — бюджетирование окна через context profile

«Глубокий контекст» — это не «залить весь репозиторий в 2M-окно», а **бюджетирование**:
сколько контекста задача готова платить и как это ограничить, не ломая существующую
компактификацию. Реализовано ядро бюджетирования: профиль контекста, обязательный
токен-бюджет для `deep`, сдвиг порога компактификации и наблюдаемость в сайдбаре.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/session/context-profile.ts`

- `CONTEXT_PROFILES` = `compact | standard | deep`.
- `PROFILE_FRACTION` — доля окна: `compact` 50%, `standard` 80%, `deep` 90%.
- `DEEP_MIN_CONTEXT` = `512_000` — минимальное окно для `deep`.
- `validateContextProfile({ profile, budgetMaxTokens })` — `deep` без
  `budget.max_tokens` отвергается понятной ошибкой; остальные профили валидны.
- `resolveContextProfile({ requested, modelContext, budgetMaxTokens })` — чистая
  функция: возвращает профиль в силе, долю, и при несовместимости
  `downgradedFrom` + `reason` (никогда молча). `deep` без бюджета **или** с окном
  `< 512k` понижается до `standard` с причиной.
- `profileLabel(profile)` — короткая метка для UI.

Функция зависит только от `(requested, window, budget)` — ни от хода, ни от часов,
поэтому не вносит вариативности в cache-friendly стабильный префикс.

### Конфиг — `packages/opencode/src/config/config.ts`

- Новое поле `context_profile` (`compact|standard|deep`, опционально).
- При загрузке конфига несовместимая пара (`deep` без `budget.max_tokens`) даёт
  предупреждение (`warnings`, path `context_profile`) — «rejected» на уровне
  профиля: runtime-резолвер такую пару не активирует, а понижает до `standard`.

### Бюджетирование окна — `packages/opencode/src/nocowboy/session/overflow.ts`

- `NoCowboySessionOverflow.limit()` учитывает `context_profile`:
  - `deep` поднимает порог до 90% окна на модели ≥512k, но никогда не выше
    `usable` (= `limit.input − reserved`);
  - `compact` сужает окно до 50%;
  - без профиля поведение прежнее (`threshold_percent` или 80%);
  - при понижении `deep → standard` пишется причина в лог (`nocowboy.context-profile`).

### Токен-бюджет (AC: ход останавливается)

`budget.max_tokens` уже проводится через `evaluateBudget`/`decideBudget` и
`NoCowboySessionPrompt.applyBudget`, который при превышении падает
`BudgetExceededError`. Тесты: `test/nocowboy/budget.test.ts`,
`test/nocowboy/budget-apply.test.ts`.

### Наблюдаемость — `.../tui/feature-plugins/sidebar/context.tsx`

Секция Context показывает активный профиль рядом с занятостью окна
(`Context · Deep` + `N tokens` + `N% used`); профиль резолвится той же чистой
функцией из конфига и текущего окна модели.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/context-profile.test.ts
bun test test/nocowboy/session/overflow.test.ts
bun test test/nocowboy/config/config.test.ts
bun run typecheck
```

Покрыто: валидация пары профиль/бюджет; `deep` → 90% на ≥512k; клампинг по
`usable`; понижение `< 512k` и без бюджета с причиной; `compact` 50%;
неизменность поведения без профиля; turn-independent резолв (стабильный префикс);
декодирование `context_profile` + предупреждение при `deep` без бюджета.

## Что осталось за рамками (отдельная фича)

Спека `.nocowboy/specs/deep-context-2m.md` описывает также **отбор содержимого**
(repomap → затронутые файлы → память, вместо сваливания), учёт стоимости cache-read
и автоматический выбор профиля по размеру задачи. Это отдельные дизайн-пункты;
предметная реализация профиля-бюджетирования здесь завершена. Их следует оформить
и реализовать отдельным пунктом роадмапа.
