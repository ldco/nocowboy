# Защита индексации от медленных эмбеддеров (v0.13.1)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Локальная Ollama на CPU живая, но медленная: замеренный прогон — **104s на батч из
60 сегментов** при таймауте запроса **120s**. Батч выглядел мёртвым, скан падал после
3 одинаковых ретраев: «Only 64 of 2529 files were indexed. Failed to process batch
after 3 retries: Connection to embedding service failed (timeout)».

Фикс — две ступени защиты, обе про объём работы в одном запросе, а не про таймаут:

1. **Provider-aware batch.** Локальные эмбеддеры (`ollama`) по умолчанию получают
   `LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD = 20` сегментов на батч вместо общего
   `BATCH_SEGMENT_THRESHOLD`. Каждый запрос детерминированно укладывается в плоский
   бюджет на любом железе; явный `indexing.embeddingBatchSize` пользователя всегда
   побеждает дефолт.
2. **Shrink-on-timeout.** Если батч всё равно упал по таймауту (`timeout` / `timed out` /
   `deadline`), скан не умирает: размер суб-батча делится вдвое и работа продолжается с
   того же смещения, вплоть до одного сегмента. Уменьшенный порог запоминается на
   сканере до конца скана — последующие флеши набирают меньшие батчи, а не заново
   нащупывают таймаут. Не-таймаутные (connection/auth) ошибки по-прежнему проваливают
   батч после `scannerMaxBatchRetries`.

Дополнительно: удаление изменённых файлов выполняется один раз перед первым upsert,
а не повторяется на каждом ретрае.

## Key files

- `packages/nocowboy-indexing/src/indexing/constants/index.ts` — `LOCAL_EMBEDDER_PROVIDERS`, `LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD`, `getDefaultBatchSegmentThreshold()`
- `packages/nocowboy-indexing/src/indexing/processors/scanner.ts` — `isBatchSizeRelatedError()`, пошаговый `processBatch` с shrink-on-timeout
- `packages/nocowboy-indexing/src/indexing/service-factory.ts` — провайдер-aware дефолт `config.embeddingBatchSize ?? getDefaultBatchSegmentThreshold(provider)`
- `packages/nocowboy-indexing/test/kilocode/indexing/processors/scanner.test.ts` — покрытие shrink-on-timeout
- `packages/nocowboy-indexing/test/kilocode/indexing/service-factory.test.ts` — покрытие провайдер-aware порога

## Verification

- `bun test` (packages/nocowboy-indexing) → 469 pass / 9 skip / 0 fail, включая новые
  кейсы: батч делится вдвое при таймауте и продолжается; уменьшенный порог запоминается;
  connection-ошибка не делит батч, а падает после `maxBatchRetries`
- `bun run typecheck` → clean
- `oxlint` → 0 errors

## Rationale

Именно ограничение объёма на запрос, а не растягивание таймаута: кап делает запрос
детерминированным и завершается внутри бюджета на любом железе, тогда как больший
таймаут лишь откладывает падение и позволяет реально зависшему сервису подвесить скан
на минуты. Практическая пропускная способность на быстрых локальных GPU не страдает —
это лишь несколько лишних HTTP-round-trip'ов к localhost.
