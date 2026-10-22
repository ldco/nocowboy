# NoCowboy

Terminal-native AI developer harness. Bun runtime, SolidJS TUI, TypeScript core, shipped as a single compiled binary.

NoCowboy is a coding agent that lives in your terminal. It reads and edits files, runs tests, drives your shell, and coordinates subagents — all under your explicit control. No browser, no Electron, no hidden state. The name is the thesis: **no cowboy coding**. Deterministic execution, transparent command boundaries, and a harness that sits directly on top of your shell instead of behind a sandboxed abstraction.

NoCowboy is a fork of [Kilo Code](https://github.com/kilo-org/kilocode) (an OpenCode-lineage harness). Its engine, prompts, TUI, agent roles and tooling are reworked for developers who run on any OpenAI-compatible or local endpoint rather than a single vendor.

---

## Why NoCowboy?

### Zero Electron bloat

The whole harness is a Bun program compiled to one native binary with `bun build --compile`. Node.js is not required at runtime; sidecars (tree-sitter grammars, a `models.dev` catalog snapshot) ship next to the binary.

Startup is not a full boot. `--version` and `--help` resolve from a static command registry without loading telemetry, auth or the database, and any other invocation lazily imports only the command module it needs — the ~1400-module eager graph is never paid for. See `packages/opencode/src/cli/registry.ts`.

### Reactive terminal state

The TUI is a SolidJS component tree rendered through [OpenTUI](https://github.com/sst/opentui) (`@opentui/solid`). State is held in fine-grained reactive stores; the renderer diffs signal updates instead of emitting raw ANSI writes.

This is why the alternate-screen layout stays stable: streaming tokens, tool cards, the sidebar, dialogs and the prompt are all declared, not painted imperatively. Scrolling, wrapping and reflow are renderer concerns, not hand-rolled escape-sequence math.

### First-class tooling & native subprocess control

Tools are not bolted on — they are the interface between the agent and your machine:

- **Shell** — a real bash/powershell tool with tree-sitter command parsing, timeouts and per-command permission patterns (`packages/opencode/src/tool/shell.ts`).
- **PTY** — `bun-pty`/`node-pty` integration for interactive terminals.
- **Background jobs** — dev servers and watchers started and managed from the TUI, not `&`-backgrounded by hand.
- **LSP** — hover, definitions, diagnostics surfaced as a tool.
- **Formatters**, **file watcher**, **snapshots** (undo/revert of agent edits).
- **MCP** — Model Context Protocol clients, launched and health-managed by the harness.

Every tool call passes through a permission engine before it runs. Restricted roles — `architect` (no writes), `planner` (writes only under `docs/`), `reviewer` (read-only) — are enforced by permissions, not by convention.

### Context pruning & cost control

Long sessions do not silently balloon. The harness compacts, prunes and budgets context:

- `compaction.auto` / `compaction.prune` — automatic compaction and pruning of stale tool output, with a configurable verbatim tail (`compaction.tail_turns`).
- `context_profile` — `compact` / `standard` / `deep` budgeting of how much of a large model window a task may occupy.
- `budget` — per-session `max_cost_usd` / `max_tokens` caps with `on_exceed: "downgrade" | "abort"`.
- `tool_output.max_lines` / `max_bytes` — oversized tool output is written to disk and previewed, not stuffed into the prompt.
- Watchdogs — idle/first-event/subagent stall timeouts abort silently stalled providers instead of hanging a turn.

---

## Architecture Overview

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  CLI entry — bun bin/nocowboy  →  src/index.ts (yargs)                 │
  │  lazy command registry: loads exactly one command module per run      │
  └───────────────┬──────────────────────────────────────────────────────┘
                  │  $0 (no subcommand)               one-shot           server
                  ▼                                   ────────           ──────
        ┌────────────────────┐                nocowboy run <msg>    nocowboy serve
        │  TUI  (SolidJS +   │                                      nocowboy web
        │  OpenTUI, signals) │                                      nocowboy attach <url>
        └─────────┬──────────┘
                  │  reactive store / event bus
                  ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Agent loop  —  session/processor.ts · session/prompt.ts              │
  │  agent selector → system prompt → stream → tool calls → repeat        │
  └───────────┬───────────────────────────┬───────────────────────────────┘
              │                           │
              ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────────────────────────┐
  │  LLM stream (AI SDK)  │   │  Permission engine                        │
  │  session/llm.ts        │   │  allow / ask / deny, per tool + pattern   │
  │  provider catalog      │   └───────────────┬───────────────────────────┘
  │  (models.dev snapshot) │                   │ approved
  └───────────────────────┘                   ▼
                                  ┌──────────────────────────────────────┐
                                  │  Tool registry — tool/registry.ts    │
                                  │  read · grep · glob · edit · write · │
                                  │  patch · shell · task · webfetch ·   │
                                  │  MCP · LSP · background · skill ·    │
                                  └───────────────┬──────────────────────┘
                                                  ▼
                     shell / PTY · filesystem · LSP · MCP subprocesses · git
```

**Responsibility zones**

| Layer | Code | Responsibility |
|---|---|---|
| CLI | `packages/opencode/src/index.ts`, `cli/registry.ts`, `cli/cmd/*` | Parse argv, boot minimally, dispatch one command (TUI, `run`, `serve`, …). |
| TUI | `packages/opencode/src/cli/cmd/tui/*` | Reactive rendering (SolidJS + OpenTUI), prompt, dialogs, sidebar, keymap. |
| Session | `packages/opencode/src/session/*` | Message model, agent loop, streaming, compaction, retry, permissions hand-off. |
| Agent | `packages/opencode/src/agent/*` | Built-in agents, prompts, permission baselines, subagent spawning. |
| Tools | `packages/opencode/src/tool/*` | The tools exposed to the model and their execution. |
| Providers | `packages/opencode/src/provider/*` | Model catalog (bundled `models.dev` snapshot + live refresh) and SDK wiring. |
| Core | `packages/core/src/*` | Shared primitives: global paths, flags, config schema, filesystem, events. |
| Plugins/SDK | `packages/plugin`, `packages/sdk` | Public extension surface (custom tools, hooks, TUI plugins). |

---

## Prerequisites & Installation

**Requirements**

- [Bun](https://bun.sh) **≥ 1.3.14** (pinned as `packageManager` in `package.json`).
- **Linux** (x64 / arm64, glibc or musl) or **macOS** (x64 / arm64). Windows is supported via the compiled binary and `NOCOWBOY_GIT_BASH_PATH`.
- `git` on `PATH`.

**Run from source**

```bash
git clone https://github.com/ldco/nocowboy.git
cd nocowboy/app

bun install            # workspace install (bun.lock)
bun run dev            # launch the TUI from source (bun --watch)
```

`bun run dev` runs `dev.sh`, which points Bun at `packages/opencode/src/index.ts` with watch reload.

**Build a binary**

```bash
# build the shipped release targets (linux-x64, darwin-arm64) → packages/opencode/dist/<target>/bin/nocowboy
bun run --cwd packages/opencode build

# build only the current platform
bun run --cwd packages/opencode script/build.ts --single

# full release build: typecheck + build + (on Linux) refresh ~/.nocowboy/bin/nocowboy
bun run release
```

**Link the `nocowboy` command**

```bash
cd packages/opencode
bun link               # exposes the `nocowboy` bin globally
nocowboy --version     # 1.4.3
```

On Linux, `bun run release` also installs the freshly built binary to `~/.nocowboy/bin`; other platforms build into `dist/` only.

**First run**

```bash
nocowboy init          # system-wide first-run setup (providers, defaults)
nocowboy auth login    # configure an AI provider / credentials
nocowboy               # start the TUI
```

---

## Configuration & Environment

### Config files

Config is JSONC. Files are merged in precedence order; later sources win.

**Global** — `~/.config/nocowboy/` (respects `XDG_CONFIG_HOME`):

```
config.json  →  nocowboy.json  →  nocowboy.jsonc     (lowest → highest)
```

`~/.config/nocowboy/nocowboy.jsonc` is seeded on first load. A legacy TOML `config` file is migrated once into `config.json`.

**Project** — discovered by walking up from the working directory to the git worktree root:

```
nocowboy.jsonc | nocowboy.json          # project root (and ancestors)
.nocowboy/nocowboy.jsonc | .nocowboy/nocowboy.json
.opencode/nocowboy.jsonc | .opencode/…  # upstream-compatible paths
```

Project config is **untrusted**: `{env:…}` substitution is rejected and `{file:…}` reads are confined to the project root. Global config is trusted.

### Environment

| Variable | Effect |
|---|---|
| `NOCOWBOY_CONFIG` | Path to an explicit config file (trusted). |
| `NOCOWBOY_CONFIG_CONTENT` | Inline JSON/JSONC config content. |
| `NOCOWBOY_CONFIG_DIR` | Extra config directory to load. |
| `NOCOWBOY_TUI_CONFIG` | Path to the TUI config file. |
| `NOCOWBOY_DISABLE_PROJECT_CONFIG` | Ignore project-level config entirely. |
| `NOCOWBOY_SERVER_PASSWORD` / `NOCOWBOY_SERVER_USERNAME` | Basic auth for `serve` / `attach`. |
| `NOCOWBOY_DISABLE_MODELS_FETCH`, `NOCOWBOY_MODELS_URL`, `NOCOWBOY_MODELS_PATH` | Control the model catalog source. |
| `NOCOWBOY_DISABLE_AUTOUPDATE` | Disable self-update. |
| `NOCOWBOY_EXPERIMENTAL` | Opt into experimental features. |
| `NOCOWBOY_DB` | Override the SQLite database path. |

Provider credentials are read from environment variables (or `nocowboy auth login`). Common keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `MOONSHOT_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`. The full list per provider lives in the bundled `models.dev` snapshot (`packages/opencode/src/provider/models-snapshot.json`).

### Config keys (supported subset)

```jsonc
{
  "$schema": "https://nocowboy.dev/config.json",

  "model": "deepseek/deepseek-v4-flash",   // provider/model
  "small_model": "deepseek/deepseek-v4-flash",
  "subagent_model": "kimi-for-coding/kimi-k2.7-code",
  "default_agent": "auto",                  // primary agent used when none is given

  "lang": "ru",                             // "ru" enables Russian prompts/UI; "en" (default)

  "agent": {
    "worker": { "mode": "all", "model": "deepseek/deepseek-v4-flash", "prompt": "./worker.md" }
  },

  "provider": {
    "my-endpoint": {
      "api": "https://example.com/v1",
      "npm": "@ai-sdk/openai-compatible",
      "env": ["MY_ENDPOINT_API_KEY"],
      "models": { "my-model": { "cost": { "input": 0.1, "output": 0.3 } } }
    }
  },

  "mcp": {
    "context7": { "type": "remote", "url": "http://127.0.0.1:9201/mcp", "enabled": true }
  },

  "permission": {
    "*": "allow",
    "bash": { "rm -rf /": "ask", "*": "allow" },
    "edit": { "*.env": "ask", "*": "allow" }
  },

  "compaction": { "auto": true, "prune": true, "tail_turns": 2 },
  "context_profile": "standard",            // "compact" | "standard" | "deep"
  "budget": { "max_cost_usd": 5, "on_exceed": "downgrade", "downgrade_model": "deepseek/deepseek-v4-flash" },
  "tools": { "webfetch": true, "websearch": false },
  "instructions": ["~/.config/nocowboy/instructions/*.md"],
  "plugin": ["./.nocowboy/plugin/my-plugin.ts"],
  "indexing": { "enabled": true }
}
```

The authoritative schema is `packages/opencode/src/config/config.ts` (`Config.Info`); the agent schema is in `packages/opencode/src/config/agent.ts`. Run `nocowboy config check` to validate a config for warnings and errors.

---

## Workflow & Command Reference

### Interactive (TUI)

```bash
nocowboy                 # start the TUI in the current directory
nocowboy <project>       # start in a project directory
```

Key bindings (leader is `Ctrl+X`):

| Keys | Action |
|---|---|
| `Tab` / `Shift+Tab` | Next / previous agent |
| `Ctrl+P` | Command palette |
| `Ctrl+X` then `a` / `m` / `t` / `l` / `n` | Agents / Models / Themes / Sessions / New session |
| `Ctrl+X` then `b` / `c` / `s` | Toggle sidebar / Compact session / Status |
| `Enter` | Submit |
| `Shift+Enter`, `Ctrl+J` | Insert newline |
| `Ctrl+T` | Cycle model variant |
| `Ctrl+C` | Exit |

Built-in agents: **auto** (dispatcher, default), **architect**, **planner**, **worker**, **reviewer**, **nocowboy** (companion). Roles, prompts and model defaults are defined per-agent and swappable with `Tab`.

### Headless / one-shot

```bash
nocowboy run "add a health endpoint and a test"          # single turn
nocowboy run --continue "now wire it into the router"    # continue the last session
nocowboy run -m deepseek/deepseek-v4-flash "refactor X"  # pick the model
nocowboy run --agent worker "fix the failing tests"      # pick the agent
nocowboy run --format json "list open TODOs"             # raw JSON event stream
nocowboy run --autopilot "drive the goal to completion"  # unattended until done / --max-turns
```

Permission and branching flags: `--auto` (auto-approve all), `--dangerously-skip-permissions` (approve everything not explicitly denied), `--branch [name]` (create and switch to a git branch first).

### Core commands

| Command | Purpose |
|---|---|
| `nocowboy init` | First-run, system-wide setup. |
| `nocowboy auth login \| list \| logout` | Manage AI providers and credentials (`providers` alias). |
| `nocowboy models [provider]` | List available models. |
| `nocowboy agent create \| list` | Create / list agents. |
| `nocowboy mcp add \| list \| start \| stop \| status \| logs \| install \| remove` | Manage MCP servers. |
| `nocowboy session list \| delete` | Manage sessions. |
| `nocowboy config check` | Validate configuration. |
| `nocowboy roadmap init \| generate \| verify` | Manage `docs/roadmap.json`. |
| `nocowboy stats` | Token usage and cost statistics. |
| `nocowboy repomap` | Generate an Aider-style repository map. |
| `nocowboy export [sessionID]` / `nocowboy import <file>` | Move session data as JSON. |
| `nocowboy upgrade [target]` | Self-update. |
| `nocowboy debug …` | Troubleshooting subcommands. |

### Server mode

```bash
nocowboy serve            # headless server
nocowboy web              # server + open the web interface
nocowboy attach <url>     # attach a TUI to a running server
```

### Slash commands (in TUI)

Workflow commands are markdown files. Project-level ones live in `.nocowboy/command/*.md`; global ones in `~/.config/nocowboy/command/*.md`. Examples shipped here: `/pipeline` (roadmap → spec → worker → test → reviewer → DONE), `/ponytail-review` (over-engineering pass over the current diff), `/plan`, `/commit`, `/roadmap`, `/verify`, `/spec-contract`.

---

## Extensibility & Tool Authoring

### Custom tools (plugins)

A plugin is a module that returns hooks; it can register tools, hook lifecycle events, and extend the TUI. Plugins are auto-discovered from `<config-dir>/plugin/*.{ts,js}` (and `plugins/`), or declared explicitly in the `plugin` config array.

```ts
// .nocowboy/plugin/my-tool.ts
import type { Plugin } from "@nocowboy/plugin"
import { tool } from "@nocowboy/plugin"

export const MyPlugin: Plugin = async () => ({
  tool: {
    mint_ticket: tool({
      description: "Create a ticket in the internal tracker",
      args: {
        title: tool.schema.string().describe("Ticket title"),
        priority: tool.schema.enum(["low", "high"]).default("low"),
      },
      async execute(args, ctx) {
        ctx.metadata({ title: `mint ${args.title}` }) // shown on the tool card
        return { title: args.title, output: `created ${args.title} (${args.priority})` }
      },
    }),
  },
})
```

The tool contract — `description`, `args` (Zod schema), `execute(args, context)` — is defined in `packages/plugin/src/tool.ts`. The `context` exposes `sessionID`, `directory`, `worktree`, `abort`, `metadata(...)` and `ask(...)` (to request permission). Register the plugin in config if it is not in an auto-discovered directory:

```jsonc
{ "plugin": [["./.nocowboy/plugin/my-tool.ts", { "someOption": true }]] }
```

### Custom agents

Agents are markdown files (front-matter + system prompt) in `.nocowboy/agent/*.md` or `~/.config/nocowboy/agent/*.md`, or inline in the `agent` config key. Each agent selects a model, a prompt, a role (`primary` / `subagent` / `all`) and a permission set — that is how read-only roles such as `architect` and `reviewer` are enforced.

### Custom commands

Slash commands are markdown files in `.nocowboy/command/*.md` (project) or `~/.config/nocowboy/command/*.md` (global), with optional front-matter for `description` and `mode`. The body is the prompt the command runs.

### MCP servers

Add MCP servers in the `mcp` config key (or `nocowboy mcp add`). Each server is launched and health-managed by the harness and its tools are merged into the tool registry.

---

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/CHANGELOG.md`](docs/CHANGELOG.md) · [`docs/BACKLOG.md`](docs/BACKLOG.md) — generated from `docs/roadmap.json`.
- [`docs/features/`](docs/features) — one page per shipped feature.
- [`docs/reference/`](docs/reference) — fork playbook, engine manifest, glossary, architecture notes.
- [`docs/releases/1.4.3.md`](docs/releases/1.4.3.md) — latest release notes.
- [`docs/guides/autopilot.md`](docs/guides/autopilot.md) — autonomous runs (`/goal`, `/roadmap`).

---

## Development

```bash
bun turbo typecheck                    # typecheck all packages
bun run --cwd packages/opencode test   # test suite (do not run `bun test` from the repo root)
bun scripts/verify-roadmap.ts          # verify every DONE roadmap feature against code
bun run docs:check                     # ensure generated docs are in sync
```

`docs/roadmap.json` is the single source of truth for `ROADMAP.md`, `CHANGELOG.md` and `BACKLOG.md` — regenerate with `bun run docs:gen`, never hand-edit the generated files.

---

## License

Proprietary. See [LICENSE.md](LICENSE.md). NoCowboy is a closed-source commercial product governed by the commercial license agreement described there.
