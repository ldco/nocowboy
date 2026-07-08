# P2-A1 — MCP Server Management UI + Init Fix

**Status:** Proposed | **Roadmap ref:** P2-A1, P2-C4 | **Blocker for:** Dogfooding

---

## Problem

`nocowboy init` creates `mcp: {}` (empty). The 12-server default config at `packaging/config/nocowboy.json` is never applied. No UI exists to manage MCP servers — users must edit JSON or use CLI. This blocks dogfooding: developers need MCP servers to work on NoCowboy inside NoCowboy.

### Root Cause Chain

1. `nocowboy init` (`src/cli/cmd/init.ts:73`) writes `mcp: {}` — empty
2. The packaging template (`packaging/config/nocowboy.json`) has 12 servers but is never loaded
3. No auto-start on first launch — user must run `nocowboy mcp start` manually
4. No Settings UI for enable/disable/add/remove — only CLI commands exist
5. No visual distinction between first-party (@nocowboy) and third-party servers

### Current State

```
~/.config/nocowboy/nocowboy.jsonc   → mcp: (not present)
/app/nocowboy.json                   → mcp: (not present)
packaging/config/nocowboy.json       → mcp: 12 servers (template, never loaded)
~/.nocowboy/mcp/                     → PID files from prior session, only context7 in ports.json
```

---

## ADR: MCP Server Taxonomy

### Context

The app ships with 12 MCP servers of two origins. Users need to distinguish them in UI and config.

### Decision

Add a `vendor` field to `ConfigMCP.Info` schema:

| Vendor | Meaning | Examples |
|--------|---------|----------|
| `"nocowboy"` | First-party — shipped with NoCowboy, published as `@nocowboy/mcp-<name>` | constitution, ralph, score-engine, ncp-validator, contract-guard, plugin-registry, puppetmaster |
| `"community"` | Third-party / foreign — external OSS servers | context7, sqlite, puppeteer, git |

### Options Considered

1. **Separate config keys** (`mcp.builtin` vs `mcp.external`) — complicates merge, hard to re-categorize
2. **`vendor` field on each server** (chosen) — simple, extensible, backward-compatible via optional field
3. **Separate config file** (`mcp-servers.json`) — fragments config, harder to sync with TUI

### Consequences

- ✅ UI can show origin badge (NoCowboy logo vs community icon)
- ✅ First-party servers get special treatment: auto-updated, guaranteed compatible
- ✅ Backward-compatible — existing configs without `vendor` default to `"community"`
- ⚠️ Schema change touches ConfigMCP, init.ts, and packaging template

---

## MCP Server Inventory

### First-Party (`vendor: "nocowboy"`) — 7 servers

| Server | Package | Port | Purpose |
|--------|---------|------|---------|
| `constitution` | `@nocowboy/mcp-constitution` | 9216 | AST code quality rules enforcement |
| `ncp-validator` | `@nocowboy/mcp-ncp-validator` | 9217 | Validate .ncp spec files before code |
| `contract-guard` | `@nocowboy/mcp-contract-guard` | 9218 | Detect breaking API changes |
| `score-engine` | `@nocowboy/mcp-score-engine` | 9219 | NoCowboy Score computation |
| `ralph` | `@nocowboy/mcp-ralph` | 9210 | PRD-driven task execution |
| `plugin-registry` | `@nocowboy/mcp-plugin-registry` | 9214 | Skill/plugin install/search/remove |
| `puppetmaster` | `@nocowboy/mcp-puppetmaster` | 9203 | PM framework operations (26 tools) |

### Third-Party (`vendor: "community"`) — 5 servers

| Server | Launch Command | Port | Purpose |
|--------|---------------|------|---------|
| `context7` | `npx -y @upstash/context7-mcp` | 9200 | Documentation search (20k+ libraries) |
| `sqlite` | `npx mcp-sqlite-server` | 9201 | Direct SQLite database access |
| `puppeteer` | `npx puppeteer-mcp-claude serve` | 9202 | Headless browser automation |
| `git` | `uvx mcp-server-git` | 9205 | Structured git operations |
| `tausik` | (not yet published) | 9204 | Project management / NUTAUSIK |

---

## Implementation Plan

### Phase 1: Schema Change — Add `vendor` Field

**Files:**
- `packages/opencode/src/config/mcp.ts` — add `vendor: Schema.optional(Schema.Literal("nocowboy", "community"))` to `LocalCanonical`, `LocalInput`, `Remote`

**Acceptance:**
- `vendor` field is optional, defaults to `"community"` when absent
- Existing configs without `vendor` continue to work
- ConfigMCP.Info type includes `vendor?: "nocowboy" | "community"`

### Phase 2: Fix `init.ts` — Populate Default MCP Servers

**File:** `packages/opencode/src/cli/cmd/init.ts`

**Change:** Replace `mcp: {}` with the full 12-server template from `packaging/config/nocowboy.json`, plus `vendor` field on each.

When the user opts into MCP (`startMcp === true`):
- Write all 12 servers to global config
- Each first-party server gets `vendor: "nocowboy"`
- Each third-party server gets `vendor: "community"`

