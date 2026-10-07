# ProviderPort — baseURL/proxy/TLS на границе + конвертация shared-схемы

Balance-фетчеры (DeepSeek/Kimi/OpenRouter) собирали собственный `fetch` и
безусловно передавали `tls: { rejectUnauthorized: false }` — транспортный
workaround протёк в домен: «принимать любой сертификат» стало контрактом
по умолчанию для каждого провайдера. Заодно каждый фетчер сам нормализовал
`baseURL`. ProviderPort заводит единую границу транспорта и конвертирует
внешнюю схему models.dev в доменные типы на краю, не пропуская
`Record<string, unknown>` внутрь.

## Что сделано

### Граница транспорта — `packages/opencode/src/nocowboy/provider/port.ts`

- `ProviderTransportPolicy` (`baseURL`, `proxy`, `insecureTLS`) и `ProviderPort`.
- `normalizeBaseURL` — trim + срез хвостовых `/`; пусто → `undefined`.
- `resolveProviderPort({ id, baseURL?, proxy?, insecureTLS?, env? })`:
  - proxy по приоритету: явный → `NOCOWBOY_PROXY` → `HTTPS_PROXY`/`https_proxy`
    → `HTTP_PROXY`/`http_proxy`;
  - `insecureTLS` — ТОЛЬКО явный opt-in (`insecureTLS: true` или
    `NOCOWBOY_INSECURE_TLS=1`). По умолчанию поля нет.
- `requestInit(port, headers)` — `tls.rejectUnauthorized: false` добавляется
  ТОЛЬКО при opt-in; дефолтный порт не содержит ключа `tls` вообще (проверка
  сертификата остаётся включённой). `proxy` пробрасывается, если задан.
- `joinURL(baseURL, fallbackHost, path)` — base порта, иначе fallback-хост.

### Домен — конвертация shared-схемы на границе

- Три разделённых типа вместо одного блоба: `CapabilityMetadata`
  (toolCall/reasoning/attachment/temperature), `GenerationProtocol`
  (`openai|anthropic|google|unknown` + `generationProtocolOf(api)`) и
  `BillingInfo` (`currency`+`status`+`amount`).
- `toModelDescriptor(raw, api?)` — валидирует на границе (кидает на «model.id»/
  «model.name») и возвращает доменный `ModelDescriptor`; внешние поля схемы
  дальше не текут.
- `toModelDescriptors(snapshot)` — обход снапшота; битые записи пропускаются.

### Провязка

- `packages/opencode/src/nocowboy/provider-balance.ts` — все три фетчера
  строят URL через `joinURL`/`resolveProviderPort` и `fetch` через
  `requestInit`; хардкод `tls: { rejectUnauthorized: false }` и три `as any`
  удалены. `buildDeepSeekURL` удалён (заменён портом).
- `packages/opencode/src/nocowboy/provider/models-snapshot.ts` —
  `loadModelsSnapshotFrom` возвращает `ModelDescriptor[]`, конвертируя shared
  snapshot на границе (тип `ModelsSnapshot = Record<string, unknown>` больше не
  выходит наружу).

## Проверка

```bash
cd packages/opencode
bun test test/nocowboy/provider/port.test.ts
bun test test/nocowboy/provider-balance.test.ts
bun test test/nocowboy/provider/models-snapshot.test.ts
bun run typecheck
```

Покрыто (AC4 — невакуумный тест): дефолтный `requestInit` не имеет ключа `tls`;
`rejectUnauthorized:false` появляется только при opt-in (флаг или env=«1», но не
«0»); приоритет proxy; сохранение baseURL через порт; протокол по api; разделение
capabilities/protocol/billing в `toModelDescriptor`; валидация «model.id»/«model.name»;
пропуск битых записей; конвертация снапшота в дескрипторы.

## Границы (честно)

Порт покрывает транспортный слой и конвертацию собственной offline-схемы
(`nocowboy/provider`). Runtime-граница models.dev → `Core.Model`
(`packages/core`) не дублируется — там уже есть своя схема. Offline-загрузчик
`loadModelsSnapshot()` на текущий момент не имеет production-потребителя (его
вызывает только тест) — это pre-existing состояние, не введённое этой задачей;
конвертация в дескрипторы тем не менее реальна (вызывается в границе загрузчика).
