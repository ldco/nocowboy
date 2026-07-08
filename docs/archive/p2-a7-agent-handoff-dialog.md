# P2-A7 — Agent Handoff TUI Dialog

**Status:** Proposed | **Roadmap ref:** P2-A7 (new) | **Effort:** Medium | **Blocker for:** Dogfooding UX

---

## Problem

When an agent completes and calls `plan_exit`, the follow-up uses the generic `Question.ask()` API. The result is a plain text prompt at the bottom of the TUI with clickable list items:

```
? Ready to implement?
  > Start new session — Implement in a fresh session with a clean context
    Continue here — Implement the plan in this session
```

This is indistinguishable from any other question prompt. It lacks:
1. **Visual impact** — doesn't look like an important transition moment
2. **Context** — doesn't show the plan file name or agent information
3. **Rich options** — no "Edit handoff prompt" or "Assign to different agent"

In kilocode, the `plan_exit` transition is a **full-screen dialog** similar to the permission prompt, showing:
- Who is handing off (architect agent)
- What is being handed off (plan file path)
- Where to go next (code agent, ralph agent, etc.)
- One-click to start the new session

**Current state check**: The `PlanFollowup` system (553 lines) works correctly. It uses `Question.ask()` which renders a bottom-of-screen prompt. The plumbing works — what's missing is the **TUI presentation layer**.

```
Current flow:
  plan_exit → shouldAskPlanFollowup() → PlanFollowup.ask() → Question.ask()
  → TUI shows generic question prompt at bottom
  → User clicks "Start new session" or "Continue here"
  → New session created + code agent started

Desired flow:
  plan_exit → shouldAskPlanFollowup() → PlanFollowup.ask() → DEDICATED DIALOG
  → TUI shows rich handoff dialog (full-screen, like permission dialog)
  → User clicks "Implement with Code agent" or selects different agent
  → New session created + target agent started
```

---

## Decision

Replace the generic `Question.ask()` prompt in `PlanFollowup.prompt()` with a **dedicated HandoffDialog TUI component** that renders:

```
┌─ Plan Complete ───────────────────────────────────────────────┐
│                                                                │
│  Architect agent completed the plan:                           │
│                                                                │
│  docs/plans/p2-c1-agent-audit.md                               │
│                                                                │
│  Handover summary:                                             │
│  Found 21 agents across 3 layers. 2 critical name collisions   │
│  (plan, explore). 4 immediate fixes identified.                │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Switch to Code agent to implement                     ▲│   │
│  │ Switch to Ralph agent to execute PRD                  █│   │
│  │ Continue refining with Architect                      █│   │
│  │ Edit handoff prompt...                                ▼│   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  [Enter] Confirm  [Esc] Cancel  [e] Edit prompt                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Matches permission dialog pattern** — same visual weight, full-screen, brand color, keyboard shortcuts
2. **Shows agent transition** — "Architect → Code" or "Architect → Ralph"
3. **Shows plan file path** — so user knows what's being implemented
4. **Shows handover summary** — the generated handover text (already working in `generateHandover()`)
5. **Supports custom target agent** — not hardcoded to "code"
6. **Supports editing the handoff prompt** — user can modify before submitting

---

## Architecture

### Component Tree

```
PermissionPrompt (existing, reference pattern)
  ├── Header: "Permission required"
  ├── Body: tool info, diff, patterns
  ├── Options: [Allow once] [Allow always] [Reject]
  └── Footer: keyboard shortcuts

HandoverDialog (NEW)
  ├── Header: "Plan Complete" + agent transition badge
  ├── Body: plan file path + handover summary
  ├── Options: target agents (scrollable list)
  └── Footer: [Confirm] [Cancel] [Edit prompt]
