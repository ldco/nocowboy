# Sidebar Keyboard Scroll — Root Cause Analysis

## Problem
History tab keyboard navigation (↑↓) did not auto-scroll the list. Mouse scroll worked, but keyboard selection stayed invisible when moving beyond the viewport.

All attempts to make `scrollbox.scrollTo()` work failed until the correct approach was found.

## Failed Approaches (in order)

### 1. Direct assignment ref — `ref={historyScrollbox}` 
**Bug:** SolidJS refs require a **callback function**, not a variable.  
`ref={var}` assigns once during first render and never updates.  
**Fix:** `ref={(r: any) => (variable = r)}` — OpenTUI SolidJS needs callback form.

### 2. Block-body arrow in ref — `(r) => { ... }`
**Bug:** OpenTUI SolidJS only fires ref callbacks that use the **expression form** (no curly braces).  
`ref={(r: any) => { historyScrollbox = r }}` never fires.  
**Fix:** `ref={(r: any) => (historyScrollbox = r)}` — expression (comma-operator) works.

### 3. Component-level `let` variable for scrollbox ref  
**Bug:** SolidJS `<Show>` components reset `let` variables when the child unmounts/remounts.  
The ref was set to `true` → then 1ms later SolidJS fired the ref callback with `null`.  
Log showed: `ref.set=true` → `ref.set=false` at **same timestamp**.  
**Fix:** Move ref to **module-level** `let _historyScrollbox` — outside any component, immune to SolidJS lifecycle.

### 4. `setTimeout(() => ..., 0)` running too early  
**Bug:** The scrollbox ref was valid when `scrollTo` was called, but `setTimeout(0)` ran **after** SolidJS invalidated the ref.  
Log showed: `scrollTo(0) sb=true` → `ref.set=false` → `scrollTo.fire(0) sb=false`.  
**Fix:** Move `scrollTo` call from `setTimeout` to **synchronous** execution when ref is available.

### 5. `createEffect` re-sync triggered on every `selectedIdx` change  
**Bug:** Mouse hover changed `selectedIdx` → `createEffect` fired → `scrollTo()` fought mouse wheel scroll.  
Log showed: `mouse.over idx=13` → `scrollTo(13)` fighting natural scroll.  
**Fix:** Use `SolidJS.on(tab, ...)` to only fire on tab changes, not selection changes.

### 6. `useBindings` sharing the same `enabled` state for both tab and history bindings  
**Bug:** Up/down keys were registered in the `enabled: true` bindings with `if (tab() !== "history") return;` —  
the event was still CONSUMED even when returning early, blocking the session's scroll keys.  
**Fix:** Split into **two** `useBindings` calls:  
- Tab switching: `enabled: true` (left/right only)  
- History navigation: `enabled: tab() === "history"` (up/down/enter only)

### 7. Ref callback reset by SolidJS show/unmount cycle  
**Bug:** `<Show when={tab() === "history"}>` sets ref callback with `null` when remounting.  
The module-level ref was the correct fix — it survives any SolidJS lifecycle event.

## What Finally Works

1. **Module-level ref:** `let _historyScrollbox: any = undefined`  
2. **Expression-form ref callback:** `ref={(r: any) => (_historyScrollbox = r)}`  
3. **Synchronous scrollTo:** `setTimeout(() => _historyScrollbox?.scrollTo(next), 0)`  
4. **Separate bindings:** tab switching and history navigation in different `useBindings`  
5. **Logging preserved:** Module-level `log()` writes to `/tmp/nocowboy-sidebar.log`

## Debug Logging

- Module load: `console.log("SIDEBAR MODULE LOADED")` + file log  
- Keyboard: `key.up/down {from} -> {to} sb={ref status}`  
- Mount: `sidebar.mount sessionID=... overlay=...`  
- File: `/tmp/nocowboy-sidebar.log` — preserved permanently for dev  
