# Attestation: YandexGPT / GigaChat провайдеры
**Пункт ROADMAP:** v0.10.0 — YandexGPT/GigaChat провайдеры
**Агент:** code (deepseek-v4-flash)
**Дата:** 2026-07-09
**Вердикт:** FAIL — Один критический критерий не выполнен

## Критические критерии
- ✅ [check #1]: Провайдер yandexgpt в openai-compatible-profile.ts — профиль существует, baseURL = https://llm.api.cloud.yandex.net/v1
- ❌ [check #2]: GigaChat OAuth — НЕ РЕАЛИЗОВАН. Только профиль добавлен, но нет механизма получения access token через client credentials grant. Без этого GigaChat не может отправлять запросы.

## Некритические критерии
- ❌ [check #3]: Русские ответы — не проверялось, нет тестов

## Доказательства
- `packages/llm/src/providers/openai-compatible-profile.ts` — строки `yandexgpt` и `gigachat`
- `packages/llm/src/providers/openai-compatible.ts` — экспорт `gigachat` и `yandexgpt`
- `packages/opencode/src/session/system.ts` — детекция yandex/gigachat в Russian Language Pack
- GigaChat OAuth требует отдельного файла `gigachat-auth.ts` с client credentials flow, которого нет

## Риски
- Пользователь, указавший GigaChat в конфиге, получит ошибку аутентификации
- YandexGPT должен работать с IAM токеном в Authorization: Bearer header, не тестировалось
