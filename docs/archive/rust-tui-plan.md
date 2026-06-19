# [DEPRECATED] Plan: NoCowboy TUI (Rust + Ratatui)

**Status:** SUPERSEDED by [nocowboy-fork-plan.md](../plans/nocowboy-fork-plan.md)
**Deprecated:** 2026-06-17
**Reason:** Direction changed from Rust scratch-build to TypeScript fork of KiloCode. All Rust/Ratatui code is abandoned.
**Do NOT implement from this document.** Kept for historical reference only.

---

# Plan: NoCowboy TUI

## Why

Every AI coding tool today is **a tool, not a product.** OpenCode, Claude Code, Aider — they're all CLIs that assume a power user who configures tmux, installs plugins, and reviews every AI-generated line by hand. They focus on speed, not quality. They generate faster, they don't verify better.

NoCowboy TUI is built because **speed without quality is just faster chaos**. The existing Kilo framework (11 MCP servers) already delivers the quality enforcement — Constitution rules, Contract Guard, Score Engine, NCP Protocol. What's missing is a **terminal interface that owns the entire experience** — not just the chat, but the file tree, the git status, the score, the quality feedback, all in one place.

The competitive gap is clear: every terminal agent generates code, but **none of them verify it before commit.** NoCowboy does. That's the product.

## What

A Rust TUI terminal application that:

1. **Orchestrates 11 MCP servers** for coding workflow (LLM chat, agents, git, files, QA tools)
2. **Integrates external tools** via suspend/resume (lazygit, nnn, nvim, xh, viu)
3. **Enforces code quality** via the Constitution, Contract Guard, and Score Engine
4. **Survives crashes** via SQLite event-sourced session persistence
5. **Is multi-platform** — single Rust binary (~15MB), works in any terminal

The TUI is thin — it's a rendering layer and event loop on top of the MCP infrastructure. All heavy lifting stays in the existing Node.js MCP servers.

## Architecture

```
User (terminal)
      ↕
┌──────────────────────────┐
│   NoCowboy TUI (Rust)    │  ← Ratatui rendering
│                          │
│  ┌─ event loop ───────┐  │
│  │ input → dispatch    │  │  ← tokio async
│  │ → render            │  │
│  └─────────────────────┘  │
│                          │
│  ┌─ integrations ─────┐  │
│  │ MCP hub (rmcp)      │  │  ← connects to 11 servers
│  │ LLM client (reqwest)│  │  ← DeepSeek, Claude, OpenAI
│  │ Session persistence │  │  ← SQLite WAL event log
│  │ Plugin host (wasm)  │  │  ← Wasmtime sandbox
│  └─────────────────────┘  │
└──────────┬───────────────┘
           │ MCP (HTTP + stdio)
           ▼
┌──────────────────────────┐
│ 11 existing MCP servers  │  ← Node.js, already built
└──────────────────────────┘
```

### Key decisions already made

| Decision | What |
|----------|------|
| Language | Rust (Ratatui + crossterm + tokio) |
| MCP client | `rmcp` crate (Streamable HTTP, stdio) |
| LLM client | `reqwest` + SSE streaming (multi-provider) |
| Session persistence | SQLite WAL (event sourcing + snapshots) |
| Plugin system | Wasmtime sandbox |
| Config format | TOML (`nocowboy.toml`) |
| Editor | nvim (suspend/resume) |
| Git client | lazygit (suspend/resume) |
| File manager | nnn (suspend/resume) |
| Image viewer | viu (suspend/resume) |
| External tools | Configurable in `nocowboy.toml` |

### Layout features

- zsh-style header: `~/project  master ✚3 △1  Score: 87`
- Mouse everywhere: drag borders, click agents, scroll panels
- Resizable panels: sidebar (18-30 cols), chat (fill), context (20-40 cols)
- 5 layout presets: Chat, Default, PRD, Review, Files
- Command palette: `Ctrl+Shift+P` fuzzy search

### MCP status: 11 servers, 140+ tools

These already exist. The TUI connects to them.

| Server | Transport | Tools |
|--------|-----------|-------|
| context7 | HTTP :8200 | doc search |
| sqlite | HTTP :8201 | query, schema |
| puppeteer | HTTP :8202 | browser |
| puppetmaster | HTTP :8203 | 26 PM ops |
| tausik | HTTP :8204 | 124 project mgmt |
| git | HTTP :8205 | commits, diff |
| ralph | stdio | 8 PRD tools |
| constitution | stdio | 4 QA tools |
| ncp-validator | stdio | 3 NCP tools |
| contract-guard | stdio | 2 contract tools |
| score-engine | stdio | 4 score tools |

## Risk / Reward

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Rust TUI takes too long (6 months instead of 2) | High | Start with Cargo MVP in 2 weeks: just MCP hub + LLM chat. Layout comes later. |
| Ratatui limits UI (no rich widgets, all hand-built) | Medium | Acceptable — a TUI doesn't need pixel-perfect. Terminals are text grids. |
| User prefers their tmux setup over the TUI | Medium | The suspend/resume pattern means users keep their tools. NoCowboy is a hub, not a cage. |
| MCP server startup cascade (11 servers) | Low | TUI starts them lazily, not eagerly. Only active servers consume ports. |
| Event sourcing is overengineering for a TUI | High | MUST resist. MVP uses simple JSON state file. Event sourcing is v2. |

## MVP (6 weeks)

The MVP is a **working chat TUI with MCP integration and basic layout.** Nothing more.

```
Week 1:  Cargo project, Ratatui renders "Hello NoCowboy", crossterm event loop reads keys
Week 2:  Layout system (sidebar + chat + context panels, resizable)
Week 3:  MCP hub connects to constitution + ralph servers, tool calls work
Week 4:  LLM streaming from DeepSeek, messages rendered in chat panel
Week 5:  Agent switching, agent prompt loading from ~/.config/kilo/.kilo/agents/
Week 6:  zsh-style header with git status, input area with history, session save/resume
```

Don't build for MVP:
- Plugin system (Wasmtime)
- Event sourcing (simple JSON state)
- Contract guard integration
- Score widget
- Layout presets

## Build order

1. Rust TUI MVP (above) — 6 weeks
2. NoCowboy features: Score widget, Constitution violations display, PRD progress — +2 weeks
3. Layout presets, command palette, multi-project — +2 weeks
4. Plugin system — +4 weeks (deferred)
5. Product polish, distribution, docs — +2 weeks

## Files to create

```
~/projects/nocowboy-tui/
├── Cargo.toml
├── nocowboy.toml              # Default config
├── src/
│   ├── main.rs                # Entry point
│   ├── app.rs                 # App state, init
│   ├── tui/
│   │   ├── mod.rs
│   │   ├── engine.rs          # Terminal setup, raw mode
│   │   ├── event.rs           # Event enum
│   │   ├── layout.rs          # Panel layout
│   │   └── widgets/
│   │       ├── header.rs
│   │       ├── agent_sidebar.rs
│   │       ├── chat.rs
│   │       ├── input.rs
│   │       ├── context_panel.rs
│   │       └── status_bar.rs
│   ├── mcp/
│   │   ├── mod.rs
│   │   ├── hub.rs             # rmcp connection pool
│   │   └── client.rs
│   ├── llm/
│   │   ├── mod.rs
│   │   ├── client.rs
│   │   └── streaming.rs
│   └── session/
│       ├── mod.rs
│       └── persistence.rs
└── .gitignore
```
