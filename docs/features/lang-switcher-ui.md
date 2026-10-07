# Lang switcher — переключатель ru/en в TUI

Язык интерфейса TUI теперь — первоклассная настройка: его можно задать в
`tui.json` (`lang`), он разрешается раньше synced-конфига, а живое переключение
из сайдбара продолжает работать.

## Что сделано

### Исправлен контракт (было)

`I18nProvider` уже существовал, `lang` был только в `nocowboy.json`, а
`i18n.tsx` в комментарии обещал «читает lang из TuiConfig», хотя фактически
читал synced config. Теперь обещание выполнено.

### TuiConfig — `packages/opencode/src/cli/cmd/tui/config/tui-schema.ts`

В `TuiInfo` добавлено поле `lang: Schema.optional(Schema.Literals(["ru","en"]))`
с описанием: язык для этого TUI, переопределяет язык проекта.

### Ядро (чистое) — `packages/opencode/src/nocowboy/ui/language.ts`

- `LANGUAGES` = `["ru","en"]`, `DEFAULT_LANGUAGE` = `"en"`.
- `isLanguage(value)` — тип-гард.
- `resolveLanguage({ tui, config, fallback })` — приоритет:
  1. TuiConfig (`tui.json`);
  2. synced project config (`nocowboy.json`, его пишет переключатель);
  3. дефолт `en`.
  Неподдерживаемые значения на любом уровне игнорируются.

### Мост — `packages/opencode/src/nocowboy/cli/cmd/tui/context/i18n-bridge.tsx`

`NoCowboyI18n` резолвит язык через `resolveLanguage({ tui: useTuiConfig().lang,
config: sync.data.config?.lang })`. Мост уже внутри `TuiConfigProvider` и
`SyncProvider`, поэтому оба источника реактивны.

### Переключатель

`LanguageRow` (`.../component/language-row.tsx`, смонтирован в сайдбаре) пишет
`lang` в config и обновляет sync — живое переключение ru/en сохраняется.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/tui-language.test.ts
bun run typecheck
```

Покрыто: приоритет TuiConfig над config; фолбэк на config; дефолт `en`; игнор
неподдерживаемых значений; `isLanguage`; схема `TuiInfo` принимает `ru`/`en` и
отвергает прочее.
