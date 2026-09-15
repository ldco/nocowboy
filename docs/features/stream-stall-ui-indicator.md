# Индикатор provider stall в TUI (v0.12.2)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description

Тишина провайдера во время стрима выглядела как обычный спиннер «модель думает».
Пользователи жали Esc вслепую за секунды до того, как watchdog сам абартил запрос
(9 сталлов за сутки, перед каждым — `session.prompt cancel` в логах).

Теперь `withIdleTimeout` после 60s молчания (или половины бюджета, что меньше)
шлёт `onStall{phase, stalledAt, budgetMs}`; процессор вешает `stall` на busy-статус
сессии; TUI рендерит warning-баннер: `Provider is slow to respond — waiting for first
token — aborting in 534s` с живым обратным отсчётом. Первый прибывший ивент снимает
индикатор. Между событиями — `Provider stopped responding`.

## Key files

- `packages/opencode/src/nocowboy/session/stream-idle.ts` — StallInfo, STALL_WARN_MS, наблюдатели
- `packages/opencode/src/session/status.ts` — busy.stall (опционально, обратно совместимо)
- `packages/opencode/src/session/llm.ts` — StreamInput.onStall/onStallClear
- `packages/opencode/src/session/processor.ts` — EffectBridge.fork → status.set
- `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` — countdown-баннер
- `packages/sdk/js/src/v2/gen/types.gen.ts` + `packages/sdk/openapi.json` — поле stall

## Verification

- `bun test test/nocowboy/session/stream-idle.test.ts` → наблюдатель: 1 warn на паузу,
  фаза, снятие при возобновлении, быстрый стрим не шумит (46 pass в наборе watchdog-тестов)
- `bun run typecheck` → clean (server + TUI + SDK types)
- `bun test test/session/retry.test.ts test/server/httpapi-instance.test.ts` → green
