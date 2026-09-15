# YandexGPT / GigaChat провайдеры

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
YandexGPT: openai-compatible profile + тесты. GigaChat: отдельный провайдер (packages/llm/src/providers/gigachat.ts) с RqUID + Bearer auth + getAccessToken() OAuth helper + 4 unit-теста. Детекция в session/system.ts (modelId includes 'yandex'/'gigachat'/'yagpt').

## Key files
- `packages/llm/src/providers/gigachat.ts`
- `packages/llm/src/providers/gigachat.ts`
- `packages/llm/test/provider/openai-compatible-chat.test.ts`
- `packages/llm/test/provider/gigachat.test.ts`

## Verification
- File existence: ✅ tracked
- Attestation for overseer: ✅ required
