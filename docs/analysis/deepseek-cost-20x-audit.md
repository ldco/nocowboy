# Аудит: решена ли проблема переплаты за DeepSeek API в 20 раз?

**Дата:** 2026-07-25
**Статус:** 🟡 ЧАСТИЧНО — проблема смягчена, но структурно не решена
**Контекст:** анализ всей кодовой базы NoCowboy на предмет механизмов снижения стоимости LLM-вызовов

---

## Краткий вердикт

| Аспект | Статус | Детали |
|--------|--------|--------|
| Промпт-кэширование для DeepSeek | 🔴 НЕТ | `cache-policy.ts` поддерживает только Anthropic/Bedrock протоколы |
| Семантический кэш ответов | 🔴 НЕТ | Идентичные запросы всегда идут к API |
| Дедупликация запросов | 🔴 НЕТ | Параллельные одинаковые вызовы не объединяются |
| HTTP-recorder (VCR-кэш) | 🔴 ОТКЛЮЧЕН | Пакет `http-recorder` — заглушка, `hasCassetteSync() → false` |
| NoCowboy Gateway (прокси-слой) | 🔴 ЗАГЛУШКА | `createNoCowboy() { return { models: [] } }` |
| Retry-контроль | 🟢 ДА | `maxRetries: 0` по умолчанию — повторные вызовы отключены |
| Peak-pricing индикатор | 🟢 ДА | Показывает ×2 пиковые часы DeepSeek в TUI |
| Balance-мониторинг | 🟢 ДА | Цветной индикатор остатка средств (🟢🟡🔴) |
| Подсчёт стоимости | 🟢 ДА | Decimal.js, tiered pricing, provider-reported cost |
| Смена провайдера на Kimi | 🟡 ДА | `nocowboy.json` → только `kimi-for-coding` |

---

## Детальный анализ

### 1. Что значит «20× переплата»?

Гипотеза (не подтверждена прямым упоминанием в коде, но выводится из архитектуры):

**Источник №1 — reasoning-токены DeepSeek**
- DeepSeek-R1/V3/V4 генерируют цепочки рассуждений (reasoning tokens)
- Код `session/session.ts:450-452`: `TODO: charge reasoning tokens at the same rate as output tokens`
- Reasoning-токены тарифицируются по output-цене (самой дорогой)
- Один вызов может сгенерировать 10K+ reasoning-токенов, каждый из которых оплачивается как output
- Итог: 20× дороже, чем ожидалось (input-цена была бы 20× дешевле output-цены)

**Источник №2 — отсутствие prompt-кэширования**
- DeepSeek использует OpenAI-совместимый API (`@ai-sdk/openai-compatible`)
- `cache-policy.ts:42` включает кэширование только для `anthropic-messages` и `bedrock-converse`
- Каждый вызов заново отправляет system prompt (до 10K токенов) и историю диалога
- Без кэширования: N вызовов × полный контекст = линейный рост стоимости
- С кэшированием: первый вызов платит полную цену, остальные — копейки (0.1× для cache read)

**Источник №3 — agent-loop**
- Каждый шаг агента (tool call → result → next call) добавляет контекст
- Без сжатия контекст растёт экспоненциально
- Compaction существует (`compaction.ts`) но работает на уровне сессии, не на уровне отдельного запроса

### 2. Что реализовано (смягчение)

#### 2.1 Peak Pricing Detection
Файл: `packages/opencode/src/nocowboy/provider-balance.ts:162-239`

```typescript
// Peak hours UTC: 01:00-04:00, 06:00-10:00 — цены ×2
const PEAK_WINDOWS = [
  { start: 1, end: 4 },
  { start: 6, end: 10 },
]
```

Индикатор `×2 peak` / `×1 normal` показывает текущий режим в TUI. Но это **только индикатор** — не предотвращает вызовы в пиковые часы.

#### 2.2 Token Cost Optimization (v0.7.6)
Коммит: `d44b2532d` — «Token Cost Optimization + Identity Scoping»

Изменения:
- Repomap watcher-based cache (mtime `.git/index` вместо 30-секундного таймера)
- `soul.txt` сокращён на 71% (3,449 → 980 символов)
- Soul/identityAnchor только для nocowboy-агента (code/debug/etc получают чистый инжиниринг)
- Auto-dream: обязательное сохранение в NUTAUSIK memory при завершении сессии

#### 2.3 Retry Control
`session/llm.ts:500`: `maxRetries: input.retries ?? 0` — по умолчанию 0.
Транспортный слой (`executor.ts`) имеет `MAX_RETRIES = 2`, но в production используется AI SDK напрямую (минуя `llm`-пакет), поэтому retry не применяется.

#### 2.4 Смена провайдера по умолчанию
`nocowboy.json` конфигурирует только `kimi-for-coding` (Moonshot API) с ценами:
- Input: $0.6 / 1M токенов
- Output: $2.5 / 1M токенов

Это значительно дешевле DeepSeek API (где output может достигать $10+ / 1M для reasoning-моделей).

**Однако:** агенты в коде жёстко привязаны к DeepSeek:
- `code` → `deepseek-v4-flash`
- `debug` → `deepseek-v4-flash`
- `architect` → `deepseek-v4-pro`
- `nocowboy` → `deepseek-v4-flash`

