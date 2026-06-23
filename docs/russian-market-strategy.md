# NoCowboy — Russian Market Strategy

## What we need to take from each competitor to win Russia

### Claude Code — the gold standard

**Take: permission model + error recovery**

Claude Code's permission system:
- Per-tool granularity (allow Bash, deny Write, always-ask for network)
- Sandbox mode for risky operations
- Approval timeout (auto-deny after N seconds)
- Session-scoped rules (different permissions per project)

**Implementation:** Extend our `nocowboy.json` permission rules with session-scoped overrides, sandbox mode, and timeout-based auto-deny. Our `PermissionPrompt` already exists — add per-tool granularity.

**Take: Agent quality**

Claude Code's agent is better because:
- Better tool selection (chooses the right tool more often)
- Better error recovery (automatically retries with different approach)
- Better context management (keeps relevant info without bloating)

**Implementation:** We can't replicate their RL-trained model. But we CAN:
- Improve our agent prompts (architect, explore, code-reviewer) with Russian-language fine-tuning
- Add automatic retry on common failures (command not found, permission denied, file locked)
- Implement better context windowing (summarize old messages, prioritize recent tool outputs)

### Aider — the benchmark for code understanding

**Take: Repomap (token-optimized repository index)**

Aider's repomap builds a concise codebase mental model using tree-sitter AST parsing + LLM summarization. It fits the entire repo structure in a few hundred tokens. We have tree-sitter WASMs (37 parsers!) but don't generate a repomap.

