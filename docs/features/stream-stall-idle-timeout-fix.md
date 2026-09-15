# Stream-stall watchdog fix — TTFT и межсобытиечный idle разделены (v0.12.1)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Провайдерный stream-watchdog (`withIdleTimeout`) применял один бюджет 300s и к
ожиданию **первого события**, и к паузам **между событиями**. На большом контексте
prefill легитимно занимает минуты — watchdog абартил здоровые запросы, и сессия
умирала с "LLM stream idle timeout: no event for 300000ms" независимо от провайдера
и модели (воспроизведено на двух). Второй дефект: ошибка сталла была plain Error,
`SessionRetry.retryable()` её не распознавал → вместо авто-повтора сессия халтилась
и требовала ручного «continue».

Фикс:
1. Раздельные бюджеты: `stream_idle_timeout_ms` (300s, между событиями) и
   `stream_first_event_timeout_ms` (600s, time-to-first-event; env
   `NOCOWBOY_STREAM_FIRST_EVENT_TIMEOUT_MS`; 0 = фаза выключена).
2. Стабильный маркер `STREAM_IDLE_MARKER` + `isStreamIdleFailure()` — единый источник
   распознавания сталла; `retryable()` возвращает retry-статус «Provider stalled …
   retrying» до ветки APIError, независимо от обёртки ошибки.

## Key files

- `packages/opencode/src/nocowboy/session/stream-idle.ts` — два бюджета, маркер
- `packages/opencode/src/nocowboy/session/watchdog.ts` — резолвер + default 600s
- `packages/opencode/src/session/retry.ts` — сталл помечен retryable
- `packages/opencode/src/session/llm.ts` — провязка обоих бюджетов
- `packages/opencode/src/config/config.ts` — `stream_first_event_timeout_ms`
- `packages/opencode/src/effect/runtime-flags.ts` — env override

## Verification

- Tests: `bun test test/nocowboy/session/stream-idle.test.ts test/nocowboy/session/watchdog.test.ts test/session/retry.test.ts` → 44 pass / 0 fail
- Typecheck: `bun run typecheck` → clean
- Регрессии покрыты: медленный первый токен выживает (slowStart > idleMs, < firstEventMs);
  stall после первого события ловится tight-бюджетом; резолвер TTFT = 600_000;
  `retryable()` ретраит сталл в plain Error и в APIError-обёртке.
