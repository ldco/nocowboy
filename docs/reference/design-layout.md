# NoCowboy TUI — Views & Layout

**Date:** 2026-06-18
**Status:** Current
**Platform:** TypeScript + OpenTUI (Yoga flexbox)
**Based on:** `plan-fork.md` + user spec 2026-06-17

---

## 1. Core Principle: Chat-Only Default

The default view is **just the chat window** — no side panels, no splits. All other functionality is accessed as separate views that replace or overlay the chat. This keeps focus on the conversation.

**NoCowboy has NO automatic layout state changes.** The UI never changes on its own. All state changes are triggered by:
- Buttons (bottom bar)
- Keyboard shortcuts
- Clicking files (file → appropriate viewer)

---

## 2. Top Bar (Always Visible)

```
┌── Top Bar ─────────────────────────────────────────────────────────────┐
│ ◆ ~/project  master ∅  Score: --  ○                                   │
└────────────────────────────────────────────────────────────────────────┘
```

| Position | Element | Example | Source |
|----------|---------|---------|--------|
| Left | Logo icon | `◆` | — |
| Left | Working directory (short) | `~/.../app` | `process.cwd()`, click to copy full path |
| Left-center | Git branch + status | `master ∅` / `master ✚3 △1` | `.git/HEAD` + `git status --porcelain` |
| Right | NoCowboy Score | `Score: 87` | score-engine (placeholder: `--`) |
| Right | Status indicator | `●` (green) / `○` (red) | Connection health, MCP/LSP errors |

The directory path is shortened (`~/.../app` instead of full path). Click the path to copy the full path to clipboard.

Git status uses ZSH-style symbols:
- `∅` — clean working tree (green)
- `✚ N` — N files staged (green)
- `△ N` — N files unstaged (yellow)

The status indicator is:
- `●` green — everything connected, no errors
- `○` red — something wrong (no API, MCP error, LSP error) — check Info screen

---

## 3. Bottom Bar (Always Visible)

The bottom bar is the main navigation panel. Shows clickable buttons for all screens. Active screen highlighted in brand orange.

```
┌── Bottom Bar ──────────────────────────────────────────────────────────┐
│ Chat  API  Git  DB  Files  Edit  Settings  Info  History              │
└────────────────────────────────────────────────────────────────────────┘
```

All buttons are clickable (using OpenTUI native `onMouseDown` events). The active screen is highlighted in brand orange (`#ff6800`).

| Button | Shortcut | Action |
|--------|----------|--------|
| Chat | default | Chat conversation |
| API | `Ctrl+A` | HTTP API client (xh, embedded in TUI) |
| Git | `Ctrl+G` | Git client (lazygit, embedded in TUI) |
| DB | `Ctrl+D` | Database client (lazysql, embedded in TUI) |
| Files | `Ctrl+O` | File browser (nnn, embedded in TUI) |
| Edit | `Ctrl+E` | Text editor (neovim, embedded in TUI) |
| Settings | `Ctrl+,` | Config: agents, providers, themes, shortcuts, MCP |
| Info | `F2` | Diagnostics: MCP, tokens, context, indexing, LSP |
| History | `Ctrl+H` | Session browser by date |

All buttons are configurable in `nocowboy.json`.

---

## 4. Views (Navigable Screens)

Navigation is explicit — user triggers via button click OR keyboard shortcut.

| # | View | Button | Shortcut | Opens | Replaces Chat? |
|---|------|--------|----------|-------|---------------|
| 1 | **Chat** | default | — | Main conversation with collapsible Q&A | — (default) |
| 2 | **History** | — | `Ctrl+H` | Session browser, accordion by date | Overlays |
| 3 | **Tools** | — | `Ctrl+T` | MCP tool browser | Overlays |
| 4 | **API** | `api` | `Ctrl+A` | HTTP API client (xh/httpie, method/URL/headers/body/response) | Replaces |
| 5 | **Git** | `git` | `Ctrl+G` | Git client (lazygit, embedded in TUI panel) | Replaces |
| 6 | **DB** | `db` | `Ctrl+D` | Database client (lazysql, embedded in TUI panel) | Replaces |
| 7 | **Files** | `files` | `Ctrl+O` | File browser (nnn, embedded in TUI panel) | Overlays |
| 8 | **Text Editor** | `edit` | `Ctrl+E` or From Files | Text editor (neovim, embedded in TUI panel) | Overlays |
| 9 | **MD Viewer** | — | From Files | Rendered markdown preview (internal) | Overlays |
| 10 | **Image Viewer** | — | From Files | Terminal image render (viu, embedded) | Overlays |
| 11 | **Settings** | — | `Ctrl+,` | Full config: agents, providers, themes, shortcuts, MCP | Replaces |
| 12 | **Info** | — | `F2` | Diagnostics: MCP status, tokens, context, code indexing, LSP | Replaces |

