# @nocowboy/i18n — стабильные ключи, locale context, отказ от phrase fallback

Локализация TUI через словарь со стабильными ключами. Собственные панели
переведены на ключи (убраны хардкод-литералы), locale участвует в кэше агентов,
словари RU/EN проверяются на полноту.

## Что сделано

### Словарь — `packages/opencode/src/nocowboy/ui/i18n.ts`

Добавлены ключи: `sidebar.usage`, `sidebar.usage.input`, `sidebar.usage.output`,
`sidebar.usage.cached`, `sidebar.usage.terminalBench`, `sidebar.usage.completion`,
`sidebar.usage.costPerAttempt`, `sidebar.share` — с переводами RU и EN.
Тип `Strings = Record<I18n.Key, string>` + `const ru/en: Strings` **компиляторно**
гарантируют полноту: новый ключ без перевода → ошибка типа.

### Собственные панели переведены на ключи

- `nocowboy/plugins/sidebar-usage.tsx`: «Token Usage / Input / Output / Cached /
  Terminal Bench 2.0 / Completion / Cost / attempt» → `t("sidebar.usage…")`.
- `cli/cmd/tui/routes/session/sidebar.tsx` (custom sidebar, `nocowboy_change`):
  `[+ New Session]` → `[+ {t("sidebar.newSession")}]`, `[ Share ]` →
  `[ {t("sidebar.share")} ]`.

### Locale в кэше агентов — `packages/opencode/src/nocowboy/agent/index.ts`

`cacheKey(cfg)` теперь включает `lang: cfg.lang` — смена языка перестраивает
агентов (промпты рендерятся на нужном языке).

### Тесты — `packages/opencode/test/nocowboy/i18n.test.ts`

- Полнота: каждый ключ есть в обоих языках и непустой.
- Новые ключи usage/share переведены в RU и EN.
- Гард: `sidebar-usage.tsx` не содержит хардкод-литералов, использует ключи.
- `cacheKey` меняется при смене lang; RU→EN→RU возвращает те же строки; два
  проекта с разными locale резолвятся независимо (`resolveLanguage`).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/i18n.test.ts
bun run typecheck
```
