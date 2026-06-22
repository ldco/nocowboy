![NoCowboy](logo.svg)

# NoCowboy TUI

**AI under control.** A terminal agent (TUI) that enforces code quality before production.

Built with TypeScript, SolidJS, [OpenTUI](https://opentui.com), Yoga flexbox. Bun runtime.

### What makes it different

| Feature | Anyone else? |
|---------|-------------|
| **Code Constitution** — AST rules block bad AI code before it's written | ❌ |
| **Live Contract Guard** — API changes break frontend builds | ❌ |
| **NoCowboy Score** — 0-100% quality metric (planned) | ❌ |

All existing tools make you faster.  
**NoCowboy makes you safer.**

---

## Installation

### Arch Linux (AUR)

```bash
yay -S nocowboy
# or: paru -S nocowboy
```

The AUR package installs the binary to `/usr/bin/nocowboy` with default config at `/usr/share/nocowboy/config/`. Run `nocowboy` to start.

### macOS (Homebrew)

```bash
brew install ldco/nocowboy/nocowboy
```

After install, run the setup script to populate your user config:
```bash
/usr/local/share/nocowboy/install.sh
```

### Manual install (any platform)

Download the archive for your platform, extract, and run the bundled installer:

```bash
# Linux
tar xzf nocowboy-linux-x64.tar.gz
cd nocowboy
./install.sh

# macOS
unzip nocowboy-darwin-x64.zip
cd nocowboy
./install.sh
```

The archive contains the binary, installer, and default config (agents, commands, instructions, skills). The installer copies everything to `~/.nocowboy/bin/` and `~/.config/nocowboy/`.

### Build from source

```bash
bun install
NOCOWBOY_RELEASE=true bun run build
# Archive is at dist/nocowboy-linux-x64.tar.gz
```

---

## Quick start

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
└── nocowboy-gateway/      # Gateway stubs
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

Closed-source commercial. See LICENSE.md.
