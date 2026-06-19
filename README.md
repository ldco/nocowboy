# NoCowboy TUI

**AI under control.** A terminal agent with code quality enforcement. Fork of KiloCode (TypeScript + OpenTUI).

## Status

Working TUI with TopBar, BottomBar navigation, screen switching, and chat. Mouse tracking enabled (`useMouse: true`, `enableMouseMovement: true`). Active development.

## Quick Start

```bash
npm run setup        # Install dependencies (lazygit, nvim, xh, nnn, etc.)
npm run dev          # Start TUI with auto-reload on file changes
```

## What makes it different

| Feature | Anyone else? |
|---------|-------------|
| **Code Constitution** — AST rules block bad AI code | ❌ |
| **Live Contract Guard** — API change breaks frontend build | ❌ |
| **NCP Protocol** — spec before code | ❌ |
| **NoCowboy Score** — single 0-100% quality KPI | ❌ |

## Development

```bash
npm run dev          # TUI with auto-reload (polling every 2s)
npm run typecheck    # TypeScript type checking via turbo
```

The dev server polls for file changes every 2 seconds. Works on all filesystem types including external mounts.

## Views

| View | Button | Shortcut |
|------|--------|----------|
| Chat | default | — |
| API | `API` | Ctrl+A |
| Git | `Git` | Ctrl+G |
| DB | `DB` | Ctrl+D |
| Files | `Files` | Ctrl+O |
| Edit | `Edit` | Ctrl+E |
| Commands | `Commands` | Ctrl+P |
| Settings | `Settings` | Ctrl+, |
| Info | `Info` | F2 |
| History | `History` | Ctrl+H |

Stack: TypeScript, SolidJS, OpenTUI (`@opentui/core@0.4.1`), Yoga flexbox. Bun runtime.
