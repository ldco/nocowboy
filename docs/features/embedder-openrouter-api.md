# Индексация через API-эмбеддер OpenRouter (v0.13.0)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Ни один путь индексации не работал: Voyage API отдаёт `403` HTML **даже без ключа** и на
корень домена (блок на периметре, не квота — токены не помогли бы), а локальная Ollama
установлена CPU-only сборкой (в `/usr/lib/ollama` нет `libggml-cuda`) — батч из 60
сегментов занимал **104s** при таймауте **120s**, отсюда «Failed to process batch after
3 retries: Connection to embedding service failed (timeout)» и 64/2529 файлов.

Фикс: `indexing.provider = "openrouter"`, `model = "openai/text-embedding-3-small"`
(dim 1536, уже в нашем реестре), ключ — из `auth.json`. Блоки `voyage`/`ollama` удалены,
несовместимый индекс (365MB, 1024-dim) удалён. CPU и GPU не участвуют вообще.

## Key files

- `~/.config/nocowboy/nocowboy.jsonc` — блок `indexing` (provider/model/openrouter.apiKey)
- `packages/nocowboy-indexing/src/indexing/service-factory.ts:114` — сборка OpenRouter-эмбеддера
- `packages/nocowboy-indexing/src/indexing/model-registry.ts` — размерности и пороги моделей
- `packages/opencode/src/nocowboy/indexing.ts` — резолв провайдера и failover на Ollama

## Verification

- Живые вызовы с ключом из `auth.json`: `openai/text-embedding-3-small` → 200, dim 1536;
  `google/gemini-embedding-001` → 200, dim 3072; `qwen/qwen3-embedding-8b` → 200, dim 4096;
  `mistral codestral-embed` → 200, dim 1536
- Конфиг пропарсен (JSONC), бэкап `nocowboy.jsonc.bak-*` создан
- Старый индекс удалён: `~/.local/state/nocowboy/indexing`
- Ожидаемый результат после рестарта: 2529/2529 файлов, `ollama ps` пуст
