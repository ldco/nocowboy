# @nocowboy/i18n — стабильные ключи и разрешение локали

Ядро локализации переведено на **стабильные ключи**: собственные панели
(usage-сайдбар, кастомный сайдбар сессии) больше не содержат английских
user-facing литералов, а чистая функция разрешает активный язык из двух
источников. Отказ от phrase-fallback для собственных панелей — первый шаг,
`packages/ui/**` остаётся отдельной точкой локализации.

## Ключи вместо литералов

`packages/opencode/src/nocowboy/ui/i18n.ts` получил восемь новых ключей,
заполненных в **обоих** словарях (`ru`, `en`):

- `sidebar.usage`, `sidebar.usage.input`, `sidebar.usage.output`,
  `sidebar.usage.cached`, `sidebar.usage.terminalBench`,
  `sidebar.usage.completion`, `sidebar.usage.costPerAttempt`
- `sidebar.share`

Потребители переводят через `t(...)`:

- `packages/opencode/src/nocowboy/plugins/sidebar-usage.tsx` — заголовок и строки
  метрик («Token Usage», «Input», «Output», «Cached», «Terminal Bench 2.0»,
  «Completion», «Cost / attempt») заменены на `t("sidebar.usage*")`. Источник
  данных мастера (`useLocal` + `getUsage`/`formatCount` + `fmtScore`/
  `fmtAttemptCost`) сохранён.
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` —
  `[+ New Session]` → `[+ {t("sidebar.newSession")}]`, `[ Share ]` →
  `[ {t("sidebar.share")} ]`.

## Чистое разрешение локали — `packages/opencode/src/nocowboy/ui/language.ts`

```ts
resolveLanguage({ tui?, config?, fallback? }): Language
```

Приоритет: **TUI-конфиг (`tui`)** → **синхронизированный конфиг проекта
(`config`)** → **`fallback` → `en`**. Неподдерживаемые значения на любом уровне
игнорируются. Функция тотальна и свободна от SolidJS, поэтому тестируется без
рантайма. `isLanguage`/`LANGUAGES`/`DEFAULT_LANGUAGE` экспортируются рядом.

`packages/opencode/src/nocowboy/cli/cmd/tui/context/i18n-bridge.tsx` использует
`resolveLanguage({ config })`. Схема TUI на мастере ещё не имеет поля `lang`
(это отдельный пункт `lang-switcher-ui`), поэтому сейчас читается только
синхронизированный конфиг проекта; при появлении `tui.lang` он подставляется как
`tui`.

## Локаль в ключе кэша агентов

`packages/opencode/src/nocowboy/agent/index.ts`: `cacheKey(cfg)` теперь включает
`lang: cfg.lang` — смена языка перестраивает агентов (промпты выбираются по
`lang`), а равные локали дают равный ключ.

## Ключевые файлы

- `packages/opencode/src/nocowboy/ui/language.ts` — чистое разрешение локали.
- `packages/opencode/src/nocowboy/ui/i18n.ts` — ключи и словари RU/EN.
- `packages/opencode/src/nocowboy/plugins/sidebar-usage.tsx` — usage-панель.
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` — сайдбар сессии.
- `packages/opencode/src/nocowboy/agent/index.ts` — ключ кэша с `lang`.
- `packages/opencode/src/nocowboy/cli/cmd/tui/context/i18n-bridge.tsx` — провайдер.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/i18n
bun test test/nocowboy/tui-language
bun run typecheck
```

Мысленные тесты: полнота словаря (каждый ключ непуст в обоих языках),
разрешение локали (tui > config > default), локаль в ключе кэша агентов,
RU→EN→RU, **literals guard** — чтение исходников сайдбаров и проверка, что
захардкоженных литералов нет, а ключи присутствуют.

## За рамками

Полный отказ от phrase-fallback, `RequestContext`-локализация runtime-промптов,
поле `lang` в схеме TUI (`lang-switcher-ui`) и поверхность `packages/ui/**` —
отдельные пункты.
