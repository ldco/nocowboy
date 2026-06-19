# Archived Documentation

**Do NOT implement from files in this directory.** They are preserved for historical reference only.

| File | Deprecated | Reason |
|------|-----------|--------|
| `rust-tui-plan.md` | 2026-06-17 | Rust + Ratatui scratch-build approach. Superseded by fork-plan (TypeScript + OpenTUI). |
| `rust-architecture.md` | 2026-06-17 | 1025-line Rust architecture (C4, event loop, rmcp, plugins). Superseded. MCP hub patterns may be reusable conceptually. |
| `adr-fork-advisory.md` | 2026-06-17 | Recommended forking KiloCode as Go binary. Wrong stack claim — KiloCode is TypeScript, not Go. Competitive analysis still valid, implementation target incorrect. |

## What Was The Rust Era?

Between 2026-06-16 and 2026-06-17, NoCowboy TUI was planned as a ground-up Rust + Ratatui application. Three detailed documents were produced covering:
- Full C4 model architecture (containers, components, data flow)
- Layout system with mouse-driven resize and presets
- Event sourcing session persistence (SQLite WAL)

On 2026-06-17, the decision was made to fork KiloCode instead. KiloCode already has all the infrastructure (LLM streaming, MCP hub, agents, sessions, LSP, plugins) that the Rust plan proposed to rebuild from scratch.

The forked architecture is documented in `../plans/nocowboy-fork-plan.md` and `../adr/adr-001-architecture-platform.md`.
