# [AUTHORITATIVE — single source of truth for NoCowboy TUI implementation]

# NoCowboy TUI — Fork & Extend KiloCode Implementation Plan

**Date:** 2026-06-17
**Status:** Proposed
**Decision:** Fork KiloCode (TypeScript + OpenTUI). Discard all Rust ratatui code. Single product, single install, sellable.

---

## 1. Product Identity

NoCowboy TUI is a **chat-first terminal agent** with togglable panels, built as a branded fork of KiloCode (itself a fork of OpenCode/OpenTUI). It adds quality enforcement, project management, and a multi-pane IDE-like experience — but **chat is always the primary visible area**. All other panels (agents, session browser, git, terminal) are toggled on/off via customizable keyboard shortcuts.

### Shared DNA

```
OpenCode (MIT, 176k stars)
  └── fork ──→ KiloCode (v7.3.45)
       └── fork ──→ NoCowboy TUI  ← THIS PROJECT
```

### What We Keep From KiloCode (unchanged)
- LLM streaming (75+ providers via Vercel AI SDK)
- MCP hub (7 shared HTTP daemons on ports 8200-8205)
- Agent system (architect, prd, ralph, code-reviewer)
- Session persistence + auto-compaction + prune
- Code indexing (Voyage AI + LanceDB, later self-hosted)
- LSP integration (Tree-sitter)
- Plugin system
- Permissions system
- Slash commands
- Instructions (cybersecurity, 152-FZ, engineering rules, etc.)
- Speech-to-text (Whisper via ostt.ai)

