# План: устранение переплаты за DeepSeek API (20×)

**Дата:** 2026-07-25
**Статус:** Выполнен (4 из 5 потоков в git — HTTP Recorder в .gitignore, изменения на диске)
**Цель:** Структурно решить проблему переплаты за DeepSeek API через 4 рабочих потока

---

## Поток 1: Prompt Caching для DeepSeek

### 1.1 Добавить `promptCacheKey` для прямых DeepSeek-вызовов

**Файл:** `packages/opencode/src/provider/transform.ts`
**Функция:** `options()` (~строка 1074)

**Текущее состояние:** prompt_cache_key устанавливается только для OpenRouter (стр. 1218) и Venice (стр. 1214), но НЕ для прямых вызовов DeepSeek через `@ai-sdk/openai-compatible`.

**Изменение:** После блока с `openrouter` и `venice` добавить:
```typescript
// DeepSeek direct: pin all session requests to same GPU for KV-cache hits.
// DeepSeek API supports automatic prefix caching — no explicit markers needed,
// but session affinity via promptCacheKey routes to the same shard.
if (
  input.model.api.npm === "@ai-sdk/openai-compatible" &&
  input.model.api.id.toLowerCase().includes("deepseek")
) {
  result["promptCacheKey"] = input.sessionID
}
```

**Верификация:**
- Проверить что `promptCacheKey` передаётся в опциях для DeepSeek
- Замерить latency второго запроса — должен быть ниже первого

### 1.2 Оптимизация system-prompt для кэширования DeepSeek

**Файл:** `packages/opencode/src/session/llm.ts`

**Текущее состояние:** System prompt собирается как 2 части (стр. 131-162): header (статический) + всё остальное. Это правильная структура для кэширования, но для DeepSeek она не используется.

**Изменение:** Не требуется. Текущая 2-частная структура уже оптимальна — header будет кэшироваться автоматически при включении promptCacheKey (1.1).

### 1.3 Включить OpenAI-style prompt caching маркеры (опционально)

**Исследовать:** Поддерживает ли DeepSeek API явные маркеры кэширования типа OpenAI's `"ephemeral"` для `content[].cache_control`.

**Если да:** Добавить в `normalizeMessages()` (стр. 280-310) разбивку system-сообщений с `cache_control: { type: "ephemeral" }` для статических частей.

**Статус:** Отложить до подтверждения поддержки DeepSeek. Приоритет: 1.1 достаточно для значительной экономии.

---

## Поток 2: Agent Model Fallback

### 2.1 Заменить хардкод DeepSeek на чтение из конфига

**Файл:** `packages/opencode/src/nocowboy/agent/index.ts`
**Функция:** `patchAgents()` (~строка 285-393)

**Текущее состояние:** 5 из 6 агентов захардкожены на DeepSeek:
- `code` → `{ providerID: "deepseek", modelID: "deepseek-v4-flash" }` (стр. 298)
- `nocowboy` → `{ providerID: "deepseek", modelID: "deepseek-v4-flash" }` (стр. 319)
- `debug` → `{ providerID: "deepseek", modelID: "deepseek-v4-flash" }` (стр. 354)
- `architect` → `{ providerID: "deepseek", modelID: "deepseek-v4-pro" }` (стр. 366)
- `auto` → `{ providerID: "deepseek", modelID: "deepseek-v4-flash" }` (стр. 378)

**Изменение:** Ввести хелпер `resolveAgentModel()`:

```typescript
/**
 * Resolve agent model with fallback chain:
 * 1. Agent-specific model from config (nocowboy.json agent.<name>.model)
 * 2. Default model from config (nocowboy.json model)
 * 3. Hardcoded fallback (existing behavior)
 */
function resolveAgentModel(
  cfg: Config.Info,
  agentName: string,
  defaults: { providerID: string; modelID: string }
): { providerID: string; modelID: string } {
  const agentCfg = cfg.agent?.[agentName]
  if (agentCfg?.model) {
    return Provider.parseModel(agentCfg.model)
  }
  if (cfg.model) {
    return { providerID: cfg.model.providerID, modelID: cfg.model.modelID }
  }
  return defaults
}
```

Заменить все 5 хардкодов на вызов `resolveAgentModel()`.

**Верификация:**
- `nocowboy.json` только с `kimi-for-coding` → агенты не падают, используют Kimi (resolveAgentModel находит kimi через cfg.model)
- `nocowboy.json` с `deepseek` → агенты используют DeepSeek
- `nocowboy.json` с `agent.code.model: "kimi-for-coding/kimi-k2-thinking"` → code-агент использует Kimi
- Без конфига вообще → агенты используют hardcoded fallback (deepseek)

---

## Поток 3: Preflight Cost Estimation + Cost Cap

### 3.1 Добавить preflight-оценку стоимости

