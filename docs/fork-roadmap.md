# NoCowboy → Fork Roadmap

## P0 — Russian market moats (no Western competitor can do these)

| # | Feature | From | Why nobody else has it |
|---|---|---|---|
| 1 | **Russian LLM providers** (YandexGPT, GigaChat) | Yandex/Sber APIs | Western tools will never integrate Russian APIs |
| 2 | **Offline mode** (local LLM via Ollama/llama.cpp) | Self-designed | When sanctions block APIs, NoCowboy keeps running |
| 3 | **152-FZ compliance** (data localization, consent, right to delete) | Regulatory requirement | No foreign tool can claim Russian data-law compliance |

## P1 — Features stolen from Western competitors (they won't expect this)

| # | Feature | Stolen from | Why it matters for Russia |
|---|---|---|---|
| 1 | **Repomap** — token-optimized repository summary using tree-sitter AST | Aider | Russian monorepos (1C, banking) are huge — need efficient context |
| 2 | **Sandbox execution** — Docker-insulated command execution | OpenHands | Enterprise security — no arbitrary code on production machines |
| 3 | **Permission model upgrade** — per-tool granularity, approval timeout, auto-deny | Claude Code | Safety for corporate environments; prevents destructive accidents |

## P2 — Developer experience (adoption)

| # | Feature | From |
|---|---|---|
| 1 | **First-run wizard** (`nocowboy init`) | Cursor/Copilot UX |
| 2 | **Russian-language prompts + error messages** | In-house |
| 3 | **Search/replace edit format** | Aider |
| 4 | **MCP server marketplace** (`mcp search`) | Cline |

## P3 — Ecosystem integrations

| # | Feature | From |
|---|---|---|
| 1 | **GitFlic / GitVerse support** | Russian Git hosts |
| 2 | **Telegram notifications** | In-house |
| 3 | **Yandex Cloud / Selectel deploy** | In-house |

## Completed

| # | Feature | Status |
|---|---|---|
| 1 | Shared MCP server architecture | ✅ done |
| 2 | Compiled binary (bun build --compile) | ✅ done |
| 3 | Plugin out/plugin in MCP system | ✅ done |
| 4 | Embedded MCP proxy | ✅ done |
| 5 | Provider-agnostic (200+ via LiteLLM) | ✅ done |
| 6 | SQLite vector store (replaced LanceDB) | ✅ done |
| 7 | `nocowboy mcp` lifecycle commands | ✅ done |
| 8 | npm publish pipeline | ✅ ready (blocked by @nocowboy org) |
