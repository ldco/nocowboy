# ADR-001: NoCowboy TUI Platform — Fork KiloCode (TypeScript + OpenTUI)

## Status: Accepted

## Context

NoCowboy TUI needs an agent-centric terminal interface with LLM streaming, MCP orchestration, multi-agent switching, session persistence, and custom quality panels. Three architecture paths were considered:

1. **Build from scratch in Rust (Ratatui)** — maximum control, single binary
2. **Fork KiloCode as Go binary** — based on mistaken assumption about KiloCode's stack
3. **Fork KiloCode as TypeScript + OpenTUI** — leverage existing production infrastructure

The actual KiloCode stack is **TypeScript + OpenTUI (Zig core, Yoga flexbox)**, not Go + Bubble Tea. The existing infrastructure includes 11 operational MCP servers, 5 agents, session persistence, LLM streaming (75+ providers), code indexing, LSP integration, plugin system, and permissions.

## Decision

**Fork KiloCode (TypeScript + OpenTUI). Discard all Rust code.**

## Options Considered

| Option | Effort | Risk | Rationale |
|--------|--------|------|-----------|
| **A. Rust + Ratatui scratch-build** | 6-12 months | High | Rebuilds LLM client, MCP hub, agent system, session mgmt, LSP, plugins from scratch. Largest file in docs (1025 lines) represented this direction — now archived. |
| **B. Fork KiloCode (Go)** | N/A | N/A | Based on incorrect stack information. KiloCode is not Go-based. This advisory is archived with correction note. |
| **C. Fork KiloCode (TypeScript + OpenTUI)** | 4-6 weeks | Low | All core infrastructure exists. Only branding + NoCowboy-specific panels and MCP servers needed. |

## Consequences

**What becomes easier:**
- Time to first branded build: days, not months
- MCP integration: all 11 servers already connected
- Agent ecosystem: architect, prd, ralph, code-reviewer operational
- LLM streaming: 75+ providers via Vercel AI SDK
- Session persistence: SQLite-based, already compacted/pruned
- Plugin system, permissions, LSP, code indexing all inherited

**What becomes harder:**
- No single Rust binary — requires Bun runtime
- OpenTUI is a less-known framework (Zig core) compared to Ratatui
- Branding must clearly distinguish from parent KiloCode

**Risks:**
- Upstream KiloCode changes could cause merge conflicts → thin fork with clear extension points
- OpenTUI framework maturity → already proven in KiloCode v7.3.45 production

## Supersedes

- `archive/rust-tui-plan.md` — Rust scratch-build approach rejected
- `archive/adr-fork-advisory.md` — Contained wrong stack claim (Go). ADR reasoning partially valid but implementation target incorrect.

## Verification

- [x] KiloCode confirmed as TypeScript + OpenTUI (not Go)
- [x] All 11 MCP servers confirmed operational
- [x] All 5 agents confirmed operational
- [x] nocowboy-fork-plan.md is the authoritative implementation document
- [x] All Rust code removed from active docs directory
