# NoCowboy TUI

**AI under control.** A terminal agent (TUI) that enforces code quality before production.

Built with TypeScript, SolidJS, [OpenTUI](https://opentui.com), Yoga flexbox. Bun runtime.

### What makes it different

| Feature | Anyone else? |
|---------|-------------|
| **Code Constitution** — AST rules block bad AI code before it's written | ❌ |
| **Live Contract Guard** — API changes break frontend builds | ❌ |
| **NCP Protocol** — spec-first development (define before code) | ❌ |
| **NoCowboy Score** — 0-100% quality metric with CI/CD gating | ❌ |

All existing tools (Claude Code, Cline, Aider, Cursor) make you faster.  
**NoCowboy makes you safer.**

---

## Quick start

```bash
npm run setup          # Install system deps (lazygit, nvim, xh, nnn, etc.)
npm run dev            # Start the TUI with auto-reload on file changes
```

---

## Views

| View | Button | Shortcut | Description |
|------|--------|----------|-------------|
| Chat | — | default | AI agent conversation |
| API | `API` | `Ctrl+A` | HTTP API client (xh) |
| Git | `Git` | `Ctrl+G` | Git client (lazygit) |
| DB | `DB` | `Ctrl+D` | Database client (lazysql) |
| Files | `Files` | `Ctrl+O` | File browser (nnn) |
| Edit | `Edit` | `Ctrl+E` | Text editor (neovim) |
| Commands | `Commands` | `Ctrl+P` | Command palette |
| Settings | `Settings` | `Ctrl+,` | Configuration |
| Info | `Info` | `F2` | Diagnostics: MCP, tokens, context |
| History | `History` | `Ctrl+H` | Session browser |

---

## Architecture

```
packages/
├── opencode/              # ⭐ CLI — TUI, agents, tools, MCP, server
├── core/                  # Data model, schemas (upstream opencode)
├── ui/                    # SolidJS + OpenTUI component library
├── llm/                   # LLM abstraction layer
├── plugin/                # Plugin/tool interface
├── sdk/js/                # Auto-generated TypeScript SDK
├── kilo-gateway/          # Gateway stubs (Kilo API removed)
├── kilo-indexing/         # Code indexing (tree-sitter, LanceDB)
├── kilo-telemetry/        # Telemetry stubs (Kilo backend removed)
├── kilo-vscode/           # VS Code extension (gitignored, kept for later)
├── kilo-jetbrains/        # JetBrains plugin (gitignored, kept for later)
└── containers/            # Docker build files
```

---

## Development

```bash
npm run dev                # TUI with file polling (every 2s)
npm run typecheck          # TypeScript check via turbo (10 packages)
```

The dev server polls for file changes every 2 seconds. This works on all filesystems including external mounts (unlike `bun --watch`).

---

## Quality system (planned)

| Layer | Stage | What |
|-------|-------|------|
| **L1 — NCP** | Before code | YAML spec (entities, endpoints, contracts) |
| **L2 — Constitution** | During code | AST rules + LLM checks (no `any`, raw SQL, secrets) |
| **L3 — Contract Guard** | After code | API contract validation at build time |
| **Score** | Continuous | 0-100% across 5 weighted dimensions |

---

## Dependencies

External tools installed via `npm run setup`:

- [lazygit](https://github.com/jesseduffield/lazygit) — Git panel
- [xh](https://github.com/duca/xh) — HTTP API client
- [lazysql](https://github.com/jorgerojas26/lazysql) — Database client
- [nnn](https://github.com/jarun/nnn) — File browser
- [neovim](https://github.com/neovim/neovim) — Text editor
- [viu](https://github.com/atanunq/viu) — Image viewer

---

## License

MIT (inherited from KiloCode/OpenCode)
