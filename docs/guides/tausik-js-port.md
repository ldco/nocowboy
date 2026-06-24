# Tausik JS Port Guide

**Status:** IN PROGRESS — JS port exists at `/FABRICA22/nutausik-js/packages/nutausik/`

The Python Tausik (70+ tools) is being ported to TypeScript as **NUTAUSIK**.
The JS port already has a solid foundation.

## Current state (2026-06-24)

| Metric | Count |
|---|---|
| TypeScript source files | 62 |
| Modules | 19 |
| Unit tests | 15 |
| MCP tools defined | 7 |
| Backend schema | 534 lines |
| Package name | `@nocowboy/nutausik` |
| Version | 0.1.0 |

## Modules implemented

| Module | Files | What it does |
|---|---|---|
| `backend/` | 8 | SQLite DB, schema (534L), CRUD, FTS, graph, migrations, metrics, queries |
| `mcp/` | 3 | MCP server entry, tools (7 defined), request handlers |
| `hooks/` | 12 | Session lifecycle hooks: bash-firewall, budgets, git-push-gate, keyword-detect, memory-audit, scope-gate, secret-scan, session-metrics, session-start, task-gate, task-verify, auto-format |
| `service/` | 6 | Business logic: hierarchy, knowledge, session, task, validation, verification |
| `gates/` | 5 | QA gates: command-runner, filesize, stack-dispatch, test-resolver, defaults |
| `verify/` | 4 | Verification: files-hash, git-diff, cache, constants |
| `providers/` | 4 | Search providers: DuckDuckGo (ready), web-search, registry, types |
| `crypto/` | 4 | Ed25519 crypto, keys, receipt, sign |
| `risk/` | 1 | Risk computation |
| `stacks/` | 1 | Decision stacks registry |
| `skills/` | 1 | Skills manager |
| `renar/` | 1 | Renar conformance |
| `model/` | 1 | LLM routing |

## What's still missing from Python Tausik

- [ ] Epics/Stories CRUD (hierarchy.ts has foundations)
- [ ] Full memory graph (graph.ts exists, needs wiring)
- [ ] Roles management
- [ ] Dead end tracking
- [ ] Audit trail
- [ ] 60+ remaining MCP tool definitions (7 done, 63 remaining)
- [ ] Web page fetcher (readability + turndown)
- [ ] Postinstall: `nocowboy mcp install nutausik || true`

## DuckDuckGo search

The DuckDuckGo provider is ready (`providers/duckduckgo.ts`). No API key needed — matches our strategy.

## Publishing

```bash
cd /run/media/ldco/3734114f-7123-41f5-8f63-7f43c94879eb/NEW_ORDER/FABRICA22/nutausik-js/packages/nutausik
npm publish
```

Will be auto-detected by NoCowboy via `require.resolve("@nocowboy/nutausik/dist/index.js")`.
