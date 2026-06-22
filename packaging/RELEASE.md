# Release process

## Before you start

Make sure you have built the binary and tested it:
```bash
cd packages/opencode
bun run build
```

## Building a new version

One command builds everything and installs the upgrade:

```bash
npm run release 0.3.6
```

This creates:

```
releases/v0.3.6/
├── nocowboy-0.3.6-1-x86_64.pkg.tar.zst   ← Arch Linux (install this)
├── nocowboy-darwin-x64.zip               ← macOS Intel
└── nocowboy-darwin-arm64.zip             ← macOS Apple Silicon
```

### What the release script does

1. `bun run build` — compiles the binary for all platforms
2. Creates macOS .zip archives (from cross-compiled binaries)
3. Creates a source `.tar.gz` with: binary + config + MCP servers + systemd files
4. Runs `makepkg -f` — this:
   a. Extracts the source archive
   b. Runs `npm install --prod` inside each MCP server directory
   c. Packages everything into `.pkg.tar.zst`
5. Copies the `.pkg.tar.zst` to `releases/v0.3.6/`
6. **Stops all KiloCode MCP servers** (frees ports 8200-8219)
7. **Installs the new package** via `pacman -U`

### After install

The `.install` script runs automatically:
- **First install:** Enables all MCP services for all users, starts them now
- **Upgrade:** Compares MCP servers in the new package vs currently enabled ones
  — New servers: enabled + started
  — Removed servers: stopped + disabled
  — Changed servers: restarted
- **Remove:** Stops + disables all NoCowboy MCPs

The MCP services start on every login (`WantedBy=default.target`). They persist
independently of the NoCowboy TUI — shared across instances.

---

## Adding a new MCP server (e.g. for v0.3.6)

1. Copy the server source to `packaging/mcp-servers/<name>/`
2. Run `npm install --prod` inside it (to verify it works)
3. Create `packaging/systemd/nocowboy-mcp-<name>.service`
4. The `.install` file has a `_mcp_services` list — add the new `.service` name there
5. Add its port URL to `packaging/config/nocowboy.json`
6. The `post_upgrade` hook auto-enables and starts new servers on upgrade

The service file template:

```ini
[Unit]
Description=NoCowboy MCP: <name>
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /usr/share/nocowboy/mcp-servers/<name>/dist/index.js
WorkingDirectory=/usr/share/nocowboy/mcp-servers/<name>
Environment=NODE_ENV=production
Environment=PORT=<port>
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

## Removing an MCP server

1. Remove its service file from `packaging/systemd/`
2. Remove its source directory from `packaging/mcp-servers/`
3. Remove its URL entry from `packaging/config/nocowboy.json`
4. Remove it from `_mcp_services` in `packaging/aur/nocowboy.install`
5. The `post_upgrade` hook auto-stops + disables it on upgrade

## Files to update for each version

| File | Change |
|---|---|
| `packaging/aur/PKGBUILD` | `pkgver=0.3.6` |
| `packaging/build-release.sh` | Default `VERSION` at top |

## Manual install (if you already have the .pkg.tar.zst)

```bash
sudo pacman -U releases/v0.3.6/nocowboy-0.3.6-1-x86_64.pkg.tar.zst
```

## Distribute macOS builds

The `.zip` files are standalone — extract and run `./install.sh`. They don't
include MCP servers (macOS doesn't use systemd). MCP servers run on Linux only.
