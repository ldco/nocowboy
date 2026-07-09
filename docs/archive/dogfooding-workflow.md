# Dogfooding Workflow

## Dev mode (no compile, auto-restart on source changes)

```bash
bun run --cwd packages/opencode dev
```

Uses `bun --watch` — restarts automatically when source files change.

## Rebuild system binary

```bash
bun run --cwd packages/opencode build --single && cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy ~/.nocowboy/bin/nocowboy
```

If `proxy-standalone.mjs` changed:

```bash
cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/proxy-standalone.mjs ~/.nocowboy/bin/proxy-standalone.mjs
```

After rebuild, **exit and restart `nocowboy`** to pick up the new binary.

## MCP servers

```bash
nocowboy mcp stop && nocowboy mcp start
```

## Two-terminal setup

- **Terminal 1**: `bun run --cwd packages/opencode dev` — dev server, auto-reloads on changes
- **Terminal 2**: `nocowboy` — use as your editor on the codebase

Changes made in Terminal 2 are picked up by Terminal 1's watch mode.
