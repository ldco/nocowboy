# Структурированный Handoff вместо текстового #route

> Roadmap id: `structured-handoff` — status is tracked in `docs/roadmap.json`.

## Description
The auto-router used to read a textual `#route: <agent> <description>` directive
out of the assistant's output. The internal representation is now a typed
`Handoff { target, reason, context, artifacts }`
(`packages/opencode/src/session/router.ts`), and the textual directive survives
only as a **compatibility adapter**.

- `parseHandoff(text)` — reads a fenced ```handoff JSON block or an inline
  `#handoff: { … }`; malformed JSON or a missing `target` → `null` (never throws).
- `normalizeHandoff(value)`, `renderHandoff(handoff)` (the canonical block; round-trips).
- `routeToHandoff(route)` — maps the legacy `RouteDirective` onto the Handoff.
- `parseHandoffAny(text)` — the one entry point: structured handoff if present,
  else the legacy `#route:` directive adapted, else `null`.

`session/prompt.ts` now resolves the handoff with `parseHandoffAny(...)` and uses
`handoff.target` as the `agentOverride`, so a structured handoff and the legacy
`#route:` both work (behaviour for the latter is unchanged).

## Key files
- `packages/opencode/src/session/router.ts`
- `packages/opencode/src/session/prompt.ts`

## Verification
- `bun test test/nocowboy/session-router.test.ts` — 11 pass (structured parse,
  malformed → null, render round-trip, legacy adapter, parseHandoffAny preference).
- `bun run typecheck` — clean.
