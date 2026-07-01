# P3: Add Hooks MCP Server

**Status:** 🚧 Planned | **Source:** kilogramme → NoCowboy port

## Context

NoCowboy is missing the `hooks` MCP server that exists in the kilogramme reference config. This server provides lifecycle hooks (pre/post-tool events, session start/end, stop) plus a channels system for external tool integration (webhooks, CI alerts).

## Plan

### Phase 1: Create the MCP server package

Create `packaging/mcp-servers/hooks/` with the full hooks server:

- `package.json` — `@nocowboy/mcp-hooks` package
- `src/index.ts` — 8 MCP tools:
  1. `hooks_register` — register a hook (event + matcher + handler)
  2. `hooks_fire` — fire hooks for an event
  3. `hooks_list` — list all hooks
  4. `hooks_remove` — remove a hook by ID
  5. `hooks_persist` — save hooks to persistent config
  6. `channels_post` — post a message to a channel
  7. `channels_read` — read pending messages from channels
  8. `channels_listen` — start webhook HTTP server
- `tsconfig.json` — TypeScript config

### Phase 2: Port from kilogramme with .kilo → .nocowboy fixes

Path changes in the source:
- `~/.kilo/hooks.json` → `~/.nocowboy/hooks.json`
- `~/.kilo/channels/` → `~/.nocowboy/channels/`
- Package name: `hooks-mcp-server` → `@nocowboy/mcp-hooks`
- Binary name: `kilo-channel-webhook` → `nocowboy-channel-webhook` (in log messages)

### Phase 3: Register in packaging config

Add to `packaging/config/nocowboy.json`:
```json
"hooks": {
  "type": "local",
  "command": ["bun", "<path>/packaging/mcp-servers/hooks/dist/index.js"],
  "vendor": "nocowboy",
  "enabled": true
}
```

### Phase 4: Add to init template

Add `hooks` to the default server list in `packages/opencode/src/cli/cmd/init.ts` — the `defaultNames` array and `defaultVendors` mapping.

### Phase 5: Update instructions

The `hooks-system.md` instruction already exists — no changes needed. It references `.kilo/hooks.json` paths — update to `.nocowboy/hooks.json`.

## Files to change

| File | Action |
|---|---|
| `packaging/mcp-servers/hooks/` | CREATE (new package) |
| `packaging/mcp-servers/hooks/package.json` | CREATE |
| `packaging/mcp-servers/hooks/tsconfig.json` | CREATE |
| `packaging/mcp-servers/hooks/src/index.ts` | CREATE (ported from kilogramme) |
| `packaging/config/nocowboy.json` | MODIFY — add hooks MCP server |
| `packages/opencode/src/cli/cmd/init.ts` | MODIFY — add hooks to defaultNames |
| `packaging/config/instructions/hooks-system.md` | MODIFY — .kilo → .nocowboy paths |
| `docs/ROADMAP.md` | MODIFY — update MCP server count |

## Verification

- [ ] `bun install --cwd packaging/mcp-servers/hooks` — installs deps
- [ ] `bun run --cwd packaging/mcp-servers/hooks build` — compiles cleanly
- [ ] `bun run --cwd packages/opencode typecheck` — no errors
- [ ] `nocowboy mcp start` — hooks server starts
- [ ] `nocowboy mcp status` — shows hooks as connected
- [ ] Hooks config persists to `~/.nocowboy/hooks.json`
