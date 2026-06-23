# MCP Lifecycle & npm Migration Plan

## Status
- ✅ DONE — Port renumbering: NoCowboy MCP servers moved from 82xx to 92xx
- ✅ DONE — Delete per-system packaging (AUR, systemd, homebrew, launchd)
- ✅ DONE — `nocowboy mcp` CLI command (start/stop/status/logs + embedded proxy)
- ✅ DONE — Remove mcp-proxy external dependency (proxy embedded in binary)
- ✅ DONE — Launch spec registry (`~/.nocowboy/mcp/launch.json`) read from user config
- ✅ DONE — Port missing multi-provider.md instruction
- ✅ DONE — Sync architect agent prompt to full 8330-char version
- ✅ DONE — Fix pre-existing type errors
- ❌ PENDING — npm publish pipeline
- ❌ PENDING — Clean running state (stale systemd units)
- ❌ PENDING — `nocowboy mcp remove` via jsonc-parser
- ❌ PENDING — `mcp add` should create launch.json entry for local servers
- ❌ PENDING — `bun install -g`: resolve MCP server paths from npm package dir

## Step 1: Build `nocowboy mcp` CLI command

A user-space MCP server manager. Works without systemd. Ships inside the `nocowboy` binary.

### Commands

| Command | Action |
|---|---|
| `nocowboy mcp start` | Start all MCP servers as background processes |
| `nocowboy mcp start <name>` | Start one server |
| `nocowboy mcp stop` | Stop all |
| `nocowboy mcp stop <name>` | Stop one |
| `nocowboy mcp status` | List running servers with port/pid/uptime |
| `nocowboy mcp logs <name>` | Tail logs for a server |
| `nocowboy mcp install` | Install systemd user units on demand (optional) |

### Implementation

- New file: `src/nocowboy/cli/cmd/mcp.ts` — CLI command handler
- New file: `src/nocowboy/mcp/manager.ts` — process lifecycle (spawn `mcp-proxy`, track pids, logs)
- State dir: `~/.nocowboy/mcp/` — pidfiles + logs per server
- Reads server definitions from the bundled default config + user overrides in `~/.nocowboy/nocowboy.json`

### Server definition format

```json
{
  "mcp": {
    "constitution": {
      "type": "remote",
      "url": "http://127.0.0.1:9216/mcp",
      "enabled": true,
      "command": "node /path/to/servers/constitution/dist/index.js"
    }
  }
}
```

The `command` field is what `mcp-proxy` wraps. The `url` is what the app connects to.

## Step 2: npm publish preparation

- Publish as `@nocowboy/cli` or `nocowboy`
- Version: `0.5.x` (decoupled from upstream `7.3.46` engine version)
- `package.json` needs its own `name` + `version` for the npm package
- Buld: `bun build --compile ./src/index.ts` — produces a single binary
- `bun install -g @nocowboy/cli` puts `nocowboy` on PATH

## Step 3: Build script update

The current `build.ts` creates a tarball with config/mcp-servers/proxy. For npm:
- The binary is self-contained
- MCP server source code (`mcp-servers/`) stays in the repo but is installed on first `nocowboy mcp install`
- `mcp-proxy` (`proxy/`) is bundled or installed as npm dependency
- Default config is embedded in the binary, with `~/.nocowboy/nocowboy.json` as override

## Step 4: Clean running state

- Stop all kilocode-mcp services (they're on 82xx; keep them in case User runs Kilo)
- Remove duplicate nocowboy-mcp systemd user units from `~/.config/systemd/user/`
- Verify Kilo + NoCowboy coexist without port conflict
