# Deep Analysis: NoCowboy vs KiloCode Upstream — What We Broke

## Fork Lineage

```
OpenCode (github.com/anomalyco/opencode)
  └── KiloCode (github.com/kilo-org/kilocode)  ← upstream/main
       └── NoCowboy (github.com/ldco/nocowboy)  ← our fork
```

## The Golden Rule We Violated

KiloCode's `AGENTS.md` states:

> **Very important**: when planning or coding, update shared files with OpenCode as **last resort**!
> Everything is shared code from OpenCode, except folders that contain `kilo` in the name.
> Always look for ways to implement your feature or fix in a way that **minimizes changes to shared code**.

We violated this by **deleting upstream code** from shared files instead of hiding it.

---

## File-by-File Damage Report

### 1. `tips.tsx` — 🔴 BROKE upstream feature

| | Upstream KiloCode | Our NoCowboy |
|---|---|---|
| **View component** | Full component with `useBindings` registering `tips.toggle` command | **DELETED entirely** |
| **Tips rendering** | `<Show when={props.show}><Tips .../></Show>` — conditional | **DELETED** |
| **`tips.toggle` command** | Available in command palette + keybind | **BROKEN — command gone** |
| **Slot return** | `<View api={api} .../>` with memos | `return null` |
| **Imports** | `TuiPluginApi`, `createMemo`, `Show`, `Tips`, `useBindings` | Just `TuiPlugin` |

**What broke:**
- The `tips.toggle` command binding is gone. Users who configured this keybind get a dead command.
- The `home_bottom` slot returns null instead of a component — the tips architecture is gutted.

**Root cause:** We deleted the entire View component instead of just hiding the rendering.

**Correct approach:** Keep the View component + useBindings intact. Only suppress the visual output:
```tsx
return (
  <box width="100%" maxWidth={75} alignItems="center" flexShrink={1}>
    {/* nocowboy_change - tips disabled, space reclaimed */}
  </box>
)
```
Or even simpler — just remove `paddingTop={3}` and wrap Tips in `{false && ...}`.

---

### 2. `sidebar/footer.tsx` — 🟡 UNNECESSARY modification of shared code

| | Upstream KiloCode | Our NoCowboy |
|---|---|---|
| **path memo** | Present — computes dir + branch | **DELETED** |
| **path display** | `parent/name` split rendering | **DELETED** |
| **Global import** | Present | **DELETED** |
| **Branding** | "Kilo" | "NoCowboy" |

**What broke:** Nothing visible — this plugin registers at `order: 100` for `sidebar_footer`, but our NoCowboy plugin at `order: 99` wins `single_winner` mode. This code **never renders**.

**But:** We created unnecessary merge conflict surface. When upstream updates this file, we'll have conflicts on lines we didn't need to touch.

**Correct approach:** **DON'T TOUCH THIS FILE AT ALL.** Our `nocowboy/plugins/sidebar-footer.tsx` at order 99 already wins the `single_winner` slot. The upstream file is dead code for us.

---

### 3. `session/footer.tsx` — 🔴 BROKE upstream feature

| | Upstream KiloCode | Our NoCowboy |
|---|---|---|
| **`useDirectory` import** | Present | **DELETED** |
| **`directory` variable** | Present — `useDirectory()` | **DELETED** |
| **Directory display** | `<text fg={theme.textMuted}>{directory()}</text>` | **DELETED** |

**What broke:**
- The directory path display in the session footer is an **OpenCode core feature** (not a Kilo addition — no `kilocode_change` markers). We removed upstream functionality.
- The `useDirectory` import and variable are gone — if upstream adds code that references `directory`, merge will break silently.

**Correct approach:** Keep the import and variable. Hide the rendering with a marker:
```tsx
const directory = useDirectory()
// ...
{/* nocowboy_change - directory moved to /status info screen */}
{false && <text fg={theme.textMuted}>{directory()}</text>}
```

---

### 4. `dialog-status.tsx` — ✅ OK (small, clean addition)

Added VCS branch to the path display within existing `nocowboy_change` markers:
```tsx
{sync.data.vcs?.branch ? <span style={{ fg: theme.textMuted }}>:{sync.data.vcs.branch}</span> : null}
```
This is properly scoped and non-destructive.

---

### 5. `nocowboy/plugins/home-footer.tsx` — ✅ OK (our code)

Removed `Directory` component and `Global` import. This is a NoCowboy-only file (not in upstream). We own it, we can modify it freely.

---

### 6. `nocowboy/plugins/sidebar-footer.tsx` — ✅ OK (our code)

Removed `path` memo and path display. NoCowboy-only file. Free to modify.

---

## Architecture Understanding: The Slot System

```
home_footer     → single_winner  → Kilo(99) WINS over Upstream(100)
sidebar_footer  → single_winner  → Kilo(99) WINS over Upstream(100)
home_bottom     → renders ALL    → Tips(100) + WhichKey both render
session footer  → NOT a slot     → Direct component in session route
```

**Key insight:** For `single_winner` slots, we NEVER need to modify the upstream plugin. Our NoCowboy plugin at lower order wins automatically. The upstream code is dead code for us.

For `home_bottom` (renders all) and `session/footer.tsx` (direct component), we must modify with surgical precision — hide, don't delete.

---

## The Two Categories of Files

| Category | Path pattern | Can delete code? | Merge impact |
|---|---|---|---|
| **Shared (upstream)** | Everything NOT under `*/nocowboy/`, `*/kilocode/`, or `*/kilo*/` | ❌ NEVER delete. Hide with `{false && ...}` + markers | Every deletion = future merge conflict |
| **NoCowboy-owned** | `src/nocowboy/**`, `packages/kilo-*/` | ✅ Yes, freely | No merge impact |

---

## Remediation Plan

### Step 1: Revert `tips.tsx` to upstream structure
Keep View + useBindings + command registration. Only suppress the visual output. Remove `paddingTop` to reclaim space.

### Step 2: Revert `sidebar/footer.tsx` to upstream
`git checkout upstream/main -- packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` then apply ONLY the import rename (`@kilocode/plugin/tui` → `@nocowboy/plugin/tui`) and brand text changes.

### Step 3: Fix `session/footer.tsx` — keep useDirectory, hide display
Restore `useDirectory` import and variable. Wrap the display line in `{false && ...}` with nocowboy_change marker.

### Step 4: Keep `dialog-status.tsx` as-is
The VCS branch addition is clean and properly marked.

### Step 5: Keep NoCowboy-owned files as-is
`home-footer.tsx` and `sidebar-footer.tsx` under `nocowboy/plugins/` are fine.

---

## NoCowboy Fork Rules (going forward)

1. **NEVER delete code from shared upstream files.** Hide it: `{false && <Original />}`
2. **ALWAYS use `nocowboy_change` markers** when modifying shared files.
3. **For `single_winner` slots:** Don't touch the upstream plugin. Our NoCowboy plugin wins automatically.
4. **For direct components** (like session/footer.tsx): Keep imports, keep variables, only hide rendering.
5. **Keep upstream structure intact** so `git merge upstream/main` works cleanly.
6. **Add features in NoCowboy-owned directories** (`src/nocowboy/`, `packages/kilo-*/`).
