# Provider balance: OpenRouter

The TUI shows the remaining balance for supported providers. OpenRouter is now
one of them.

- Endpoint: `GET https://openrouter.ai/api/v1/credits` (custom base URLs are
  tolerated, with or without the `/api/v1` suffix).
- Reported value: `total_credits - total_usage`, floored at 0.
- 5-minute in-memory cache, shared with the other providers.

## Routing fix

`findBalanceDescriptor` now prefers a **direct provider-id match** over a
model-name match. Without this, a user running `deepseek/*` models *through*
OpenRouter saw the DeepSeek balance instead of their OpenRouter credits.

## Files

- `packages/opencode/src/nocowboy/provider-balance.ts`
- `packages/opencode/test/nocowboy/provider-balance.test.ts`
