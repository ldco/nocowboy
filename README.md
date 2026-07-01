# NoCowboy

**AI under control.** A terminal-first AI coding agent. Fork of [Kilo Code / OpenCode](https://github.com/Kilo-Org/kilocode) with standalone compiled binary, shared MCP architecture, plugin extensibility, and zero external service dependencies.

Built with TypeScript, SolidJS, [OpenTUI](https://opentui.com), Yoga flexbox. **Bun** runtime.

---

## Installation

NoCowboy is not yet published to npm. Build from source or use a prebuilt release binary.

### From source (current repo)

```bash
bun install --cwd packages/opencode build --single
cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy ~/.local/bin/nocowboy
```

### From prebuilt binary (release)

```bash
curl -fsSL https://github.com/NoCowboy-org/nocowboy/raw/main/install | bash
```

### Then

```bash
nocowboy init          # 2-question setup wizard
nocowboy mcp start     # start MCP servers (optional for local servers)
nocowboy               # start TUI
```

Config: `~/.config/nocowboy/nocowboy.jsonc`

---

## Quick start

| Command | What |
|---|---|
| `nocowboy` | Start TUI |
| `nocowboy init` | First-run setup |
| `nocowboy mcp start` | Start shared MCP servers |
| `nocowboy repomap` | Generate repo structure map |
| `nocowboy run "<task>"` | Non-interactive task |

Agent commands (in TUI): `/plan`, `/act`, `/goal`, `/verify`, `/commit`, `/memory`, `/dream`, `/repomap`

---

## What makes NoCowboy different

| Feature | NoCowboy |
|---|---|
| **Compiled binary** — instant startup, no Node.js needed | ✅ Single ELF, 155MB |
| **Shared MCP servers** — one set, all instances | ✅ HTTP/SSE, not per-instance |
| **Plugin out/in** — auto-discoverable MCP servers | ✅ `require.resolve` auto-detect |
| **Provider-agnostic** — 200+ models | ✅ Via LiteLLM, no vendor lock |
| **Local-first** — offline capable | ✅ No cloud dependency |
| **Zero external API dependencies** | ✅ No Kilo/OpenCode backends |
| **Open source** — MIT + Apache 2.0 | ✅ |

---

## Features

### Core

- **Compiled binary** — `bun build --compile`, instant startup
- **Shared MCP architecture** — one server set, all sessions connect via HTTP/SSE
- **Embedded proxy** — MCP lifecycle without systemd, zero external deps
- **Local-type MCP servers** — MCP service auto-spawns servers on startup

### Agent Intelligence

- **Repomap** — Aider-style token-optimized repo summary, auto-injected every turn
- **Memory FTS5** — full-text search, cross-session knowledge, `/dream` extraction
- **Goal judge** — independent subagent verifies task completion
- **Multi-turn approval memory** — approve once, never asked again
- **Deep context** — repomap + memory merged into system prompt every turn
- **Voice input** — FFmpeg capture + transcription

### Quality

- **Constitution** — AST rules block bad AI code
- **Contract Guard** — API changes fail frontend builds
- **NoCowboy Score** — 0-100% quality metric across 5 dimensions
- **Indexing** — SQLite vector store for codebase semantic search

### MCP Servers

8 first-party (`vendor: nocowboy`) + 4 community (`vendor: community`):
- constitution, contract-guard, ncp-validator, score-engine
- ralph, plugin-registry, puppetmaster, hooks
- context7, sqlite, puppeteer, git

---

## Development

```bash
bun install
bun run --cwd packages/opencode dev     # TUI with file watching (auto-restart)
bun run --cwd packages/opencode typecheck
bun test --cwd packages/opencode test/nocowboy/
```

Build release binary:

```bash
bun run --cwd packages/opencode build --single
# binary at packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy
```

See [docs/dogfooding-workflow.md](docs/dogfooding-workflow.md) for rebuild + install.

---

## Architecture

```
packaging/
├── mcp-servers/      # 8 first-party MCP server implementations
└── config/           # Default nocowboy.json + agents + instructions + skills

packages/
├── opencode/         # CLI — TUI, agents, tools, MCP, server
├── core/             # Data model, schemas
├── plugin/           # Plugin/tool interface
├── sdk/js/           # Auto-generated TypeScript SDK
└── nocowboy-indexing/ # Codebase indexing engine
```

---

## Project status

NoCowboy is a functional fork of Kilo Code / OpenCode. All Kilo backend services (api.kilo.ai, ingest.kilosessions.ai, GitHub integration) have been stripped out — NoCowboy runs entirely locally with no external dependencies. Own backend services will be built in future phases.

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed status.

---

## Docs

- [ROADMAP.md](docs/ROADMAP.md) — single source of truth
- [docs/guides/](docs/guides/) — publish, NUTAUSIK, overlap decisions
- [docs/reference/](docs/reference/) — competitive analysis, playbook, ADRs
- [docs/dogfooding-workflow.md](docs/dogfooding-workflow.md) — dev workflow

---

## License

MIT + Apache 2.0.
