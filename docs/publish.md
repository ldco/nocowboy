# NoCowboy — npm Publishing Guide

## Package Architecture

One meta-package + two platform binary packages:

| Package | Content | Published from |
|---|---|---|
| `nocowboy` | Meta-package (thin Node.js wrapper) | `packages/nocowboy-cli/` |
| `nocowboy-linux-x64` | Compiled binary for Linux x64 | `dist/nocowboy-tui-linux-x64/` |
| `nocowboy-darwin-arm64` | Compiled binary for macOS ARM64 (M1/M2/M3) | `dist/nocowboy-tui-darwin-arm64/` |
| `@nocowboy/mcp-constitution` | AI Constitution server — code policy enforcement | `packaging/mcp-servers/constitution/` |
| `@nocowboy/mcp-contract-guard` | API contract guard server | `packaging/mcp-servers/contract-guard/` |
| `@nocowboy/mcp-ncp-validator` | NoCowboy Score/Contract guard validator | `packaging/mcp-servers/ncp-validator/` |
| `@nocowboy/mcp-plugin-registry` | Plugin registry server | `packaging/mcp-servers/plugin-registry/` |
| `@nocowboy/mcp-puppetmaster` | PM Framework orchestration server | `packaging/mcp-servers/puppetmaster/` |
| `@nocowboy/mcp-ralph` | Ralph TUI task orchestration server | `packaging/mcp-servers/ralph/` |
| `@nocowboy/mcp-score-engine` | NoCowboy Score evaluation server | `packaging/mcp-servers/score-engine/` |

Note: `puppetmaster` has no `dist/` built yet — needs `cd packaging/mcp-servers/puppetmaster && npm run build` before publishing.

When a user runs `npm install -g nocowboy` or `bun install -g nocowboy`, npm automatically installs only the platform package matching their OS via `optionalDependencies`. The `bin/nocowboy.mjs` wrapper detects the platform and spawns the correct binary.

## Prerequisites

- [bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- npm account with access to publish `nocowboy`, `nocowboy-linux-x64`, `nocowboy-darwin-arm64`
- npm **organization** `@nocowboy` created (for the scoped `@nocowboy/mcp-*` packages)
- Logged into npm: `npm login`

## Step 1 — Build platform binaries

Cross-compiles both Linux x64 and macOS ARM64 binaries on a single Linux machine:

```bash
cd packages/opencode
NOCOWBOY_VERSION=0.5.5 NOCOWBOY_RELEASE=true bun run script/build.ts
```

Outputs:
- `dist/nocowboy-tui-linux-x64/bin/nocowboy` + sidecars (tree-sitter wasms, models-snapshot)
- `dist/nocowboy-tui-darwin-arm64/bin/nocowboy` + sidecars

Each dist directory already contains a valid `package.json` with:
```json
{
  "name": "nocowboy-linux-x64",
  "version": "0.5.5",
  "os": ["linux"],
  "cpu": ["x64"],
  "bin": { "nocowboy": "bin/nocowboy" },
  "files": ["bin/"],
  "preferUnplugged": true
}
```

## Step 2 — Publish platform binary package

```bash
# Publish Linux x64 (from Arch)
cd packages/opencode/dist/nocowboy-tui-linux-x64
npm publish

# Publish macOS ARM64 — build on Mac or cross-compile from Linux
cd packages/opencode/dist/nocowboy-tui-darwin-arm64
npm publish
```

## Step 3 — Publish MCP server packages

Each first-party MCP server is a separate npm package. Publish from the source directory:

```bash
for pkg in constitution contract-guard ncp-validator plugin-registry ralph score-engine; do
  cd packaging/mcp-servers/$pkg && npm publish && cd -
done

# puppetmaster needs dist/ built first:
cd packaging/mcp-servers/puppetmaster && npm run build && npm publish && cd -
```

## Step 4 — Publish meta-package

```bash
cd packages/nocowboy-cli
npm publish
```

The meta-package has `bin: { "nocowboy": "./bin/nocowboy.mjs" }` — a 23-line Node.js
wrapper that resolves the platform-specific binary and spawns it.

## Step 4 — Verify

```bash
npm install -g nocowboy
nocowboy --version
# → 0.5.5
```

**Then verify:**
```bash
npm install -g nocowboy
nocowboy --version    # → 0.6.0
nocowboy mcp status   # → shows configured servers
```

## Bumping version

Update version in all places:
- `packages/nocowboy-cli/package.json` — meta-package version
- `packages/opencode/package.json` — source package (build script fallback)
- `packages/core/src/installation/version.ts` — `NOCOWBOY_VERSION` fallback
- `install.sh` — VERSION for the direct-install script
- All `packaging/mcp-servers/*/package.json` — MCP server versions

Then build: `NOCOWBOY_VERSION=0.6.1 NOCOWBOY_RELEASE=true bun run script/build.ts`

Update the meta-package's optionalDependencies versions to match.

## Files included in each platform package

- `bin/nocowboy` — compiled binary (~155 MB)
- `bin/tree-sitter/*.wasm` — grammar wasm files for code parsing (~50 MB)
- `bin/models-snapshot.json` — bundled LLM model list (~2 MB)
