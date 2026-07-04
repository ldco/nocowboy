# Plan: Agent Quality Enforcement (3 items)

## Item 1: coherence_check auto-run at SessionStart

**What:** At the start of every session, NUTAUSIK automatically validates the agent's
plan against stored memory, decisions, and existing tasks. If conflicts exist, a
warning is injected into the system prompt.

**Why:** Agents drift over long sessions. coherence_check catches conflicts early.

**Files to modify:**
1. `src/session/system.ts` — add `nutausik_coherence_check` call in the env builder
2. Already done: `nutausik_coherence_check` MCP tool exists in NUTAUSIK v0.2.0

**Code change (system.ts, environment function):**
```typescript
// After context_inject call, add coherence check
const cohResult = yield* Effect.promise<string>(async () => {
  try {
    const res = await fetch("http://127.0.0.1:9210/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2,
        method: "tools/call",
        params: { name: "nutausik_coherence_check", arguments: { steps: [] } },
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return ""
    const data = await res.json() as { result?: { content?: Array<{ text?: string }> } }
    return data?.result?.content?.[0]?.text ?? ""
  } catch { return "" }
}).pipe(Effect.catch(() => Effect.succeed("")))
if (cohResult && !cohResult.includes("PASSED")) {
  envLines.push(cohResult)
}
```

---

## Item 2: /pause + /resume with HANDOFF

**What:** `/pause` saves current session context to NUTAUSIK handoff.
`/resume` loads from handoff and injects into system prompt.

**Files to modify:**
1. `src/nocowboy/session/prompt.ts` — add `context_inject` call that reads handoff
2. `/pause` command handler — calls `nutausik_handoff_save`
3. `/resume` command handler — calls `nutausik_handoff_load`

**Code change (system.ts env builder):**
```typescript
// After context_inject, check for handoff data
const handoff = yield* Effect.promise<string>(async () => {
  try {
    const res = await fetch("http://127.0.0.1:9210/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 3,
        method: "tools/call",
        params: { name: "nutausik_handoff_load" },
      }),
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return ""
    const data = await res.json() as { result?: { content?: Array<{ text?: string }> } }
    return data?.result?.content?.[0]?.text ?? ""
  } catch { return "" }
}).pipe(Effect.catch(() => Effect.succeed("")))
if (handoff && !handoff.includes("No handoff")) {
  envLines.push("## Previous Session Handoff\n" + handoff)
}
```

---

## Item 3: context_inject duplicates critical rules at END of prompt

**What:** Critical rules from AGENTS.md are injected AGAIN at the end of the
system prompt, right before the identity anchor. This ensures they're always in
the model's attention window regardless of session length.

**Which rules to duplicate (the 3 most critical):**
1. Forbidden Phrases — announce action → must follow with tool call
2. NEVER end with a question
3. STRICTLY FORBIDDEN Openings

**Files to modify:**
1. `src/session/system.ts` — add `criticalRules()` function after env builder
2. Insert critical rules block before `identityAnchor()` return

**Code change:**
```typescript
// In system.ts, before identityAnchor()
export function criticalRules() {
  return [
    "## CRITICAL RULES (repeated — always in focus)",
    "",
    "1. If you announce an action (\"I'll add X\", \"Сейчас сделаю\"),",
    "   your NEXT message MUST contain the tool call. No exceptions.",
    "2. NEVER end a response with a question or \"Want me to...\"",
    "3. NEVER start with: Great, Certainly, Okay, Sure, I see, Let me, Here is, Based on.",
    "4. Every bug is your bug. No \"pre-existing\" — only unfixed.",
    "5. Verify before declaring done. Typecheck, test, lint.",
  ].join("\n")
}
```

**System prompt order after change:**
```
soul()
provider(model)
env block (includes nutausik context + coherence + handoff)  
AGENTS.md
instructions
skills
criticalRules()  ← НОВОЕ: дублирует ключевые правила
identityAnchor()
```

---

## Implementation order

1. Item 3 first (critical rules injection) — simplest, biggest impact
2. Item 1 (coherence_check at SessionStart) — leverages existing NUTAUSIK tool
3. Item 2 (/pause + /resume) — requires command registration + handoff integration

All changes are in `src/session/system.ts` (environment builder) plus one new
function.
