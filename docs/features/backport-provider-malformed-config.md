# Backport: терпимость provider config к malformed model entry

Узкий config-backport: одна кривая запись модели не должна ронять загрузку
конфига провайдера. Плохая запись **выбрасывается**, остальные модели остаются
доступны, а причина сообщается структурно.

## Проблема

`provider.<id>.models` декодируется строго (`ConfigParse.schema` бросает
`InvalidError` на любое невалидное поле). Опечатка в одной модели (например,
`cost.input` строкой вместо числа) валила **весь** конфиг — и провайдер, и
остальные модели.

## Что сделано

### Ядро (чистое) — `packages/opencode/src/nocowboy/config/provider-models.ts`

- `sanitizeProviderModels(raw)` — по каждой записи: `null` (маркер «выключено»)
  сохраняется; валидная запись проходит `Schema.decodeUnknownExit(ConfigProvider.Model)`
  и сохраняется; невалидная выбрасывается и попадает в `errors` с сообщением.
- `sanitizeProviderConfig(config)` — проходит `provider[*].models`, чистит их
  на месте и возвращает по ошибке на каждую выброшенную запись
  (`{provider, model, message}`).

### Провязка — `packages/opencode/src/config/config.ts`

`normalizeLoadedConfig` (pre-decode хук) вызывает `sanitizeProviderConfig` и
пишет структурное предупреждение `log.warn("provider model entry ignored —
malformed", {path, provider, model, message})` на каждую выброшенную запись.
После этого строгий decode проходит, а провайдер загружается с остальными моделями.

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/provider-models.test.ts
bun test test/nocowboy/config/config.test.ts
bun run typecheck
```

Покрыто: валидные записи и `null` сохраняются, невалидные выбрасываются с
сообщением; не-объектный вход → пустая карта; чистка по нескольким провайдерам;
отсутствие `provider`-блока ничего не ломает; интеграционно — конфиг с кривой
моделью грузится, `good` доступна, `bad` отсутствует.
