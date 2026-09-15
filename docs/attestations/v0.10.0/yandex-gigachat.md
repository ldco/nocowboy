# Attestation: YandexGPT / GigaChat провайдеры
**Пункт ROADMAP:** v0.10.0 — YandexGPT/GigaChat провайдеры
**Агент:** reviewer (deepseek-v4-pro)
**Дата:** 2026-09-15
**Вердикт:** PASS

## Критические критерии
- ✅ [check #1]: Провайдер `yandexgpt` — профиль `yandexgpt` в `openai-compatible-profile.ts`, baseURL `https://llm.api.cloud.yandex.net/v1`; покрыт `packages/llm/test/provider/openai-compatible-chat.test.ts` (семейство `yandexgpt`).
- ✅ [check #2]: GigaChat — Bearer auth + `RqUID` заголовок + OpenAI-compatible chat. `packages/llm/test/provider/gigachat.test.ts`: 4 pass / 0 fail, проверяются заголовки (Bearer, RqUID), тело запроса и tools.

## Некритические критерии
- ✅ [check #3]: `getAccessToken()` — OAuth 2.0 Client Credentials реализован и экспортирован: `packages/llm/src/providers/gigachat.ts:83` (`POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth`).
- ✅ [check #4]: Русские system prompt'ы — тесты провайдера проходят, русские строки присутствуют в наборе.

## Доказательства
- `bun test test/provider/gigachat.test.ts` → `4 pass / 0 fail` (13 expect).
- `packages/llm/src/providers/gigachat.ts` — `getAccessToken` (строка 83), `access_token` (строка 67), OAuth flow (строка 92).
- `packages/llm/src/providers/openai-compatible-profile.ts` — профили `yandexgpt` и `gigachat`.

## Риски
- OAuth-flow GigaChat не покрыт сетевым интеграционным тестом (только структура/подготовка запроса) — ограничение тестовой среды, не дефект кода.
