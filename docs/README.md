# NoCowboy TUI — Documentation

**All docs in one folder.** Only `archive/` is separate (deprecated, do not use).

## Reading Order

| # | File | What |

|---|------|------|

| 1 | [`strategy.md`](strategy.md) | Why NoCowboy exists. Philosophy, L1/L2/L3, Puppet Master integration. |

| 2 | [`competitive-landscape-research.md`](competitive-landscape-research.md) | **Deep research:** every AI dev CLI compared. Why NoCowboy wins. |

| 3 | [`plan-fork.md`](plan-fork.md) | **⚠️ AUTHORITATIVE** — fork KiloCode (TS+OpenTUI), 47 features, 6 phases. |

| 4 | [`design-layout.md`](design-layout.md) | TUI views & layout: chat, history, tools, API, git, files, settings, info. |

| 5 | [`glossary.md`](glossary.md) | Terminology: NCP, Score, Constitution, MCP, agents. |

| File | Description |
|------|-------------|
| [`plan-fork.md`](plan-fork.md) | **Authoritative** — fork plan, all 47 features |
| [`plan-constitution-mcp.md`](plan-constitution-mcp.md) | Constitution MCP server — full plan with user stories |
| [`plan-mcp-servers.md`](plan-mcp-servers.md) | NCP validator + Contract Guard + Score Engine (consolidated) |
| [`plan-doc-cleanup.md`](plan-doc-cleanup.md) | This cleanup — how the docs were reorganized |

## Design

| File | Description |
|------|-------------|
| [`design-layout.md`](design-layout.md) | Layout system — chat-first, togglable panels, mouse, presets |
| [`design-session.md`](design-session.md) | Session persistence — event sourcing, SQLite WAL, resume protocol |

## Architecture

| File | Description |
|------|-------------|
| [`adr-001-platform.md`](adr-001-platform.md) | **ADR-001 (Accepted):** Fork KiloCode (TS+OpenTUI), discard Rust |

## Competitive
| [`competitive-landscape-research.md`](competitive-landscape-research.md) | **Deep market research** — catalog of every AI dev CLI, why NoCowboy wins |

| File | Description |
|------|-------------|
| [`competitive-differentiation.md`](competitive-differentiation.md) | Feature matrix vs OpenCode, Claude Code, Aider, Cursor |
| [`competitive-renar-senar.md`](competitive-renar-senar.md) | Deep analysis vs RENAR/SENAR standards |

## Reference

| File | Description |
|------|-------------|
| [`renar-v1.0-draft-ru.pdf`](renar-v1.0-draft-ru.pdf) | RENAR standard (Russian) |
| [`senar-v1.3-en.pdf`](senar-v1.3-en.pdf) | SENAR standard (English) |

## Archive

[`archive/`](archive/) — Superseded Rust/Ratatui docs. **Do NOT implement from these.** Kept for historical reference only.
