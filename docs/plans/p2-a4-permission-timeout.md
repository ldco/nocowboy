# P2-A4 — Permission Timeout (Auto-Deny After N Seconds)

**Status:** Proposed | **Roadmap ref:** P2-A4 | **Source:** Claude Code | **Effort:** Low

---

## Problem

When a permission prompt appears in the TUI, the agent loop blocks **indefinitely** until the user clicks "Allow" or "Reject". If the user steps away, the entire session stalls. Autonomous workflows (CI, scheduled runs, background agents) are impossible because every tool call with `"ask"` permission becomes a deadlock.

**Root cause**: The `Permission.ask()` function in `packages/opencode/src/permission/index.ts` creates a `Deferred` promise and publishes a `permission.asked` bus event. It then blocks on `Deferred.await(deferred)` with **no timeout**. The deferred is only resolved/rejected when the user manually responds via the TUI dialog or API.

## Decision

Add a configurable **permission timeout**: after N seconds of no user response, auto-deny the permission request ("reject"). The timeout is race-condition-safe: whichever completes first (user response or timeout) wins, and the other is a no-op.

### Config

```jsonc
{
  // Seconds before auto-denying permission prompts.
  // 0 or absent = wait indefinitely (default, backward-compatible).
  "permission_timeout": 30
}
```

### Behavior

| Scenario | Timeout set | User action | Result |
|---|---|---|---|
| User responds before timeout | 30s | Clicks "Allow once" at 12s | Allowed immediately |
| No user response | 30s | (away) | Auto-rejected at 30s, agent continues |
| Timeout disabled | 0 (default) | (away) | Blocked forever (current behavior) |

---

## Architecture

### Layer 1 — Config Schema (`packages/opencode/src/config/config.ts`)

Add `permission_timeout` to the root `Info` schema:

```ts
permission_timeout: Schema.optional(Schema.NullOr(NonNegativeInt)).annotate({
  description:
    "Seconds before auto-denying permission prompts. 0 (default) or absent = wait indefinitely.",
}),
```

**Placement**: Next to the existing `permission` field (line ~320), or under `experimental` temporarily if we want to iterate before promoting it.

### Layer 2 — Permission Service (`packages/opencode/src/permission/index.ts`)

Inject the timeout into the `ask()` function. Current flow:

```
ask(input) → check rules → needsAsk? → create Deferred → publish Event.Asked → await Deferred
```

New flow:

```
ask(input) → check rules → needsAsk? → create Deferred → publish Event.Asked
  → if (timeout > 0):
      race: [ Deferred.await, sleep(timeout) → auto-reply("reject") ]
    else:
      await Deferred (unchanged)
```

**Key code change** (in `ask()`, after `yield* bus.publish(Event.Asked, info)`, ~line 280):

```ts
// NEW: permission timeout
const timeoutSeconds = (yield* config.get()).permission_timeout ?? 0

const awaitReply = Deferred.await(deferred)

const effect = timeoutSeconds > 0
  ? Effect.race(awaitReply, Effect.sleep(`${timeoutSeconds} seconds`).pipe(
      Effect.andThen(() => {
        if (!pending.has(id)) return Effect.void // already replied
        return reply({ requestID: id, reply: "reject" })
      }),
      Effect.catchAll(() => Effect.void), // race loser, ignore
    ))
  : awaitReply

return yield* Effect.ensuring(effect, Effect.sync(() => { pending.delete(id) }))
```

**Why `Effect.race` + `reply()` instead of `Deferred.fail()`**: The `reply()` function handles proper cleanup (bus event, draining other pending requests). Directly failing the deferred bypasses this.

**Why check `pending.has(id)` before auto-reply**: The user might click just before the timeout fires. In that case, `reply({requestID: id, reply: "reject"})` would be a no-op (it checks `pending.get(input.requestID)` which would already be deleted).

### Layer 3 — TUI Dialog (`packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx`)

When timeout is active, show a countdown timer in the permission dialog. The request metadata will carry `timeout_seconds` and the dialog renders a live countdown.

**Pass timeout via metadata in `permission/index.ts` `ask()`:**

```ts
const info = Schema.decodeUnknownSync(Request)({
  id,
  ...request,
  metadata: {
    ...request.metadata,
    ...(isProtected ? { [ConfigProtection.DISABLE_ALWAYS_KEY]: true } : {}),
    ...(timeoutSeconds > 0 ? { timeout_seconds: timeoutSeconds } : {}), // NEW
  },
})
```

