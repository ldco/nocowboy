# NoCowboy — npm Publishing Guide

## Package Architecture

One meta-package + two platform binary packages + first-party MCP server packages:

| Package | Content | Published from |
|---|---|---|
| `nocowboy` | Meta-package (thin Node.js wrapper) | `packages/nocowboy-cli/` |
| `nocowboy-linux-x64` | Compiled binary for Linux x64 | `dist/nocowboy-tui-linux-x64/` |
| `nocowboy-darwin-arm64` | Compiled binary for macOS ARM64 | `dist/nocowboy-tui-darwin-arm64/` |
| `@nocowboy/mcp-<name>` | First-party MCP servers — separate plugins, NOT in meta-package | `packaging/mcp-servers/<name>/` |

**MCP servers are not hardcoded in the meta-package.** Each is published independently with a `postinstall` script that auto-configures it. Plug out/plug in — add or remove servers without touching the core.

### User flow

```bash
# Install core (binary + wrapper)
npm install -g nocowboy

# Install + auto-configure a MCP server
npm install -g @nocowboy/mcp-constitution
# ^ postinstall → nocowboy mcp install constitution → config → started on port 9200+

# Or let nocowboy download it for you
nocowboy mcp install constitution
# → "not found. Install from npm?" → yes → npm install -g → postinstall configures
```

### Plugin lifecycle

| Action | Command |
|---|---|
| Install + auto-configure | `npm install -g @nocowboy/mcp-<name>` |
| Remove | `nocowboy mcp remove <name> && npm uninstall -g @nocowboy/mcp-<name>` |
| Add custom server | `nocowboy mcp add` (interactive dialog) |
| Start all configured | `nocowboy mcp start` |
| Status | `nocowboy mcp status` |

## Prerequisites

- [bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- npm account with access to publish `nocowboy`, `nocowboy-linux-x64`, `nocowboy-darwin-arm64`
- npm **organization** `@nocowboy` created (for the scoped `@nocowboy/mcp-*` packages)
- Logged into npm: `npm login`

## Step 1 — Build platform binaries

```bash
cd packages/opencode
NOCOWBOY_RELEASE=true bun run script/build.ts
```

Outputs:
- `dist/nocowboy-tui-linux-x64/bin/nocowboy` + sidecars (tree-sitter wasms, models-snapshot)
- `dist/nocowboy-tui-darwin-arm64/bin/nocowboy` + sidecars (if cross-compiled from same machine)

Each dist directory contains a valid `package.json` with platform-specific fields (`os`, `cpu`, `bin`, `files`).

## Step 2 — Publish platform binary packages

```bash
cd packages/opencode/dist/nocowboy-tui-linux-x64 && npm publish
cd packages/opencode/dist/nocowboy-tui-darwin-arm64 && npm publish
```

## Step 3 — Publish MCP server packages (independently)

Each server is a **separate npm package**, published independently. No coupling to the core.

```bash
cd packaging/mcp-servers/constitution && npm publish && cd -
cd packaging/mcp-servers/contract-guard && npm publish && cd -
# ... repeat for each server

# puppetmaster needs dist/ built first:
cd packaging/mcp-servers/puppetmaster && npm run build && npm publish && cd -
```

## Step 4 — Publish meta-package

```bash
cd packages/nocowboy-cli && npm publish
```

The meta-package is tiny — just `bin/nocowboy.mjs` (platform wrapper) and `package.json`.

## Step 5 — Verify

```bash
npm install -g nocowboy
nocowboy --version    # → 0.6.0
nocowboy mcp status   # → shows configured servers
npm install -g @nocowboy/mcp-constitution
# → postinstall auto-configures → server starts
nocowboy mcp status   # → constitution running
```

## Bumping version

Update version in all places:
- `packages/nocowboy-cli/package.json` — meta-package version
- `packages/opencode/package.json` — source package (build script source of truth)
- `packages/core/src/installation/version.ts` — `NOCOWBOY_VERSION` fallback
- `install.sh` — `VERSION` for direct-install script
- All `packaging/mcp-servers/*/package.json` — MCP server versions

Then build: `NOCOWBOY_RELEASE=true bun run script/build.ts`

Update the meta-package's `optionalDependencies` versions to match.

## Files in each platform package

- `bin/nocowboy` — compiled binary (~155 MB)
- `bin/tree-sitter/*.wasm` — grammar wasm files for code parsing (~50 MB)
- `bin/models-snapshot.json` — bundled LLM model list (~2 MB)
