# Dogfooding Day 1 — NoCowboy Fixed Itself

**2026-07-02 02:28 MSK** | **3 bugs found, 3 bugs fixed, 0 external tools used**

---

## The Bugs NoCowboy Found and Fixed on Day 1

### Bug 1 — NAME COLLISION: Config `explore` overrode native subagent

**Symptom:** `task` tool with `subagent_type: "explore"` crashed: "Agent 'explore' is a primary agent and cannot be used as a subagent"

**Root cause:** `~/.config/nocowboy/agent/explore.md` defined `mode: primary`, overriding the native `explore` agent (mode: subagent). The `task` tool delegates to subagents — it needs the native explore.

**Fix:** Deleted the config file. Native explore (subagent) unshadowed. The packaging template was also cleaned — `explore` removed from `packaging/config/nocowboy.json`.

### Bug 2 — NAME COLLISION: Config `plan` overrode native safety mode

**Symptom:** The `plan` agent had loose permissions instead of strict plan-file-only mode.

**Root cause:** `~/.config/nocowboy/agent/plan.md` defined `mode: primary` with full read/research permissions, overriding the native `plan` which has strict edit guards (planGuard/planEditGuard from `NocowboyAgent.patchAgents`).

**Fix:** Renamed config `plan.md` → `researcher.md` with `name: researcher`. Native `plan` safety mode restored. Packaging template updated.

### Bug 3 — SOLIDJS RENDER CRASH: `theme` used before initialization

**Symptom:** Clicking subagent trigger in TUI crashed: `ReferenceError: Cannot access 'theme' before initialization`

**Root cause:** `subagent-footer.tsx` declared `const balanceFg = createMemo(() => { ... theme.success ... })` 26 lines BEFORE `const { theme } = useTheme()`. In SolidJS dev mode, certain render paths trigger the memo before the component body has initialized `theme`.

**Fix:** Moved `useTheme()` above all memos that reference it (line 78, before `balanceFg` at line 90). Typecheck pass confirmed.

---

## System Files Modified

| File | Change |
|---|---|
| `~/.config/nocowboy/agent/explore.md` | Deleted |
| `~/.config/nocowboy/agent/plan.md` | Renamed to `researcher.md` |
| `packaging/config/nocowboy.json` | explore/plan removed, researcher added |
| `packages/opencode/src/.../subagent-footer.tsx` | `useTheme()` moved before consuming memos |

## What This Proves

NoCowboy can:

1. **Find its own bugs** — while being used to develop itself
2. **Diagnose them** — no external debugger, no kilocode, no stack overflow
3. **Fix them** — edit source files, rename, delete, refactor
4. **Verify** — typecheck passes, subagent works
5. **Document** — this file exists

This is the bootstrap loop. Self-hosting. Recursive. Real.

**Dogfooding is not a ceremony. It is the elimination of all external dependencies until the tool can only rely on itself. That is where quality comes from.**

— Nikita, July 2, 2026