**Implementation:**
- Use our existing tree-sitter WASMs (already in the binary) to parse the AST
- Generate a token-optimized repo summary (like Aider's `--map-tokens` flag)
- Add `nocowboy repomap` command
- Auto-include repomap in agent context before every code change

**Competitive advantage in Russia:** Russian developers often work with large monorepos (1C, banking systems). A good repomap is critical.

**Take: Search/replace edit format**

Aider uses `SEARCH/REPLACE` blocks for editing — more reliable than line-based edits (which fail when line numbers shift).

**Implementation:** Add search/replace edit format as an option, keeping the existing line-based format as fallback.

### OpenHands — the safety standard

**Take: Sandbox execution**

Russian corporate environments care about security. Running arbitrary AI-generated commands on production machines is unacceptable.

**Implementation:**
- Docker sandbox mode: `nocowboy run --sandbox` runs all bash commands in a container
- Web UI sandbox: OpenHands-like browser interface for team usage
- Read-only mode: agent can only read files, never write

**Priority:** Sandbox mode is the most impactful safety feature for enterprise adoption.

### Cline / Roo Code — the MCP ecosystem leader

**Take: MCP server marketplace**

Cline has the largest MCP server ecosystem because they made it easy for developers to publish servers. We have the plugin system — but no servers published yet.

**Implementation:**
- Publish our 7 first-party MCP servers to npm (blocked on @nocowboy org)
- Create a `nocowboy mcp search` command that queries npm for `@nocowboy/mcp-*`
- Provide a template repo for creating new MCP servers

### Cursor / Copilot — the UX kings

**Take: Zero-config setup**

Copilot works in 30 seconds: install extension, log in, code. We require: install binary, edit nocowboy.json, configure providers, set up MCP servers, configure indexing.

**Implementation:**
- First-run wizard: `nocowboy init` guides through provider setup, MCP server selection, indexing config
- Sensible defaults: ship with DuckDuckGo search (no API key), SQLite (no DB config), local-only mode (no network needed for core)
- Single config entry: merge launch.json into nocowboy.json, eliminate the separate file

## Russian-market-specific requirements

### 1. Russian LLM providers (critical)

No Western AI coding tool supports Russian providers. This is our biggest market opening.

**Must integrate:**
- YandexGPT (Yandex Cloud) — most popular Russian LLM
- GigaChat (Sber) — second largest, strong enterprise presence
- Saiga (Ilya Gusev / Russian open-source) — fine-tuned on Russian data

**Implementation:**
- Add provider configs in the LiteLLM proxy or as direct integrations
- Test with Russian-language code comments and documentation
- Document how to configure (most Russian devs use these APIs)

### 2. 152-FZ compliance (regulatory moat)

No foreign AI coding agent is 152-FZ compliant. This is a hard regulatory requirement for any company processing personal data of Russian citizens.

**Implementation:**
- Data localization: ensure all user data (sessions, prompts, responses) is stored on local disk, never sent to foreign servers
- Consent management: add consent prompts before collecting any personal data
- Right to deletion: `nocowboy forget` command that purges all local data
- Processing policy: document what data is stored and how it's used
- Roskomnadzor notification template: provide a template for companies to file

**This is a regulatory moat.** Claude Code cannot do this. Copilot cannot do this. Only a self-hosted, local-first tool can.

### 3. Offline-first (sanctions resilience)

Western API access is unreliable in Russia (sanctions, payment issues, VPNs). A tool that requires constant internet is useless.

**Implementation:**
- Offline mode: `nocowboy run --offline` uses only local LLM (via Ollama, llama.cpp, or Saiga)
- MCP servers: all first-party servers run locally — no cloud dependency
- Provider fallback: auto-switch to local model when API is unreachable
- Pre-download models: `nocowboy model install saiga-7b` downloads a local model

**This is our strongest defense.** When OpenAI blocks Russian IPs, Claude Code stops working. NoCowboy keeps running.

### 4. Russian-language UX (localization)

Most Russian developers prefer Russian-language interfaces for complex tools. English is fine for code, but explanations, error messages, and documentation should be in Russian.

**Implementation:**
- Translate all agent prompts to Russian (architect, code-reviewer, prd, explore, plan, ralph)
- Russian-language error messages (`t('error.unexpected')` not `"Unexpected error"`)
- Russian-language documentation and tutorials
- Russian-language first-run wizard

### 5. Russian dev ecosystem integrations

**Must integrate:**
- 1C:Enterprise — the most-used ERP in Russia; most Russian devs touch it
- Yandex Cloud / Selectel / VK Cloud — the big three Russian cloud providers
- GitFlic / GitVerse — Russian Git hosting alternatives (sanctions-proof)
- Telegram — primary communication channel for Russian devs
- Битрикс24 / AmoCRM — Russian CRM systems that many devs build for

**Implementation:**
- Git provider plugins: support GitFlic/GitVerse URLs alongside GitHub
- Cloud provider plugins: deploy to Yandex Cloud / Selectel / VK Cloud
- Telegram notifications: `nocowboy channels post` → Telegram bot

### 6. Cost sensitivity

Russian developer salaries are 3-5× lower than US/EU. Enterprise customers pay in rubles. API costs in USD/EUR are proportionally much higher.

**Implementation:**
- Default to cheapest available model (local LLM, then GigaChat free tier, then YandexGPT)
- Show cost estimates before making API calls
- `nocowboy stats cost` — track and report API spending
- Encourage local models as primary, cloud as fallback

## Prioritized action plan

| Priority | Feature | Borrowed from | Russian-market impact |
|---|---|---|---|
| 🔴 P0 | Russian LLM providers (YandexGPT, GigaChat) | Yandex/Sber APIs | CRITICAL — no one else has this |
| 🔴 P0 | Offline mode (local LLM via Ollama) | Self-designed | CRITICAL — sanctions-proof |
| 🔴 P0 | Repomap (token-optimized repo summary) | Aider | High — large Russian monorepos |
| 🟡 P1 | Sandbox execution (Docker mode) | OpenHands | High — enterprise security requirement |
| 🟡 P1 | 152-FZ compliance (data localization, consent) | Regulatory requirement | High — regulatory moat, no competitor has this |
| 🟡 P1 | First-run wizard (`nocowboy init`) | Cursor/Copilot UX | Medium — adoption |
| 🟡 P1 | Search/replace edit format | Aider | Medium — reliability |
| 🟢 P2 | Permission model upgrade (per-tool, timeout) | Claude Code | Medium — safety |
| 🟢 P2 | MCP server marketplace (`mcp search`) | Cline | Low — ecosystem growth |
| 🟢 P2 | Russian-language UX and prompts | In-house | Medium — adoption in non-English-speaking orgs |
| 🟢 P3 | GitFlic / GitVerse support | Russian Git hosts | Low — niche |
| 🟢 P3 | Telegram notifications | In-house | Low — nice to have |
