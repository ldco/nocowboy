# 🐕 Dogfooding Day 1 — July 2, 2026

**v0.7.3 — the first release fit for dogfooding.**

## What "Dogfooding" Means for NoCowboy

We are now developing NoCowboy **using NoCowboy**. The installed `nocowboy` binary on PATH is the development TOOL. The repo (`/fabrica22/NoCowboy/app`) is the TARGET being built.

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   THE TOOL                   │    │   THE TARGET                 │
│   Installed nocowboy binary  │───▶│   NoCowboy source repo       │
│   ~/.config/nocowboy/        │    │   ~/NoCowboy/app/            │
│   ~/.nocowboy/bin/nocowboy   │    │   bun run dev (watch mode)   │
└─────────────────────────────┘    └─────────────────────────────┘
```

**Key principle** (from `docs/archive/dogfooding-strategy.md`): The TOOL and the TARGET are two separate things. Never conflate them.

## Dogfooding Loop

```
edit repo → bun run dev (test dev build) → when stable:
  bun run build → install new nocowboy binary → use newer NoCowboy to develop further
```

## Prerequisites Met (v0.7.3)

| Requirement | Status |
|---|---|
| Config dirs: `.nocowboy` only (no `.kilo/.kilocode/.opencode`) | ✅ |
| Install script: `APP=nocowboy`, `$HOME/.nocowboy/bin` | ✅ |
| Build script: NoCowboy version injection, GitHub releases | ✅ |
| Global config: `~/.config/nocowboy/nocowboy.json` | ✅ |
| All Kilo service infrastructure removed | ✅ |
| All Kilo* namespaces renamed to NoCowboy* | ✅ |
| MCP servers: 8 first-party + 4 community, all managed via UI | ✅ |
| Architect agent: full methodology (ADR, C4, ISO 25010) | ✅ |
| Hooks MCP server: lifecycle hooks + channels | ✅ |
| LSP toggle works in compiled binary | ✅ |
| Logo renders fully (6-line NOCOWBOY) | ✅ |
| DeepSeek prefix-cache optimization (1-line fix, ~30x cheaper) | ✅ |
| Lazy-load tree-sitter WASMs (parallel, targeted) | ✅ |

## What's NOT Yet Done (Active P1.6)

| Item | Status |
|---|---|
| Test harness: ~160 parallelism-only failures | 🚧 |
| httpapi-edit tests (endpoint removed) | ❌ |
| httpapi-public tests (OpenAPI format) | ❌ |
| indexing-startup tests (async) | ❌ |

## Two-Terminal Dev Setup (Active)

- **Terminal 1**: `bun run --cwd packages/opencode dev` — watch mode, auto-reload
- **Terminal 2**: `nocowboy` — the installed tool, used to edit the codebase

## Publish Queue (Blocked)

| Package | Status |
|---|---|
| `nocowboy-linux-x64@0.7.3` | ✅ Built (dogfooding release) |
| `nocowboy` meta-package | ❌ Blocked on npm org |
| `@nocowboy/mcp-*` (6+ servers) | ❌ Blocked on npm org |
| `@nocowboy/nutausik` (62 TS files) | ❌ Blocked on npm org |

## Verification Checklist (Dogfooding Achieved)

- [x] Installed `nocowboy` binary on PATH
- [x] Global config reads from `~/.config/nocowboy/`
- [x] MCP servers connect and are manageable from Settings UI
- [x] Dev mode (`bun run dev`) picks up changes
- [ ] A full feature developed end-to-end using installed NoCowboy (not kilocode)
- [ ] kilocode no longer required for NoCowboy development
