# Lazy CLI startup

**Status:** implemented (2026-09-15)
**Files:** `packages/opencode/src/index.ts`, `packages/opencode/src/cli/registry.ts`,
`packages/opencode/src/nocowboy/cli/setup.ts`, `packages/opencode/src/cli/ui.ts`,
`packages/opencode/src/config/config.ts`, `packages/opencode/script/build.ts`,
`packaging/publish.sh`

## Problem

`nocowboy --version` took **2.9-3.4 s** and the TUI took ~6 s to reach its first plugin. The
entrypoint statically imported every command module, so a run that needed a version string
still parsed a **1403-module eager graph** (the `serve` and `debug` subgraphs alone were
~274 modules each). On top of that:

- `src/cli/ui.ts` imported `effect` only to declare `CancelledError`, pulling ~120 modules into
  every invocation.
- every launch ran `npm install @nocowboy/plugin` once per config directory; the package is not
  published yet, so each attempt waited on a 404 (~4.2 s of the TUI startup, serialised with the
  config walk).

A compiled Bun binary parses **every module in its bundle**, not just the ones it executes, so
both "what runs" and "what is bundled" matter.

## What changed

1. **`src/cli/registry.ts`** — the single source of command metadata (command string, aliases,
   description) and their dynamic import. `detect(argv)` reads the command name straight from
   argv (skipping option values for the global flags and the `$0` TUI options, so
   `nocowboy --prompt run` is not read as `run`). `load()` resolves a name or alias to its
   module; `stubs()` returns description-only stand-ins so `--help` can print the command list
   without importing anything. The metadata is duplicated from the modules on purpose — a test
   loads the real modules and asserts the copy still matches.
2. **`src/index.ts`** — registers only the requested command. `--version` loads nothing,
   `--help` registers the stubs (plus the real TUI command, whose options belong in the help),
   an unknown name falls back to the same list so yargs can produce its usual error.
3. **Heavy bootstrap is lazy.** `Installation`, `Heap`, `NocowboyCli`, `Database`,
   `Filesystem`, `JsonMigration` and `drizzle` are imported inside the middleware, which
   `--version`/`--help` never reach.
4. **`src/nocowboy/cli/setup.ts`** no longer re-imports command modules for registration.
5. **`src/cli/ui.ts`** declares `CancelledError` as a plain `Error` whose `name` stays
   `UICancelledError`; the only consumer matches it by name.
6. **`src/config/config.ts`** records plugin-install failures per directory and version in
   `~/.cache/nocowboy/plugin-install-failed.json` and stops retrying until the version changes.
7. **`script/build.ts`** minifies the embedded JS and turns code-splitting back on. A compiled
   binary parses **every** module in its bundle, so an inlined 4505-module graph cost ~1.4 s
   before `main()`; with `splitting: true` only the entrypoint chunk is parsed up front and the
   rest streams in from bunfs on demand. Code-splitting had been disabled against a Bun 1.3.14
   codegen bug that only hit the baseline target, which this project does not ship.
8. **`packaging/publish.sh`** exports `NOCOWBOY_RELEASE=true`, and the local binary install uses
   staged copy + `rename()` so a running TUI can never block it (see
   `docs/features/release-binary-install.md`).

## Measured

| Scenario | Before | After |
|---|---|---|
| `nocowboy --version` (release) | 3.4 s | **0.28 s** |
| `nocowboy --help` (release) | 2.5 s | **0.63 s** |
| `nocowboy --version` (dev) | 4.4 s | 1.09 s |
| `nocowboy completion bash` (dev) | 5.4 s | 1.1 s |
| eager modules imported by the entrypoint | 1403 | 51 |
| TUI startup up to the first plugin | ~6 s | ~1.5 s |

Two follow-ups landed on top of the first round:

- `--help` used to load every command module (yargs needs the command list). `stubs()` supplies
  the same list from the registry metadata without importing anything, so help is now 0.63 s.
  The remaining cost is the real TUI command, whose options belong in the help text.
- yargs runs the middleware *before* printing help, so asking for help still booted telemetry,
  auth and the database (~1 s). The middleware now returns early when `-h`/`--help` is present;
  `--help --print-logs` produces no log lines at all, which is the check.

## Tests

- `test/nocowboy/help.test.ts` — the entrypoint must keep using the registry, and every command
  in the help/docs barrel must resolve through `registry.load()`.
- `test/nocowboy/cli/roll-call.test.ts` — timeout raised to 30 s: `handle()` bootstraps a real
  instance before filtering, which exceeds bun's 5 s default on a network-mounted worktree.

## Known follow-ups

- `@nocowboy/plugin` is still unpublished, so the plugin SDK install can never succeed; the cache
  above only stops it from costing a round trip on every launch. Publishing the package is a
  release task, not a code task.
- `.nocowboy/nocowboy.json` in this repository declares `"plugin": ["marketplace"]`, but the
  cached `marketplace` package has no `index.js`, so every TUI start logs a load failure for it.