Модель разрешается через цепочку: `input.model ?? ag.model ?? currentModel(sessionID)`. Если провайдер `deepseek` не сконфигурирован в `nocowboy.json`, вызов `getModel("deepseek", "deepseek-v4-flash")` упадёт с `ModelNotFoundError`. Это значит, что агенты либо:
1. Не работают (если DeepSeek не настроен отдельно)
2. Работают через fallback-механизм `defaultModel()`

### 3. Что НЕ решено (структурные проблемы)

#### 3.1 DeepSeek prefix-cache optimization — НЕ СДЕЛАНО
ROADMAP: `⬜ DeepSeek prefix-cache optimization ❓`

DeepSeek API поддерживает prefix caching (как и OpenAI), но код не включает `cache_control` маркеры для DeepSeek-вызовов. `cache-policy.ts` захардкожен только для Anthropic/Bedrock.

**Необходимо:**
- Добавить `cache_control: { type: "ephemeral" }` для system-частей DeepSeek-запросов
- Разбивать system prompt на кэшируемые блоки (tools, instructions, static context)
- Использовать `prompt_cache_key` для роутинга на один GPU (уже есть для OpenRouter/Venice, но не для прямого DeepSeek)

#### 3.2 HTTP Recorder отключён
`packages/http-recorder/src/index.ts` — полная заглушка:
```typescript
export function hasCassetteSync(...): boolean { return false }
export function recordingLayer(...): any { return {} }
```

VCR-стиль запись/воспроизведение ответов мог бы:
- Кэшировать ответы для детерминированных запросов (system prompt + tools)
- Экономить до 100% стоимости для повторных идентичных вызовов
- Использоваться в тестах без API-ключей

#### 3.3 NoCowboy Gateway не functional
`packages/nocowboy-gateway/src/provider.ts`:
```typescript
export async function createNoCowboy() { return { models: [] } }
```

Gateway должен был стать прокси-слоем с:
- Централизованным кэшированием
- Rate limiting
- Балансировкой между провайдерами
- Мониторингом стоимости в реальном времени

Но на данный момент это заглушка — весь трафик идёт напрямую к провайдерам.

#### 3.4 Preflight cost estimation отсутствует
Перед каждым вызовом нет оценки стоимости. `NoCowboySessionOverflow.measure()` проверяет только контекстное переполнение, но не бюджет.

#### 3.5 Семантический кэш отсутствует
Одинаковые tool results (например, `read_file` одного и того же файла разными агентами) всегда повторно отправляются в LLM. Нет LRU-кэша «запрос → ответ».

### 4. Сравнение: было vs стало

| Метрика | Было (до v0.7.6) | Стало (сейчас) |
|---------|-------------------|----------------|
| System prompt размер | ~3,449 символов | ~980 символов (−71%) |
| Repomap пересборка | Каждые 30 сек | По mtime `.git/index` |
| Soul для всех агентов | Да | Только nocowboy-агент |
| Retry при ошибках | До 2 повторов | 0 повторов (AI SDK) |
| Провайдер по умолчанию | DeepSeek (дорогой) | Kimi (дешёвый, $0.6/$2.5) |
| Peak pricing visible | Нет | Да (×2 индикатор) |
| Balance monitoring | Нет | Да (🟢🟡🔴) |
| Prompt caching (DeepSeek) | Нет | Нет |
| Response caching | Нет | Нет |
| Gateway прокси | Нет | Заглушка |
| Cost cap / бюджет | Нет | Нет |
| Preflight cost check | Нет | Нет |

### 5. Рекомендации (в порядке приоритета)

1. **Включить prompt caching для DeepSeek** — самый быстрый выигрыш. Добавить `cache_control` маркеры в system-части через `providerOptions.openaiCompatible`. Ожидаемая экономия: 50-90% на input-токенах (все вызовы после первого в сессии).

2. **Восстановить http-recorder** — для детерминированных сценариев (инициализация сессии, загрузка tools). Экономия: до 100% для повторных идентичных вызовов.

3. **Добавить preflight cost estimation** — показывать примерную стоимость запроса ДО отправки. Использовать `estimate(input) = chars/4` с 1.3× множителем.

4. **Реализовать cost cap** — `stopWhen: totalCost > $budget`. Прерывать сессию при превышении лимита.

5. **Согласовать agent models с конфигом** — если `nocowboy.json` имеет только Kimi, агенты не должны падать при попытке использовать DeepSeek. Нужен fallback на первый доступный reasoning-провайдер.

6. **Разморозить NoCowboy Gateway** — минимальная реализация: кэширующий прокси перед DeepSeek API с TTL 5-30 минут для одинаковых (system, tools) префиксов.

---

## Вывод

**Проблема переплаты за DeepSeek API структурно НЕ РЕШЕНА.** Приняты тактические меры (сжатие промптов, отключение retry, смена дефолтного провайдера на Kimi, peak pricing индикатор), но корневые причины — отсутствие prompt caching для DeepSeek, отсутствие response caching, отсутствие gateway-слоя — остаются неисправленными.

**Текущая стратегия:** избегать DeepSeek в пользу Kimi (Moonshot). Это работает пока DeepSeek не сконфигурирован. Но агенты в коде всё ещё захардкожены на DeepSeek — это мина замедленного действия при добавлении DeepSeek-провайдера в конфиг.

**Фактический статус:** 🟡 проблема смягчена обходным путём (смена провайдера), но архитектурно не решена.
