<p align="center"><img src="logo.svg" alt="NoCowboy" width="200"></p>

# NoCowboy

**AI under control.** A terminal-first AI coding agent with shared MCP architecture,
compiled binary, and plugin-out/plugin-in extensibility.

Built with TypeScript, SolidJS, [OpenTUI](https://opentui.com), Yoga flexbox. **Bun** runtime.

---

## What makes NoCowboy different

| Feature | NoCowboy | Claude Code | Cursor | Copilot |
|---|---|---|---|---|
| **Compiled binary** — instant startup | ✅ | ❌ (JS) | ❌ (IDE) | ❌ (IDE) |
| **Shared MCP servers** — one set, all instances | ✅ | ❌ (per-instance) | — | — |
| **Plugin out/in** — `npm install -g`, postinstall auto-config | ✅ | ❌ | ❌ | ❌ |
| **Provider-agnostic** — 200+ models via LiteLLM | ✅ | Anthropic only | Multi-model | GitHub only |
| **Local-first** — offline capable | ✅ | ❌ | ❌ | ❌ |
| **Open source** — MIT + Apache 2.0 | ✅ | ❌ | ❌ | ❌ |

---

## Installation

```bash
npm install -g nocowboy
# or
bun install -g nocowboy
```

Then:
```bash
nocowboy init          # 2-question setup wizard
nocowboy mcp start     # start MCP servers
nocowboy               # start coding
```

Config: `~/.config/nocowboy/nocowboy.json` (system-wide)

---

## Quick start

| Command | What |
|---|---|
| `nocowboy` | Start TUI |
| `nocowboy init` | First-run setup |
| `nocowboy mcp start` | Start shared MCP servers |
| `nocowboy mcp install <name>` | Install + auto-configure an MCP server |
| `nocowboy repomap` | Generate repo structure map |
| `nocowboy --version` | Show version |

Agent commands (in TUI): `/plan`, `/act`, `/goal`, `/verify`, `/commit`, `/memory`, `/dream`, `/repomap`

---

## Features

### Core
- **Compiled binary** — `bun build --compile`, instant startup, 155MB
- **Shared MCP architecture** — one server set, all sessions connect via HTTP/SSE. No per-instance memory bloat.
- **Embedded proxy** — MCP lifecycle without systemd, zero external deps
- **Plugin out/in** — `npm install -g @nocowboy/mcp-<name>` auto-configures via postinstall

### Agent Intelligence
- **Repomap** — Aider-style token-optimized repo summary, auto-injected every turn
- **Memory FTS5** — MiMo-Code borrowed: full-text search, cross-session knowledge, `/dream` extraction
- **Goal judge** — independent subagent verifies task completion
- **Multi-turn approval memory** — Codex CLI style: approve once, never asked again
- **Deep context** — repomap + memory merged into system prompt every turn
- **Voice input** — FFmpeg capture + transcription

### Quality
- **Constitution** — AST rules block bad AI code
- **Contract Guard** — API changes break frontend builds
- **NoCowboy Score** — 0-100% quality metric across 5 dimensions
- **Indexing** — SQLite vector store for codebase semantic search

### MCP Servers
- 7 first-party servers (published as `@nocowboy/mcp-*`)
- 4 third-party via npx (context7, sqlite, puppeteer, git)
- NUTAUSIK — project management (JS port of Tausik, 62 TS files)

---

## Development

```bash
bun install
bun run dev              # TUI with file polling
bun run typecheck        # TypeScript check (tsgo --noEmit)
bun test test/nocowboy/  # Run tests (150+ pass)
```

Build release:
```bash
NOCOWBOY_VERSION=0.7.0 NOCOWBOY_RELEASE=true bun run script/build.ts
```

---

## Architecture

```
packaging/
├── mcp-servers/      # 7 first-party MCP server implementations
└── config/           # Default nocowboy.json + agents + instructions + skills

packages/
├── opencode/         # CLI — TUI, agents, tools, MCP, server
├── core/             # Data model, schemas
├── plugin/           # Plugin/tool interface
├── sdk/js/           # Auto-generated TypeScript SDK
└── nocowboy-indexing/ # Codebase indexing engine
```

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) — complete DONE / NOT DONE / NEXT.

---

## Docs

- [ROADMAP.md](docs/ROADMAP.md) — single source of truth
- [docs/guides/](docs/guides/) — publish, NUTAUSIK, overlap decisions
- [docs/reference/](docs/reference/) — competitive analysis, playbook, ADRs

---

## License

MIT + Apache 2.0. See LICENSE.
