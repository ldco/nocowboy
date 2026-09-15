# Расширение реестра эмбеддингов — gemini-embedding-001 и qwen3-embedding-8b (v0.13.1)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Профиль `openrouter` в реестре моделей эмбеддингов получил две новые записи:

- `google/gemini-embedding-001` — dim **3072**, scoreThreshold 0.35
- `qwen/qwen3-embedding-8b` — dim **4096**, scoreThreshold 0.35

Обе модели выбираются через `indexing.model` — размерность и порог подтягиваются из
реестра автоматически, вручную указывать dimension не нужно.

## Key files

- `packages/nocowboy-indexing/src/indexing/model-registry.ts` — профиль `openrouter`
- `packages/nocowboy-indexing/test/kilocode/indexing/model-registry.test.ts` — покрытие (включая `getDefaultModelId`)

## Verification

- `bun test` (packages/nocowboy-indexing) → 469 pass / 9 skip / 0 fail, включая assertion на
  `getDefaultModelId` для openrouter
- `bun run typecheck` → clean
- `oxlint` → 0 errors