### What We Change
- **Branding**: ASCII logo, color theme (NoCowboy Orange #ff6800), binary name `nocowboy`
- **TUI layout**: Chat-first, togglable panels, collapsible conversation history
- **New panels**: Agent sidebar, session browser, git panel, embedded terminal
- **New widgets**: NoCowboy Score gauge, Constitution violation display
- **New features**: Theme switching, customizable shortcuts, STT mic button

---

## 2. TUI Layout

### Default View (Chat-First)

```
┌── Header ────────────────────────────────────────────────────┐
│ 🔫 ~/project  │  master ✚3 △1  │  Score: 87  │  ralph ●     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ▶  "How do I add NextAuth?"           (collapsed Q&A)       │
│  ▶  "Fix the login bug"               (collapsed Q&A)        │
│                                                               │
│  User: Execute docs/user-auth.md       (EXPANDED — current)  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ralph: Starting US-001...                               │  │
│  │       Implementing password hashing...                  │  │
│  │       ████████████░░░░░░ 60%                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ > _                                                      🎤   │
├── Status ─────────────────────────────────────────────────────┤
│ ralph ● │ tausik ● │ git ● │ sqlite ● │ ctx7 ● │ F1 help     │
└───────────────────────────────────────────────────────────────┘
```

### Togglable Panels

| Panel | Position | Default Shortcut | Customizable |
|-------|----------|-----------------|--------------|
| Agent sidebar | Left | Ctrl+B | Yes |
| Session browser | Right | Ctrl+H | Yes |
| Git panel | Bottom | Ctrl+G | Yes |
| Embedded terminal | Bottom | Ctrl+` | Yes |
| File browser | Right/Bottom | Ctrl+O | Yes |

All shortcuts configurable in `nocowboy.json` settings.

### Panel States

```
┌──────────────────┬──────────────────────────────────────────┐
│ AGENTS (Ctrl+B)  │              MAIN CHAT                   │
│                  │                                          │
│ ● ralph (active) │  Collapsed Q&A #1                        │
│ ○ architect      │  Collapsed Q&A #2                        │
│ ○ governor       │  ─────────────────────                   │
│ ○ ncp            │  CURRENT CONVERSATION (expanded)         │
│ ─────────────    │  User: ...                               │
│ + new agent      │  Agent: ...                              │
├──────────────────┴──────────────────────────────────────────┤
│ SESSIONS (Ctrl+H) — right panel when toggled                │
│ 📅 Today                                                   │
│   ▼ "Add auth to Next.js" (3 prompts)                      │
│     ▸ "How do I add NextAuth?"                              │
│     ▸ "Is there middleware needed?"                         │
│     ▸ "Add CSRF too"                                        │
│   ▸ "Fix login bug" (2 prompts)                             │
│   ▸ "Refactor database layer"                               │
│ 📅 Yesterday                                               │
│   ▸ "Setup CI/CD pipeline"                                  │
│   ▸ "Review PRD for user-auth"                              │
└─────────────────────────────────────────────────────────────┘
```

### Chat Collapse Behavior
- **New question submitted** → previous conversation collapses to just show the user's prompt
- **Click collapsed prompt** → expands that conversation inline
- **Session browser** → accordion of all past chat sessions, organized by date
- **Expand session** → shows all user prompts from that session
- **Click prompt** → navigates main chat to that point

---

## 3. Complete Feature Inventory (48 Features)

### Phase 1: Fork & Brand (Core Identity)
| # | Feature | Description |
|---|---------|-------------|
| F1 | Fork KiloCode | Clone repo, rename to nocowboy-tui |
| F2 | Branding | ASCII logo, NoCowboy Orange (#ff6800) theme, binary name `nocowboy` |
| F3 | Color theme switching | Toggle between themes (NoCowboy Dark, Drakyla, Light). `Ctrl+T` shortcut, also in settings |
| F4 | Settings file | `nocowboy.json` config for themes, shortcuts, panel defaults |
| F5 | Customizable shortcuts | All keybindings configurable via settings |
| F6 | Single install | `npm install -g nocowboy` or compiled binary via `bun build --compile` |

### Phase 2: Chat UX (Core Interaction)
| # | Feature | Description |
|---|---------|-------------|
| F7 | Collapsible Q&A | New question → previous Q&A collapses to prompt-only |
| F8 | Expand/collapse | Click collapsed prompt → expands full conversation inline |
| F9 | Session browser panel | Right panel: accordion of all past chat sessions by date |
| F10 | Session prompts list | Expand session → shows all user prompts from that session |
| F11 | Navigate to prompt | Click prompt in session browser → jumps main chat to that point |
| F12 | Send-queue / Force interrupt | **Normal Enter** while AI processing → queues message (status bar shows "📨 N queued"). **Ctrl+Enter** → force interrupt: stops LLM stream, cancels pending tool calls, sends immediately. Status bar shows queue count, clickable to manage. Like Codex VS Code / Cursor force-send. |
| F48 | Speech-to-text mic button | 🎤 icon in input area → triggers STT via ostt.ai (OpenAI-compatible endpoint) |

### Phase 3: Togglable Panels
| # | Feature | Description |
|---|---------|-------------|
| F48 | Agent sidebar | Left panel with agent list, active indicator, switch on click |
| F48 | Dynamic agent switching | Click agent → changes active agent, updates system prompt |
| F48 | Agent status indicator | ● active, ○ idle, ◐ busy |
| F48 | Git panel | Bottom panel: git status, staged/unstaged diff, stage files, commit |
| F48 | Embedded terminal | Bottom panel: native terminal emulator within TUI |
| F48 | File browser | File tree navigation within TUI |
| F48 | Panel toggle shortcuts | All customizable, persist to settings |
| F48 | Panel resize | Drag borders with mouse, keyboard resize (Ctrl+arrows) |

### Phase 4: NoCowboy Quality Features
| # | Feature | Description |
|---|---------|-------------|
| F48 | NoCowboy Score widget | 0-100% gauge with 5 dimensions visible in TUI |
| F48 | Score breakdown | NCP Compliance, Constitution, Contract Integrity, Test Coverage, Security |
| F48 | Score trend tracking | ↑/↓ indicator, mini sparkline of last 10 sessions |
| F48 | Constitution violation display | Inline in chat when AI generates bad code, with Fix/Ignore/Override actions |
| F48 | Pre-commit hook integration | Blocks commit on violations, shows in TUI |
| F48 | NCP Protocol validator | Validate .ncp YAML/JSON spec files |
| F48 | Contract Guard | API breaking change detection, side-by-side diff in TUI |
| F48 | Score gate for CI/CD | Score ≥ threshold to merge/deploy |

### Phase 5: Header & Status Bar
| # | Feature | Description |
|---|---------|-------------|
| F48 | ZSH-style header | Working directory, git branch + status symbols, score, active agent, session time |
| F48 | Git status symbols | ✚ staged, △ unstaged, ↑ ahead, ↓ behind, ⚡ stash, ⛔ conflict, ✗ deleted, ? untracked, ∅ clean |
| F48 | MCP health status bar | ● connected, ◐ slow, ○ disconnected. Click for detail popup |
| F48 | Keyboard hints | Context-dependent shortcut hints in status bar |

### Phase 6: External Tool Integration
| # | Feature | Description |
|---|---------|-------------|
| F48 | Suspend/resume lazygit | Ctrl+G or custom → suspend TUI, launch lazygit, return on exit |
| F48 | Suspend/resume nvim | Open files in $EDITOR from within TUI |
| F48 | Suspend/resume nnn | File manager integration |
| F48 | Suspend/resume viu | Terminal image viewing |

### Phase 7: Infrastructure Enhancements
| # | Feature | Description |
|---|---------|-------------|
| F48 | Self-hosted embeddings | Replace Voyage AI with Qwen3-Embedding-0.6B on Timeweb VDS |
| F48 | Vision bridge revival | Local image description via gemma3:4b (from archive) |
| F48 | MCP health monitoring | Daemon status visible in status bar, auto-reconnect |
| F48 | Agent versioning | Track which agent prompt version was used for each session |
| F48 | Per-project settings | Project-level nocowboy.json overrides |
| F48 | 152-FZ compliance UI | Roskomnadzor checklist, consent management tools |

### Phase 8: Product & Commercial
| # | Feature | Description |
|---|---------|-------------|
| F48 | Nuxt Score Dashboard | Web UI for CTOs showing project scores, trends, violations |
| F48 | Audit report generation | Automated compliance reports (152-FZ, security, quality) |
| F48 | NoCowboy Approved badge | SVG badge for READMEs, CI/CD |
| F48 | CI/CD templates | GitHub Actions, GitLab CI integration |
| F48 | Commercial licensing | Enterprise features, support SLA |

---

## 4. Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| TUI Framework | OpenTUI (Zig core, Yoga flexbox) |
| Language | TypeScript (Bun runtime) |
| LLM Client | Vercel AI SDK (inherited from OpenCode/KiloCode) |
| MCP Transport | Streamable HTTP (rmcp-compatible) |
| Session Store | SQLite (inherited) |
| Code Indexing | Voyage AI + LanceDB → Qwen3 (self-hosted later) |
| Plugin System | Existing plugin architecture |
| Permissions | Existing rules engine |
| Config | JSON (`nocowboy.json`) |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                NoCowboy TUI (TypeScript)                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  TUI Layer (OpenTUI — Yoga flexbox)              │     │
│  │                                                   │     │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │     │
│  │  │ Header │ │ Agent  │ │ Chat   │ │ Session  │  │     │
│  │  │ Bar    │ │Sidebar │ │ Panel  │ │ Browser  │  │     │
│  │  └────────┘ └────────┘ └────────┘ └──────────┘  │     │
│  │  ┌────────┐ ┌────────┐ ┌────────┐               │     │
│  │  │ Input  │ │ Git    │ │Terminal│               │     │
│  │  │ Area   │ │ Panel  │ │ Panel  │               │     │
│  │  └────────┘ └────────┘ └────────┘               │     │
│  │  ┌────────┐ ┌──────────┐                         │     │
│  │  │ Status │ │ Score    │                         │     │
│  │  │ Bar    │ │ Widget   │                         │     │
│  │  └────────┘ └──────────┘                         │     │
│  └──────────────┬──────────────────────────────────┘     │
│                 │                                         │
│  ┌──────────────▼──────────────────────────────────┐     │
│  │  Core Engine (inherited from KiloCode)            │     │
│  │                                                   │     │
│  │  LLM Client │ MCP Hub │ Agent Mgr │ Session Mgr   │     │
│  │  Permissions│ Plugins │ LSP       │ Code Index     │     │
│  └──────────────────────┬───────────────────────────┘     │
│                         │ MCP (HTTP + stdio)               │
│  ┌──────────────────────┼───────────────────────────┐     │
│  │          MCP Servers (external, unchanged)         │     │
│  │  context7 │ sqlite │ puppeteer │ pm │ tausik │ git │     │
│  │  ralph │ constitution │ ncp │ contract │ score     │     │
│  └───────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## 5. File Structure

```
app/
├── package.json                  # Updated: name=nocowboy-tui
├── nocowboy.json                 # Default settings (theme, shortcuts, panels)
├── src/
│   ├── tui/                      # NEW: TUI layer replacements
│   │   ├── layout.ts             # Chat-first layout, togglable panels
│   │   ├── panels/
│   │   │   ├── header.ts         # ZSH-style header bar
│   │   │   ├── agents.ts         # Agent sidebar
│   │   │   ├── chat.ts           # Chat panel with collapsible Q&A
│   │   │   ├── input.ts          # Input area with mic button
│   │   │   ├── sessions.ts       # Session browser (right panel)
│   │   │   ├── git.ts            # Git panel (bottom)
│   │   │   ├── terminal.ts       # Embedded terminal
│   │   │   ├── files.ts          # File browser
│   │   │   ├── status.ts         # Status bar with MCP health
│   │   │   └── score.ts          # NoCowboy Score widget
│   │   ├── themes/
│   │   │   ├── nocowboy-dark.ts  # Default theme (#ff6800 orange)
│   │   │   ├── drakyla.ts        # Alternative dark theme
│   │   │   └── light.ts          # Light theme
│   │   └── settings.ts           # Keyboard shortcut customization
│   ├── stt/
│   │   └── ostt.ts               # ostt.ai integration (OpenAI-compatible)
│   └── ...                       # All other KiloCode code (unchanged)
├── docs/
│   ├── plans/
│   │   └── nocowboy-fork-plan.md # This document
│   └── architecture/
│       └── ...                   # Retained design docs
└── Dockerfile                    # Single-binary build
```

---

## 6. Delivery Phases

### Phase 1: Fork & Brand (immediate)
```
Actions:
  1. Fork kilocode → app/ repository
  2. Rename package: kilocode → nocowboy-tui
  3. Replace ASCII logo + color theme → NoCowboy Orange #ff6800
  4. Binary name: `kilocode` → `nocowboy`
  5. Create nocowboy.json default settings
  6. Ship: `nocowboy --version` → "NoCowboy TUI v0.1.0"

Features delivered: F1-F6
```

### Phase 2: Chat UX (weeks 1-2)
```
Actions:
  7. Implement collapsible Q&A in chat panel
  8. Build session browser panel (right, togglable)
  9. Accordion sessions by date
  10. Show all user prompts per session
  11. Click prompt → navigate main chat
  12. Integrate ostt.ai STT with mic button

Features delivered: F7-F13
```

### Phase 3: Togglable Panels (weeks 2-3)
```
Actions:
  13. Build agent sidebar with dynamic switching
  14. Build git panel (status, diff, stage, commit)
  15. Build embedded terminal
  16. Build file browser
  17. Implement panel toggle system with customizable shortcuts
  18. Mouse-driven panel resize

Features delivered: F13-F20
```

### Phase 4: NoCowboy Quality (weeks 3-5)
```
Actions:
  19. Build NoCowboy Score widget (0-100%, 5D, trend)
  20. Integrate Constitution violations display in TUI
  21. Pre-commit hook integration
  22. NCP Protocol validator UI
  23. Contract Guard diff viewer in TUI
  24. Score gate for CI/CD

Features delivered: F21-F28
```

### Phase 5: Polish & Infrastructure (weeks 5-7)
```
Actions:
  25. ZSH-style header with git status symbols
  26. MCP health status bar with detail popups
  27. External tool suspend/resume (lazygit, nvim, nnn, viu)
  28. Self-hosted embeddings migration
  29. Vision bridge revival
  30. 152-FZ compliance tools
  31. Per-project settings

Features delivered: F29-F42
```

### Phase 6: Product & Commercial (weeks 7-10)
```
Actions:
  32. Nuxt Score Dashboard
  33. Audit report generation
  34. NoCowboy Approved badge
  35. CI/CD templates
  36. Commercial licensing

Features delivered: F43-F47
```

---

## 7. What Gets Deleted

All Rust code in the current `src/` directory:
- `src/main.rs`, `src/app.rs`, `src/config.rs`, `src/theme.rs`
- `src/tui/` (engine, event, layout, 7 widgets)
- `src/llm/`, `src/mcp/`, `src/session/`
- `Cargo.toml`, `Cargo.lock`
- `nocowboy.toml` (replaced by `nocowboy.json`)

The new codebase lives entirely in `app/` as a TypeScript/OpenTUI project forked from KiloCode.

---

## 8. ADR: Why Fork KiloCode (Not Build From Scratch)

**Status:** Accepted

**Context:** NoCowboy TUI needs an agent-centric terminal TUI with LLM streaming, MCP hub, session management, plugin system, and permissions. Two paths exist:
- **Path A (chosen):** Fork KiloCode (TypeScript + OpenTUI), extend with NoCowboy features
- **Path B (rejected):** Build from scratch in Rust (ratatui) — the current `src/` codebase

**Decision:** Fork KiloCode. Discard all Rust code.

**Rationale:**
- KiloCode already has: 75+ LLM providers, 11 MCP servers, 5 agents, session persistence, compaction, LSP, code indexing, plugin system, permissions, slash commands, instructions
- Building these from scratch in Rust: 6-12 months to reach parity
- Forking: 2-4 weeks to brand, then incremental feature delivery
- OpenTUI gives flexbox layout, Code/Markdown/Diff components for free
- Single language (TypeScript), single runtime (Bun), single install

---

## 9. Verification Checklist

### Phase 1
- [ ] `nocowboy` binary starts TUI with NoCowboy branding
- [ ] NoCowboy Orange color theme applied
- [ ] Theme switching works (Ctrl+T or settings)
- [ ] `nocowboy.json` settings loaded correctly
- [ ] All existing KiloCode features work unchanged

### Phase 2
- [ ] New question collapses previous Q&A
- [ ] Click collapsed prompt expands full conversation
- [ ] Session browser shows all past sessions by date
- [ ] Accordion expand shows all prompts in session
- [ ] Click prompt navigates main chat to correct position
- [ ] Mic button triggers STT via ostt.ai, text appears in input

### Phase 3
- [ ] Agent sidebar toggles with Ctrl+B
- [ ] Click agent switches active agent
- [ ] Git panel shows status, diff, can stage and commit
- [ ] Embedded terminal works within TUI
- [ ] File browser navigates project tree
- [ ] Panel shortcuts customizable via settings
- [ ] Mouse drag resizes panels

### Phase 4
- [ ] Score widget shows 0-100% with 5 dimensions
- [ ] Score trend sparkline visible
- [ ] Constitution violations appear inline in chat
- [ ] Violations block pre-commit
- [ ] NCP validator warns on invalid specs
- [ ] Contract Guard shows breaking API changes

### Phase 5
- [ ] Header shows git branch + status symbols
- [ ] MCP status dots in status bar
- [ ] Click MCP dot → detail popup
- [ ] Suspend/resume works for lazygit, nvim, nnn, viu
- [ ] Per-project nocowboy.json overrides work

### Phase 6
- [ ] Score Dashboard web UI accessible
- [ ] Audit report generates correctly
- [ ] Badge renders in markdown

---

## 10. Edge Case Stress Testing

| Case | Handling |
|------|----------|
| MCP server down | Status bar shows ○ disconnected, click for reconnect |
| LLM stream interrupted | Partial response shown, retry button available |
| Terminal resize | Yoga flexbox auto-reflows layout |
| 10,000 chat sessions | Session browser paginates/virtualizes |
| Unicode/emoji in messages | OpenTUI handles full Unicode |
| STT unavailable (no mic) | Mic icon grayed out, tooltip "No microphone" |
| Missing API key | Graceful error, link to settings |
| Plugin crash | Plugin disabled, TUI continues |
| Session file corruption | Fallback: fresh session |
| Concurrent tool calls | MCP hub handles parallel dispatch |

---

## 11. Summary

```
START:    KiloCode v7.3.45 (TypeScript + OpenTUI)
          Operating daily, 11 MCP servers, 5 agents

DELETE:   All Rust ratatui code in src/
          ~2,000 lines, 7 widgets, MCP hub, LLM client

FORK:     KiloCode → app/ (TypeScript + OpenTUI)
          Keep: LLM, MCP, agents, sessions, indexing, LSP, plugins, permissions

BUILD:    48 features across 6 phases
          Phase 1: Brand + settings (F1-F6)
          Phase 2: Chat UX — collapsible QPhase 2: Chat UX — collapsible Q&A, session browser, STT (F7-F12)A, session browser, force interrupt, STT (F7-F13)
          Phase 3: Togglable panels — agents, git, terminal, files (F13-F20)
          Phase 4: NoCowboy quality — score, constitution, contract guard (F21-F28)
          Phase 5: Polish — header, MCP health, external tools, infra (F29-F42)
          Phase 6: Product — dashboard, audit, licensing (F43-F47)

SHIP:      Single binary. Single install. Single product.
           `npm install -g nocowboy` or compiled binary.
           No separate KiloCode + NoCowboy needed.