```

### Files to Create

| # | File | Purpose |
|---|---|---|
| 1 | `src/cli/cmd/tui/routes/session/handover.tsx` | HandoverDialog component |
| 2 | `src/cli/cmd/tui/component/handover-dialog.tsx` | Reusable dialog wrapper (or inline) |

### Files to Modify

| # | File | Change |
|---|---|---|
| 3 | `src/nocowboy/plan-followup.ts` | Replace `Question.ask()` in `prompt()` with custom dialog; add `dialog` parameter to `ask()` |
| 4 | `src/nocowboy/session/prompt.ts` | Pass dialog function through `askPlanFollowup()` |
| 5 | `src/session/prompt.ts` | Wire `plan_followup` dialog in `runLoop()` |
| 6 | `src/cli/cmd/tui/routes/session/index.tsx` | Register HandoverDialog route |
| 7 | `src/cli/cmd/tui/routes/session/permission.tsx` | (reference only — copy styling patterns) |

---

## Implementation Plan

### Step 1 — Create HandoverDialog Component

Location: `packages/opencode/src/nocowboy/cli/cmd/tui/routes/session/handover.tsx`

Following the exact same patterns as `permission.tsx`:

```tsx
// Props
interface HandoverProps {
  planFile: string           // "docs/plans/p2-c1-agent-audit.md"
  fromAgent: string          // "architect"
  handoverSummary: string    // generated handover text
  targetAgents: { name: string; description: string }[]  // available agents
  onSelect: (targetAgent: string, editedPrompt?: string) => void
  onCancel: () => void
}

// States
type HandoverStage = "select" | "edit-prompt" | "confirming"
```

### Step 2 — Replace Question.ask() in PlanFollowup

In `plan-followup.ts`, change `prompt()`:
- Instead of `input.question.ask()` with generic question options
- Emit a `plan_followup` event through the Bus
- The TUI listens for this event and shows HandoverDialog
- The dialog's `onSelect` callback resolves the promise

```ts
// NEW: Dialog-based prompt
function prompt(input: { sessionID; planFile; fromAgent; abort; bus }) {
  return new Promise((resolve) => {
    const id = Identifier.ascending("handover")
    bus.publish("plan_followup", { id, sessionID, planFile, fromAgent })
    // Listen for reply via bus event
    const unsub = bus.subscribe("plan_followup.replied", (event) => {
      if (event.id === id) { unsub(); resolve(event.action) }
    })
  })
}
```

### Step 3 — Wire in runLoop

In `session/prompt.ts`, the `askPlanFollowup()` already returns `"continue" | "break"`. The change is in `PlanFollowup.ask()` — switching from `Question.ask()` to the custom dialog. No change needed to the `runLoop` caller.

### Step 4 — Generate Handover Text

Already implemented! `generateHandover()` in `plan-followup.ts:102-155` uses the compaction agent to summarize the planning session. This text is currently injected into the new session but NOT shown to the user in the dialog. We display it in the HandoverDialog body.

---

## Agent Handoff Protocol (Generic)

Currently `plan_exit` only handles `plan → code`. Extend to support `{from_agent} → {any_target_agent}`:

### Config Schema Addition

```jsonc
{
  "agent": {
    "architect": {
      "handoff": {
        "targets": ["code", "ralph", "prd"],  // allowed target agents
        "default": "code"                        // pre-selected target
      }
    },
    "prd": {
      "handoff": {
        "targets": ["ralph", "code"],
        "default": "ralph"
      }
    }
  }
}
```

### plan_exit Metadata

The `plan_exit` tool already accepts `{ path: string }`. Extend:

```ts
export const Parameters = Schema.Struct({
  path: Schema.optional(Schema.String),
  target: Schema.optional(Schema.String).annotate({
    description: "Suggested target agent for implementation handoff"
  }),
})
```

---

## Verification Checklist

- [ ] `plan_exit` triggers HandoverDialog (not generic question) in TUI
- [ ] Dialog shows plan file path, from-agent, handover summary
- [ ] "Start new session" creates session with target agent, injects plan + handover
- [ ] "Continue here" switches current session to target agent, injects plan
- [ ] "Edit handoff prompt" opens text input, modified prompt is used
- [ ] Dialog is keyboard-navigable (Enter to confirm, Esc to cancel)
- [ ] Dialog matches permission dialog styling (brand color, layout)
- [ ] Works with all planning agents (architect, plan, prd)
- [ ] Custom target agent from `plan_exit` metadata is respected
- [ ] Agent `handoff.targets` config restricts available targets
- [ ] No regression in existing plan follow-up behavior
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes

---

## Rollback

If the dialog breaks, fall back to `Question.ask()` — the existing prompt code is kept as a fallback path behind a feature flag:

```ts
const useDialog = Flag.NOCOWBOY_HANDOFF_DIALOG ?? true
if (!useDialog) return legacyQuestionPrompt(input)
```

---

## Merge Conflict Note

New files (`handover.tsx`) are NoCowboy-owned — no conflict risk. The `plan-followup.ts` and `session/prompt.ts` changes go behind `nocowboy_change` markers following the fork isolation rule.
