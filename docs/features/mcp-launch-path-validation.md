# MCP launch resilience — stale launch.json paths fall through with a warning

> Roadmap id: `mcp-launch-path-validation` — status is tracked in `docs/roadmap.json`.

## Description

`~/.nocowboy/mcp/launch.json` stores first-party MCP servers as absolute command
strings. When the repository behind such a server moves, the entry keeps pointing
at the old checkout. The failure was silent: `McpLifecycle.startOne` spawned the
proxy, the proxy bound its port, the child process died with `MODULE_NOT_FOUND`
inside `~/.nocowboy/mcp/<name>.log`, and the MCP client — which connects once at
instance start and does not retry — left the session without that server's tools.

`packages/opencode/src/nocowboy/mcp/launcher.ts` now validates a `launch.json`
command before it becomes a candidate:

- `commandPaths(cmd)` extracts the absolute paths referenced by a command string,
  including quoted paths (`node "/path with space/index.js"`). Commands without
  absolute paths (`npx`, `uvx`, installed binaries) yield an empty list.
- `commandExists(cmd)` is false when any of those paths is missing.
- `Launcher.command` drops a non-existent `launch.json` entry, logs
  `launch.json command points at a missing path, falling through`, and continues
  with the existing precedence: installed `@nocowboy/mcp-<name>` package, then
  the third-party `npx`/`uvx` default.

`resolveCommand` stays a pure precedence function; the filesystem check lives at
the I/O boundary in `Launcher.command`.

## Key files

- `packages/opencode/src/nocowboy/mcp/launcher.ts`
- `packages/opencode/test/nocowboy/mcp-launcher.test.ts`

## Verification

- `bun test test/nocowboy/mcp-launcher.test.ts` — precedence, resolution
  reporting, `commandPaths` extraction (quoted + non-path), an existing path, a
  moved repository, and non-path commands.
- `bun run typecheck` — clean.

## Known limitation

A `launch.json` command whose interpreter is missing (for example `bun` not on
`PATH`) is still treated as launchable: only absolute path arguments are
checked. Such a failure surfaces as a proxy that starts and exits, which is the
same observable behavior as before this change.
