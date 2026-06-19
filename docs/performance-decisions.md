# Performance Decisions — NoCowboy TUI

## Principle

**Value-first optimization.** Never weaken a product feature for marginal performance gains. Every optimization must be measured against the product value it destroys.

---

## 1. Git Polling in TopBar (`nocowboy-bars.tsx`)

| | Before | After |
|---|---|---|
| Interval | 10s (original) | **10s (kept)** |
| CPU cost | ~1-3ms/s (two `execSync` calls) | Same |
| Product value | Responsive git info: branch, ⇡ahead, ⇢behind | Same |

**Decision:** Kept at 10s. Reverted the 60s interval.

**Rationale:** Two `execSync` calls cost ~10-30ms total every 10 seconds. On any modern CPU this is ~1-3ms/s — below the noise floor of normal system activity. The product value of responsive git status (ahead/behind counts updating within seconds of a push/pull/fetch) is real for active git users. At 60s the feature feels broken — stale git info undermines trust in the TopBar.

**Trade-off:** None of consequence. The CPU cost is negligible compared to rendering, I/O, and network activity in a typical TUI session.

---

## 2. Tips Slot Memos (`tips.tsx`)

| | Before | After |
|---|---|---|
| Reactive memos | 4 (`hidden`, `first`, `connected`, `show`) | **0** |
| CPU waste | Iterates all providers + all models on every state change | **None** |
| `tips.toggle` command | Registered via `useBindings` | **Preserved** |

**Decision:** Removed the 4 slot-level memos. The slot now passes static values to View.

**Rationale:** The View component returns null — no visual output. The 4 memos computed values that were never used. The `connected` memo in particular called `Object.values(item.models).some(...)` across every provider every time provider state changed. This was 100% waste with 0% product value. The `tips.toggle` command registration (via `useBindings` inside View) is preserved — users with keybindings still have a working command.

**NoCowboy_change marker:** `return null // nocowboy_change - no visual output, no wasted space`

---

## 3. Session Footer Directory (`session/footer.tsx`)

| | Before | After |
|---|---|---|
| Directory display | `<text fg={theme.textMuted}>{directory()}</text>` | `{false && <text .../>}` with nocowboy_change markers |
| `useDirectory` import | Present | **Preserved** |
| `directory` variable | `const directory = useDirectory()` | **Preserved** |

**Decision:** Hidden with `{false && ...}` markers. The `useDirectory` import and variable are kept for upstream merge compatibility.

**Rationale:** The directory display is an OpenCode core feature. We must not delete upstream code — only hide it with proper markers. The `useDirectory` createMemo is lazy (never called since wrapped in false), so no CPU cost.

---

## 4. Sidebar Path (upstream `sidebar/footer.tsx`)

**Decision:** Fully reverted to pre-commit state. No changes.

**Rationale:** This is a `single_winner` slot. Our NoCowboy plugin at order 99 wins over upstream at order 100. The upstream file never renders. There was zero reason to modify it.

---

## Upstream Code Rules

1. **Never delete** upstream code from shared files — hide with `{false && ...}` and `nocowboy_change` markers
2. **Keep imports and variables** that upstream code depends on — only suppress the visual output
3. **Don't touch `single_winner` upstream plugins** — our plugin wins automatically
4. **NoCowboy-owned files** (`src/nocowboy/**`) — free to modify, no merge impact