**TUI change**: In the `PermissionPrompt` component, read `props.request.metadata?.timeout_seconds`. If present, render a countdown with `setInterval` that ticks down each second. When it hits 0, dismiss the dialog.

**Minimal TUI change**: The dialog already supports `setStore("stage", ...)`. A simple countdown text line suffices:

```tsx
<Show when={timeout() > 0}>
  <text fg={theme.textMuted}>
    Auto-rejecting in {timeout()}s...
  </text>
</Show>
```

### Layer 4 — TypeScript SDK (if needed)

The `PermissionRequest` type in the SDK v2 already has `metadata: Record<string, unknown>`. No schema change needed — just document the new `timeout_seconds` metadata key.

---

## Options Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **1. Timeout in Permission Service (chosen)** | Single source of truth, works for TUI + CLI + API, race-condition-safe | Extra `config.get()` call per `ask()` | ✅ Best |
| 2. Timeout only in TUI dialog | Simpler, no backend change | Doesn't work for CLI/`--auto` mode, doesn't work for API clients, no protection if TUI crashes | ❌ |
| 3. Global `Effect.timeout` wrapping entire agent loop | One line | Kills the *session* on timeout, not just the permission. Overkill. | ❌ |

---

## Trade-Off Analysis

| Dimension | Risk | Rationale |
|---|---|---|
| **Functional Suitability** | ✅ Low | Adds exactly the described behavior |
| **Reliability** | ✅ Low | `Effect.race` is well-tested in Effect. Already used in the agent loop. |
| **Performance** | ✅ Low | One extra `config.get()` per `ask()`, no measurable overhead |
| **Security** | ⚠️ Medium | Auto-deny could mask real security concerns. Mitigation: clearly visible countdown in TUI, logged to session. |
| **Maintainability** | ✅ Low | Isolated to 3 files with clear markers |
| **Compatibility** | ✅ Low | `0` or absent = no timeout = existing behavior. Fully backward-compatible. |

---

## Implementation Plan

### Files to Modify

| # | File | Change | Lines |
|---|---|---|---|
| 1 | `packages/opencode/src/config/config.ts` | Add `permission_timeout` field to `Info` schema | +5 |
| 2 | `packages/opencode/src/permission/index.ts` | Inject timeout into `ask()`: read config, race deferred vs sleep, auto-reply reject | +15 |
| 3 | `packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx` | Render countdown timer from `timeout_seconds` metadata | +15 |

### Step-by-Step

1. **Add config field** — `config.ts`: Add `permission_timeout` to schema, next to `permission`
2. **Inject timeout in ask()** — `permission/index.ts`: In `ask()`, after publishing event, race the deferred await against a sleep-then-reply. Pass `timeout_seconds` in request metadata.
3. **Countdown in TUI** — `permission.tsx`: Read `timeout_seconds` from request metadata, render ticking countdown with `setInterval`
4. **Typecheck** — `bun run typecheck`
5. **Test** — `bun test` (ensure no regressions in permission tests)
6. **Dogfood** — Set `permission_timeout: 10` in `nocowboy.json`, start a session, trigger a permission prompt, verify countdown and auto-deny

---

## Verification Checklist

- [ ] `permission_timeout: 0` or absent — permission prompt waits indefinitely (backward-compatible)
- [ ] `permission_timeout: 10` — countdown appears in TUI dialog, auto-rejects at 0
- [ ] User clicking "Allow once" before timeout works correctly (no double-reply)
- [ ] User clicking "Reject" before timeout works correctly
- [ ] Timeout works in CLI `--auto` mode (`nocowboy run --auto`)
- [ ] Timeout works for API clients (HTTP `/permission` endpoint)
- [ ] Agent loop continues after auto-deny (does not crash, does not hang)
- [ ] Config reloads correctly (changing `permission_timeout` takes effect on next `ask()`)
- [ ] No TypeScript errors (`bun run typecheck` passes)
- [ ] No test regressions (`bun test` passes)

---

## Rollback

Feature is purely additive. Remove the `permission_timeout` field from config, or set it to `0`. No migration needed.

---

## Merge Conflict Note

This change touches shared upstream files (`config/config.ts`, `permission/index.ts`, `permission.tsx`). The plan follows the **kilocode fork isolation rule**: NoCowboy-specific additions go behind `nocowboy_change` markers. The `permission_timeout` field in config is a NoCowboy addition and should be marked with `// nocowboy_change`.
