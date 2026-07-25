# DeepSeek Cost Fix — v0.11.0

## Что сделано

### 1. Prompt caching для DeepSeek

**Файл:** `packages/opencode/src/provider/transform.ts`
**Изменение:** Добавлен `promptCacheKey = sessionID` для прямых вызовов DeepSeek через `@ai-sdk/openai-compatible`.

**Механизм:** Все запросы одной сессии направляются на один GPU-шард (session affinity), что позволяет DeepSeek API использовать автоматическое prefix-caching KV-кэша. Второй и последующие запросы в сессии не пересчитывают общий префикс.

**До:** Только OpenRouter и Venice имели `promptCacheKey`.
**После:** `@ai-sdk/openai-compatible` провайдеры, содержащие "deepseek" в ID, также получают `promptCacheKey`.

**Ожидаемая экономия:** 50-70% на input-токенах после первого запроса в сессии.

### 2. Agent model fallback

**Файл:** `packages/opencode/src/nocowboy/agent/index.ts`
**Изменение:** Все 5 хардкоженных `model: { providerID: "deepseek", ... }` заменены на вызов `resolveAgentModel()` с цепочкой fallback.

**Цепочка:**
1. `nocowboy.json agent.<name>.model` — специфичная модель для агента
2. `nocowboy.json model` — глобальная модель по умолчанию
3. Хардкоженный fallback (deepseek) — если ничего не сконфигурировано

**До:** Агенты падали с `ProviderModelNotFoundError` если DeepSeek не сконфигурирован.
**После:** Агенты используют любой сконфигурированный провайдер из конфига.

### 3. Preflight cost estimation

**Файл:** `packages/opencode/src/session/llm.ts`
**Изменение:** Перед каждым `streamText()` логируется estimated cost запроса.

**Оценка:** `input_tokens = chars / 4 * 1.3` (грубая), `output_tokens = maxOutputTokens`, с учётом peak pricing (×2 в пиковые часы DeepSeek).

**До:** Стоимость была известна только после выполнения запроса.
**После:** Каждый вызов логирует `preflight cost estimate` с предполагаемой стоимостью.

### 4. Cost cap (checkBudget)

**Файл:** `packages/opencode/src/nocowboy/session/index.ts`
**Изменение:** Добавлен `checkBudget(cumulativeCost, maxCostPerSession)` — возвращает `"ok"` | `"warn"` | `"exceeded"`.

**Пороги:** По умолчанию $5 max, предупреждение при 80%.
**Интеграция с остановкой сессии:** Не реализована (требует session-level изменений в промпт-менеджере).

### 5. HTTP Recorder (VCR-кэш)

**Файл:** `packages/http-recorder/src/index.ts`
**Изменение:** Реализован из заглушки в рабочий файловый VCR-кэш.

**Режимы:**
- `RECORD=true` — записывает HTTP-ответы в `.http-cassettes/`
- `REPLAY=true` — воспроизводит из кассет, падает при miss
- `bypass` (по умолчанию) — pass-through без сайд-эффектов

**Компоненты:**
- `hasCassetteSync(cassette, { directory })` — проверка существования кассеты
- `Cassette.fileSystem({ directory })` — JSON-хранилище `{ read, write }`
- `recordingLayer(cassette, opts).wrapFetch(fetch)` — fetch-прокси с записью/воспроизведением
- Хеширование запросов: SHA256(url + method + body)

---

## Файлы изменений

| Файл | Добавлено | Удалено | Описание |
|------|-----------|---------|----------|
| `packages/opencode/src/provider/transform.ts` | +11 | 0 | promptCacheKey для DeepSeek |
| `packages/opencode/src/nocowboy/agent/index.ts` | +22 | -7 | Agent model fallback |
| `packages/opencode/src/session/llm.ts` | +37 | 0 | Preflight cost estimation |
| `packages/opencode/src/nocowboy/session/index.ts` | +16 | 0 | checkBudget хелпер |
| `packages/http-recorder/src/index.ts` | +142 | -59 | HTTP Recorder реализация |
| `docs/analysis/deepseek-cost-20x-audit.md` | +229 | 0 | Аудит проблемы |
| `docs/plans/deepseek-cost-20x-fix.md` | +229 | 0 | План реализации |

## Верификация

- `bun run typecheck` — `@nocowboy/llm` проходит (раньше падал). `nocowboy-tui` — pre-existing ошибки.
- `bun test test/session/compaction*.test.ts` — 56 pass, 0 fail
- `bun test` LLM golden tests — 5 pass, 30 skip

## Известные ограничения

1. **Cost cap не интегрирован с остановкой сессии** — `checkBudget()` хелпер добавлен, но требуется доработка SessionPrompt для прерывания сессии при превышении бюджета.
2. **DeepSeek prefix-caching** — использует автоматическое кэширование API (без явных `cache_control` маркеров). Если DeepSeek требует явных маркеров, потребуется дополнительная работа.
3. **HTTP Recorder** — не подключён к production-коду (только для тестов). Для интеграции требуется обёртка fetch.