When the user declines MCP:
- Write `mcp: {}` as before

**Acceptance:**
- `nocowboy init` with "Start MCP servers? Yes" → config has 12 servers with vendor tags
- `nocowboy init` with "Start MCP servers? No" → config has `mcp: {}`
- Servers in config match packaging template exactly

### Phase 3: Settings Tab — MCP Server List

**Files:**
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` — add MCP section to `SettingsTab`
- New file: `packages/opencode/src/nocowboy/cli/cmd/tui/feature-plugins/sidebar/mcp-settings.tsx` — MCP management component

**UI Design:**

```
┌─ Settings ─────────────────────────┐
│                                    │
│  Providers                         │
│  • anthropic  • deepseek           │
│                                    │
│  Code Indexing ──── Enabled ────── │
│  Open indexing configuration →     │
│                                    │
│  LSP ───────────── Enabled ─────── │
│  Click to disable                  │
│                                    │
│  MCP Servers ───── 7 of 12 running │  ← NEW SECTION
│  ┌────────────────────────────────┐│
│  │ ✓ constitution   nocowboy   🔵 ││  ← green=connected, vendor badge
│  │ ✓ score-engine    nocowboy  🔵 ││
│  │ ✓ context7        community 🟢 ││
│  │ ✗ puppeteer       community ⚫ ││  ← red=failed, grey=disabled
│  │ ○ tausik          community ⚫ ││  ← circle=not started
│  │ ...                            ││
│  │ [+ Add MCP Server]             ││  ← button opens add dialog
│  └────────────────────────────────┘│
│  Open MCP configuration →          │  ← link to full MCP dialog
└────────────────────────────────────┘
```

**Component behavior:**
- Read MCP config from `sync.data.config.mcp`
- Read MCP status from `sync.data.mcp?.status` (new sync field)
- Each row: status icon, server name, vendor badge, click to toggle enable/disable
- Click server name → expand to show: URL/command, tools count, restart button, remove button
- "[+ Add MCP Server]" → opens interactive add dialog (reuse `McpAddCommand` logic)
- "Open MCP configuration →" → full MCP management dialog (Phase 4)

**Acceptance:**
- MCP servers appear in Settings tab with live status
- Enable/disable toggle works via `sdk.client.config.update()`
- Add button opens interactive dialog
- Remove button removes from config and stops process
- Vendor badge shows for each server

### Phase 4: Full MCP Management Dialog

**New file:** `packages/opencode/src/nocowboy/components/dialog-mcp.tsx`

**Contents:**
- Scrollable list of all configured servers (same as sidebar but more detail)
- Per-server: name, vendor, type (local/remote), URL/command, status, tools count
- Actions: toggle enable, restart, view logs (tail), remove
- Filter by vendor: "All | NoCowboy | Community"
- Search bar to filter by name
- "Install from npm" button → `nocowboy mcp install <name>` equivalent

**Acceptance:**
- Full dialog accessible from Settings → "Open MCP configuration →"
- All actions work without CLI
- Filter and search work

### Phase 5: Auto-Start on First Launch

**Files:**
- `packages/opencode/src/cli/cmd/run/runtime.boot.ts` or equivalent startup path
- `packages/opencode/src/nocowboy/mcp/lifecycle.ts`

**Logic:**
On TUI startup, check if any configured MCP servers with `enabled !== false` are not running. If so, auto-start them in background (no blocking). Show a toast: "Starting N MCP servers..."

Use the existing `McpLifecycle.startOne()` and `Launcher.command()` infrastructure. Do NOT block the TUI.

**Acceptance:**
- First TUI launch after init → all enabled MCP servers start automatically
- Servers not yet installed (missing npx package) → skip with log warning, don't crash
- Subsequent launches → only start servers that aren't already running

---

## Verification Checklist

- [ ] `nocowboy init` populates 12 servers with correct vendor tags
- [ ] Settings sidebar shows MCP section with live status
- [ ] Enable/disable toggle updates config and reconnects/disconnects server
- [ ] Add dialog creates new server entry and starts it
- [ ] Remove deletes config entry and stops process
- [ ] Vendor badge renders correctly for both types
- [ ] Auto-start on first launch works (toast shown, servers connect)
- [ ] Existing configs without `vendor` field still load (backward compat)
- [ ] TypeScript: no errors, `ConfigMCP.Info` includes `vendor` field
- [ ] Test: `bun test` — no regressions in MCP-related tests

## Rollback Strategy

- `vendor` field is optional → old configs are valid without it
- init.ts change only affects NEW inits, not existing configs
- UI changes are additive (new section in Settings) — existing tabs unchanged
- Auto-start can be disabled via `enabled: false` per server

## Migration Path

1. Deploy schema change (Phase 1) — backward-compatible
2. Deploy init.ts fix (Phase 2) — affects new users only
3. Deploy Settings UI (Phase 3) — no migration needed
4. Deploy full dialog (Phase 4) — no migration needed
5. Deploy auto-start (Phase 5) — existing users manually start once, then auto