**Файл:** `packages/opencode/src/session/llm.ts`
**Место:** Перед вызовом `streamText()` (~строка 440)

**Изменение:** Добавить вызов оценки и логирование:

```typescript
const estimatedCost = estimateRequestCost({
  model: input.model,
  messages: estimated,
  maxOutputTokens: params.maxOutputTokens,
  peakPricing: getPeakPricing(),
})
if (estimatedCost > 0) {
  l.info("preflight cost estimate", {
    estimated: estimatedCost.toFixed(4),
    peakMultiplier: getPeakPricing().multiplier,
  })
}
```

**Новая функция** `estimateRequestCost()`:

```typescript
export function estimateRequestCost(input: {
  model: Provider.Model
  messages: ModelMessage[]
  maxOutputTokens?: number
  peakPricing: { multiplier: number }
}): number {
  const costPerM = input.model.cost
  if (!costPerM) return 0
  
  const totalChars = input.messages.reduce((sum, m) => {
    if (typeof m.content === "string") return sum + m.content.length
    if (Array.isArray(m.content)) {
      return sum + m.content.reduce((s, part) => {
        if (part.type === "text") return s + part.text.length
        return s + 85 // ~1 token for non-text parts
      }, 0)
    }
    return sum
  }, 0)
  const estimatedInputTokens = Math.round((totalChars / 4) * 1.3)
  const estimatedOutputTokens = input.maxOutputTokens ?? 4096
  
  const inputCost = (estimatedInputTokens / 1_000_000) * (costPerM.input ?? 0)
  const outputCost = (estimatedOutputTokens / 1_000_000) * (costPerM.output ?? 0)
  
  return (inputCost + outputCost) * input.peakPricing.multiplier
}
```

**Верификация:**
- Лог содержит `preflight cost estimate` перед каждым вызовом
- При пиковой цене (×2) оценка удваивается

### 3.2 Cost Cap — остановка сессии по бюджету

**Файлы:** `packages/opencode/src/nocowboy/session/index.ts` + `packages/opencode/src/session/llm.ts`

**Изменение:**
1. Экспортировать кумулятивный подсчёт стоимости сессии из `NoCowboySession`
2. В `llm.ts` после получения usage — проверять превышение бюджета
3. При превышении — выбрасывать `BudgetExceededError`, который останавливает сессию

**Верификация:**
- Сессия останавливается при превышении лимита
- Без настройки `budget` поведение не меняется

---

## Поток 4: Включение HTTP Recorder

### 4.1 Реализовать файловое хранилище кассет

**Файл:** `packages/http-recorder/src/index.ts` (59 строк → ~200 строк)

**Изменение:** Реализовать `hasCassetteSync()` (чтение с диска), `Cassette.fileSystem()` (JSON файлы), `recordingLayer()` (перехват fetch с записью/воспроизведением).

**Верификация:**
- `RECORD=true` создаёт `.http-cassettes/*.json` файлы
- Повторный запуск читает из кассет без API-вызовов
- `typecheck` проходит

### 4.2 Интегрировать с LLM-тестами

**Файл:** `packages/llm/test/provider/golden.recorded.test.ts`

Убедиться что тесты работают без API-ключей при наличии кассет.

---

## Порядок выполнения

| # | Поток | Описание | Зависимости | Ожидаемая экономия |
|---|-------|---------|-------------|-------------------|
| 1 | 1.1 | promptCacheKey для DeepSeek | Нет | 50-70% input cost |
| 2 | 2.1 | Agent model fallback | Нет | Защита от падений |
| 3 | 3.1 | Preflight cost estimation | Нет | Предотвращение сюрпризов |
| 4 | 3.2 | Cost cap (budget) | 3.1 | Hard limit на сессию |
| 5 | 4.1 | HTTP Recorder реализация | Нет | До 100% для тестов |

---

## Итоговый верификационный чек-лист

- [ ] `bun run typecheck` — без ошибок
- [ ] `bun test` в `packages/opencode` — все тесты проходят
- [ ] `bun test` в `packages/llm` — все тесты проходят
- [ ] `promptCacheKey` в опциях DeepSeek-запросов
- [ ] Агенты запускаются с любым сконфигурированным провайдером
- [ ] Preflight cost пишется в лог
- [ ] HTTP-recorder создаёт и читает кассеты

---

## Риски

| Риск | Вероятность | Смягчение |
|------|-------------|-----------|
| DeepSeek API не поддерживает promptCacheKey | Низкая | Проверить документацию; fallback — только preflight check |
| Изменение agent models ломает существующие сессии | Средняя | Сохранить hardcoded fallback; модель сохраняется в БД сессии |
| HTTP Recorder замедляет тесты | Низкая | Включать только при `RECORD=true` или `REPLAY=true` |
| Cost cap прерывает легитимные сессии | Средняя | Настраиваемый порог в конфиге |
