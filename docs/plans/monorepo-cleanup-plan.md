# Monorepo Cleanup Plan — Strip KiloCode to NoCowboy Core

**Date:** 2026-06-18
**Status:** Proposed
**Context:** Forked KiloCode monorepo (22 packages, ~2,700 source files). Strip to only NoCowboy TUI essentials.

---

## 1. Keep (9 packages — essential for CLI)

| # | Package | Files | Role |
|---|---------|-------|------|
| 1 | `packages/opencode/` | 790 | **CLI core** — TUI, tools, agents, MCP, server |
| 2 | `packages/core/` | 114 | Core data model, schemas, Zod types |
| 3 | `packages/llm/` | 53 | LLM abstraction — protocols, providers, streaming |
| 4 | `packages/ui/` | 195 | SolidJS + OpenTUI component library |
| 5 | `packages/plugin/` | 6 | Plugin/tool interface system |
| 6 | `packages/sdk/js/` | 39 | Auto-generated TypeScript SDK |
| 7 | `packages/kilo-gateway/` | 36 | Auth, provider routing, Kilo API |
| 8 | `packages/kilo-telemetry/` | 7 | PostHog + OpenTelemetry |
| 9 | `packages/kilo-indexing/` | 85 | Code indexing — tree-sitter, LanceDB |

**Total: 1,325 source files**

## 2. Remove (13 packages)

| # | Package | Files | Disposition |
|---|---------|-------|-------------|
| 10 | `packages/kilo-vscode/` | 342 | **gitignored** — keep locally, remove from git |
| 11 | `packages/kilo-jetbrains/` | 422 | Deleted — Kotlin, Gradle, Java 21 |
| 12 | `packages/kilo-ui/` | 176 | Deleted — web components |
| 13 | `packages/kilo-web-ui/` | 136 | Deleted — web components |
| 14 | `packages/kilo-docs/` | 74+244p | Deleted — Next.js docs |
| 15 | `packages/kilo-console/` | 57 | Deleted — web console |
| 16 | `packages/kilo-i18n/` | 20 | Deleted — translations |
| 17 | `packages/plugin-atomic-chat/` | 23 | Deleted — optional plugin |
| 18 | `packages/http-recorder/` | 9 | Deleted — test infra |
| 19 | `packages/script/` | 1 | Deleted — build scripts |
| 20 | `packages/storybook/` | 0 | Deleted — dev tooling |
| 21 | `packages/containers/` | — | Deleted — Docker CI |
| 22 | `packages/extensions/` | — | Deleted — Zed extension |

## 3. Root Files

| Keep | Remove |
|------|--------|
| `package.json`, `bun.lock`, `bunfig.toml` | `.changeset/`, `.github/` |
| `turbo.json` | `nix/`, `flake.nix`, `flake.lock` |
| `AGENTS.md` | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `PRIVACY.md` |
| `bin/`, `patches/` | `README.ar.md`, `knip.json`, `install` |
| `logo.png` | `AgentManagerApp.tsx` |
| `packages/opencode/AGENTS.md` | — |

## 4. Steps

1. Add `packages/kilo-vscode/` to .gitignore, remove from git tracking
2. `git rm` other 12 packages
3. Update root `package.json` workspaces array
4. Update root scripts (remove extension/docs/jetbrains)
5. Update `turbo.json`
6. Remove `@kilocode/plugin-atomic-chat` from opencode deps
7. Remove root files listed above
8. `bun install`
9. Verify CLI compiles and runs

## 5. Verification

- [ ] `bun install` succeeds
- [ ] CLI compiles: `bun run packages/opencode/src/index.ts --version`
- [ ] No references to removed packages in opencode
- [ ] Root workspaces list is clean
- [ ] `.gitignore` includes `packages/kilo-vscode/`
- [ ] VS Code extension stays locally
