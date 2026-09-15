# Совместимость с легаси-плагином и явный gateway baseUrl (v0.13.1)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Пакет был переименован из легаси-скоупа в `@nocowboy/indexing`, но пользователь (или
сохранённый конфиг) со старым specifier'ом должен продолжать получать индексацию.
Теперь и простой package specifier, и любой `node_modules`-путь канонизируются обратно:

- `kilo-indexing` / `@kilocode/kilo-indexing` → `@nocowboy/indexing`
- `node_modules/@kilocode/kilo-indexing` → `@nocowboy/indexing`
- `packages/kilo-indexing`, `packages/nocowboy-indexing` → `@nocowboy/indexing`

Вторым фиксом `KiloEmbedder` начал уважать явный `baseUrl`: раньше он отбрасывался и
всегда использовался `resolveNoCowboyGatewayBaseUrl()` из env/token. Теперь explicit
`baseUrl` побеждает, а нормализация канонического `/api/gateway/`-роута применяется в
обоих случаях.

Третий нюанс: `HEADER_FEATURE` / `HEADER_NOCOWBOY_ORGANIZATIONID` теперь импортируются
из `@nocowboy/gateway/api/constants`, а не из корневого barrel'а — корневой barrel
реэкспортирует lowercase-заглушку (`x-feature`), а не реальные заголовки.

## Key files

- `packages/nocowboy-indexing/src/detect.ts` — `LEGACY_PACKAGE_NAMES`, `canonicalPackageName()`
- `packages/nocowboy-indexing/src/indexing/embedders/kilo.ts` — `resolveNoCowboyGatewayBaseUrl({ baseURL: input.baseUrl })`, импорт констант из `api/constants`
- `packages/nocowboy-indexing/test/nocowboy/indexing/embedders/kilo.test.ts` — покрытие заголовков

## Verification

- `bun test` (packages/nocowboy-indexing) → 469 pass / 9 skip / 0 fail
- `bun run typecheck` → clean
- `oxlint` → 0 errors