### Dependencies

All external tools are installed automatically when you run `npm run setup` or during system install:

| Tool | Purpose | Install method |
|------|---------|---------------|
| [lazygit](https://github.com/jesseduffield/lazygit) | Git panel | `apt`/`brew`/`dnf` |
| [xh](https://github.com/duca/xh) | HTTP API client | `apt`/`brew`/`cargo` |
| [lazysql](https://github.com/jorgerojas26/lazysql) | Database client | `brew`/`go install` |
| [nnn](https://github.com/jarun/nnn) | File browser | `apt`/`brew`/`dnf` |
| [neovim](https://github.com/neovim/neovim) | Text editor | `apt`/`brew`/`dnf` |
| [viu](https://github.com/atanunq/viu) | Image viewer | `cargo`/`brew` |

Users don't need to install these manually — NoCowboy handles it.

### File → Viewer Interaction

The file browser (`Ctrl+O`) opens files in the appropriate viewer:

| File type | Click action | Viewer |
|-----------|-------------|--------|
| `.md`, `.markdown` | Click on file | **MD Viewer** renders Markdown with syntax highlighting, scroll, link following |
| `.png`, `.jpg`, `.gif`, `.svg` | Click on file | **Image Viewer** renders via `viu` (term image), falls back to external viewer |
| `.ts`, `.js`, `.py`, `.rs`, `.go`, any code | Click on file | **Text Editor** opens in `$EDITOR` (nvim), suspends TUI, resumes on exit |
| `.json`, `.yaml`, `.toml`, config files | Click on file | **Text Editor** — same as code |
| `.txt`, `.log`, any text | Click on file | **Text Editor** — same as code |

When TUI suspends for external git/text editor, it resumes on exit with updated state (git status refreshes in top bar, file tree refreshes).

---

## 5. Chat View (Default)

```
┌── Top Bar ─────────────────────────────────────────────────────────────┐
│ 🔫 ~/project  │  master ∅  │  ralph · DeepSeek V4 Pro DeepSeek · medium  │  87  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ▶  "How do I add NextAuth?"              2 prompts · 3m ago          │
│  ▶  "Fix the login bug"                   1 prompt  · 12m ago         │
│                                                                        │
│  ─── Current ───────────────────────────────────────────────────       │
│                                                                        │
│  User: Execute docs/user-auth.md                                       │
│                                                                        │
│  ralph: Loading US-001...                                              │
│         Implementing password hashing...                               │
│         ████████████░░░░░░ 60%                                         │
│                                                                        │
│  ┌─ Tool: git_git_status ───────────────────────────────────────────┐  │
│  │ On branch master, nothing to commit, working tree clean          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ralph: Running constitution check...                                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ > _                                                              🎤    │
├── Bottom Bar ──────────────────────────────────────────────────────────┤
│ Chat  API  Git  DB  Files  Edit  Settings  Info  History             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. History View (Ctrl+H)

Scrollable session browser. Overlays or splits the chat.

```
┌── Top Bar ─────────────────────────────────────────────────────────────┐
│ (same)                                                                 │
├──────────────────────────┬─────────────────────────────────────────────┤
│     SESSION BROWSER      │               CHAT (background)             │
│                          │                                             │
│  📅 Today                │  ▶  "How do I add NextAuth?"               │
│  ─────────────────       │                                             │
│  ▼ "Add auth to Next.js" │                                             │
│    ▸ "How do I add..."   │                                             │
│    ▸ "Is middleware..."  │                                             │
│    ▸ "Add CSRF too"      │                                             │
│                          │                                             │
│  📅 Yesterday            │                                             │
│  ─────────────────       │                                             │
│  ▸ "Setup CI/CD"         │                                             │
│  ▸ "Review PRD"          │                                             │
│                          │                                             │
│  ▸ "Refactor DB"         │                                             │
│                          │                                             │
├──────────────────────────┴─────────────────────────────────────────────┤
│ (bottom bar)                                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. API Tool View (Ctrl+A)

HTTP API client. Like Postman in the terminal.

```
┌── API Tool ───────────────────────────────────────────────────────────┐
│                                                                        │
│  Method: [GET ▼]  URL: https://api.example.com/users/42               │
│                                                                        │
│  ┌── Headers ───────────────────────────────────────────────────────┐ │
│  │  Authorization: Bearer eyJ...                                     │ │
│  │  Content-Type:  application/json                                  │ │
│  │  [+ Add header]                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌── Request Body ──────────────────────────────────────────────────┐ │
│  │  (empty for GET)                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  [Send]  (Ctrl+Enter)                                                 │
│                                                                        │
│  ┌── Response ──────────────────────────────────────────────────────┐ │
│  │  Status: 200 OK  │  Time: 142ms  │  Size: 1.2KB                   │ │
│  │                                                                    │ │
│  │  { "id": 42, "email": "user@example.com", "name": "John Doe" }    │ │
│  │                                                                    │ │
│  │  [Copy]  [Format JSON]  [Save as .http]                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
├── Bottom Bar ──────────────────────────────────────────────────────────┤
│ API │  Esc back to chat                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Git View (Ctrl+G)

Suspends NoCowboy TUI, launches lazygit. On lazygit exit, TUI resumes with updated git status in top bar.

---

## 9. Files View (Ctrl+O)

File tree with preview pane. Clicking a file opens the appropriate viewer.

```
┌── Files ──────────────────────────┬── Preview ─────────────────────────┐
│                                   │                                    │
│  src/                             │  1  import { hash } from ...       │
│    components/                    │  2                                 │
│    pages/                         │  3  export function login(         │
│      index.ts                     │  4    email: string,               │
│      login.ts          ← selected│  5    password: string             │
│      profile.ts                   │  6  ): Promise<User> {            │
│    utils/                         │  7    const hash = await ...       │
│      auth.ts                      │  8    ...                         │
│      db.ts                        │                                    │
│  tests/                           │                                    │
│  docs/                            │                                    │
│                                   │                                    │
│  Enter: open in editor/viewer    │  Tab: switch to full editor        │
│  Esc: back to chat               │  Scroll: preview content           │
│                                   │                                    │
├── Bottom Bar ─────────────────────┴── Files ───────────────────────────┤
│ Files │  Esc back  │  tab: toggle preview  │  Enter: open file          │
└────────────────────────────────────────────────────────────────────────┘
```

| File type | Enter/Click opens |
|-----------|-------------------|
| `.md` file | MD Viewer (internal render) |
| `.png`, `.jpg` | Image Viewer (viu) |
| Any code/text file | Text Editor (`$EDITOR` or internal) |

---

## 10. MD Viewer

Opens from Files view when clicking a `.md` file. Full Markdown rendering with syntax highlighting.

```
┌── MD Viewer: docs/design-layout.md ────────────────────────────────────┐
│                                                                        │
│  # NoCowboy TUI — Views & Layout                                       │
│                                                                        │
│  ## 1. Core Principle: Chat-Only Default                              │
│  The default view is **just the chat window** — no side panels...     │
│                                                                        │
│  Scroll: ↑↓  │  Follow link: Enter  │  Esc: back to Files             │
│                                                                        │
├── Bottom Bar ──────────────────────────────────────────────────────────┤
│ MD Viewer │  F1 help  │  Esc back                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Text Editor

Opens `$EDITOR` (nvim by default). Suspends TUI. On exit, file tree refreshes and git status updates in top bar.

Can also be triggered directly via:
- Bottom bar button `edit`
- Keyboard shortcut `Ctrl+E`

---

## 12. Image Viewer

Opens `viu` for terminal image rendering. Falls back to external viewer if `viu` not available.

---

## 13. Info Screen (F2)

Diagnostic dashboard. Replaces chat view.

```
┌── Info ────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ┌── MCP Connections ───────────────────────────────────────────────┐  │
│  │  context7        ● connected    http://127.0.0.1:8200   12ms     │  │
│  │  sqlite          ● connected    http://127.0.0.1:8201   3ms      │  │
│  │  puppeteer       ● connected    http://127.0.0.1:8202   45ms     │  │
│  │  tausik          ◐ slow         http://127.0.0.1:8204   890ms    │  │
│  │  git             ● connected    http://127.0.0.1:8205   5ms      │  │
│  │  ralph           ● connected    stdio                     —       │  │
│  │  constitution    ○ disconnected stdio                     —       │  │
│  │  [Reconnect all]                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Token Usage ───────────────────────────────────────────────────┐  │
│  │  This session:    12,847 tokens  │  Cost: $0.38                   │  │
│  │  This story:       3,241 tokens  │  Cost: $0.11                   │  │
│  │  Total (project): 142,891 tokens │  Cost: $4.27                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Context Window ────────────────────────────────────────────────┐  │
│  │  Tokens used:    45,281 / 128,000   (35%)                         │  │
│  │  Messages:       142                                              │  │
│  │  Files in scope: 12                                               │  │
│  │  Auto-compaction trigger:    85% (108,800 tokens)                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── LSP ───────────────────────────────────────────────────────────┐  │
│  │  TypeScript:    ● active    v5.9    ts-server                     │  │
│  │  JSON:          ● active    v1.0    json-server                   │  │
│  │  CSS:           ● active    v1.0    css-server                    │  │
│  │  [Restart all LSP servers]                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
├── Bottom Bar ──────────────────────────────────────────────────────────┤
│ Info │  F5 refresh  │  Esc back to chat                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 14. What Goes Where (Decision Summary)

| Information | Location | Trigger |
|-------------|----------|---------|
| Logo + directory | **Top bar** — always visible | — |
| Git status | **Top bar** — always visible | — |
| Agent · Model Provider · Mode | **Top bar** — always visible | — |
| NoCowboy Score | **Top bar** — always visible | — |
| Current view name | **Bottom bar** — always visible | — |
| Token usage + cost | **Bottom bar** — always visible | — |
| Action buttons | **Bottom bar** — always visible | Button click or keyboard shortcut |
| MCP connection details | **Info screen (F2)** | Button: F2 |
| Token breakdown | **Info screen (F2)** | Button: F2 |
| Context window usage | **Info screen (F2)** | Button: F2 |
| LSP server status | **Info screen (F2)** | Button: F2 |
| Chat history | **History view (Ctrl+H)** | Shortcut: Ctrl+H |
| MCP tools | **Tools view (Ctrl+T)** | Shortcut: Ctrl+T |
| API client | **API view (Ctrl+A)** | Button: `api` or Ctrl+A |
| Git | **Git view (Ctrl+G)** | Button: `git` or Ctrl+G |
| File browser | **Files view (Ctrl+O)** | Button: `files` or Ctrl+O |
| File editing | **Text Editor** | Button: `edit` or Ctrl+E, or click file in Files |
| Markdown preview | **MD Viewer** | Click .md file in Files |
| Image preview | **Image Viewer** | Click image file in Files |
| Settings | **Settings view (Ctrl+,)** | Shortcut: Ctrl+, |

---


## 15. Navigation Summary

| Key/Button | Action |
|------------|--------|
| `Chat` button | Chat conversation (default) |
| `API` button / `Ctrl+A` | HTTP API client (xh) |
| `Git` button / `Ctrl+G` | Git client (lazygit) |
| `DB` button / `Ctrl+D` | Database client (lazysql) |
| `Files` button / `Ctrl+O` | File browser (nnn) |
| `Edit` button / `Ctrl+E` | Text editor (neovim) |
| `Settings` button / `Ctrl+,` | Config: agents, providers, themes, shortcuts, MCP |
| `Info` button / `F2` | Diagnostics: MCP, tokens, context, indexing, LSP |
| `History` button / `Ctrl+H` | Session browser by date |
| `Tab` | Switch agent |
| Click path in TopBar | Copy full path to clipboard |

## 16. NoCowboy Layout Rules

1. **No automatic layout changes.** The UI never changes on its own. All state changes are user-triggered.
2. **Chat is always the default.** If no view is active, show chat.
3. **Views replace or overlay chat.** They never split the main chat area.
4. **Bottom bar is always visible.** Navigation buttons and status are always one keypress away.
5. **File type determines viewer.** Click a file → it opens in the appropriate viewer (text editor, MD viewer, image viewer).
6. **External tool suspend/resume.** Git (lazygit) and text editor (nvim) suspend the TUI and resume on exit.

---

## 17. Color System

### NoCowboy Dark

```
Background:   #1a1b26 (Tokyo Night dark)
Surface:      #24283b
Border:       #414868
Text:         #c0caf5
Primary:      #ff6800 (NoCowboy Orange)
Success:      #9ece6a
Warning:      #e0af68
Error:        #f7768e
Info:         #7dcfff
```

---

## 18. Implementation

- **Framework:** OpenTUI + SolidJS (not raw OpenTUI)
- **Language:** TypeScript (Bun runtime)
- **Navigation:** Bottom bar buttons + keyboard shortcuts
- **Viewers:** Text editor (`$EDITOR`), MD viewer (OpenTUI Markdown), Image viewer (viu)
- **Config:** `nocowboy.json` for shortcuts, theme, panel defaults
