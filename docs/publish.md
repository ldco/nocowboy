# NoCowboy — npm Publishing Guide

## Package Architecture

One meta-package + two platform binary packages:

| Package | Content | Published from |
|---|---|---|
| `nocowboy` | Meta-package (thin Node.js wrapper) | `packages/nocowboy-cli/` |
| `nocowboy-linux-x64` | Compiled binary for Linux x64 | `dist/nocowboy-tui-linux-x64/` |
| `nocowboy-darwin-arm64` | Compiled binary for macOS ARM64 (M1/M2/M3) | `dist/nocowboy-tui-darwin-arm64/` |

When a user runs `npm install -g nocowboy` or `bun install -g nocowboy`, npm automatically installs only the platform package matching their OS via `optionalDependencies`. The `bin/nocowboy.mjs` wrapper detects the platform and spawns the correct binary.

## Prerequisites

- [bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- npm account with access to publish `nocowboy`, `nocowboy-linux-x64`, `nocowboy-darwin-arm64`
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

## Step 2 — Publish platform binary packages

```bash
# Publish Linux x64
cd packages/opencode/dist/nocowboy-tui-linux-x64
npm publish

# Publish macOS ARM64
cd packages/opencode/dist/nocowboy-tui-darwin-arm64
npm publish
```

## Step 3 — Publish meta-package

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

## Bumping version

Update version in all three places:
- `packages/nocowboy-cli/package.json` — meta-package version
- `packages/opencode/package.json` — source package (for build script fallback)
- `packages/core/src/installation/version.ts` — `NOCOWBOY_VERSION` fallback

Then pass to build: `NOCOWBOY_VERSION=0.5.6 NOCOWBOY_RELEASE=true bun run script/build.ts`

## Files included in each platform package

- `bin/nocowboy` — compiled binary (~155 MB)
- `bin/tree-sitter/*.wasm` — grammar wasm files for code parsing (~50 MB)
- `bin/models-snapshot.json` — bundled LLM model list (~2 MB)
