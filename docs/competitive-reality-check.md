# NoCowboy — Competitive Reality Check (June 2026)

## Honest assessment: where we win, where we lose

We are a small fork of Kilo Code / OpenCode built by one developer. We are NOT Anthropic, NOT OpenAI, NOT Google. Most of these comparisons are aspirational. Here's the truth.

## Where we genuinely win (unique differentiators)

### 1. Shared MCP server architecture
**No one else does this.** Claude Code, Aider, Cline, Goose — every other TUI agent spawns MCP server processes per session. Open 3 sessions = 3 copies of each server. Memory: N sessions × M servers. NoCowboy: 1 set of servers, all sessions connect via HTTP/SSE. Memory stays constant. This is a real architectural win.

### 2. Compiled binary + cross-compilation
We ship a single standalone binary compiled via `bun build --compile`. Most competitors are:
- npm packages (Aider, Plandex, GPT-Engineer) → slow startup, dependency hell
- Python packages (SWE-agent, CrewAI, LangGraph) → even slower, venv management
- Docker images (OpenHands, Devon) → heavy, resource-intensive

Our binary is 162MB (large! this is not a win), but it starts instantly. The trade-off is size vs startup speed.

### 3. Plugin out/plugin in MCP system
`npm install -g @nocowboy/mcp-constitution` → postinstall auto-configures, server starts. This is genuinely unique — no competitor has a package-manager-native MCP plugin system with auto-discovery.

### 4. Provider-agnostic (200+ LLM providers via LiteLLM)
Claude Code = Anthropic only. Codex CLI = OpenAI only. Gemini CLI = Google only. Copilot = GitHub/OpenAI. We route through a local proxy that supports any model. This is real and working.

## Where we are EQUAL (competitive but not ahead)

### 5. Agent capabilities (tool use, reasoning)
We inherit from OpenCode. This puts us on par with OpenCode, Aider, Cline — the second tier. We are NOT at Claude Code / Cursor level. Those have proprietary reinforcement learning, custom-trained models, and years of agent-tuning. Our agent is what OpenCode provides.

### 6. Codebase indexing / RAG
We have built-in indexing (LanceDB → now SQLite vectors). This matches Aider's repomap and Cline's MCP-context. It does NOT match Claude Code's proprietary codebase understanding. We're in the mid-pack here.

### 7. File editing / diff-patching
Inherited from OpenCode. On par with Aider, Cline. Behind Claude Code's editing model.

## Where we LOS (real gaps, no sugar-coating)

### 8. First-run experience
Our database migration takes 30-90 seconds on first run. This is a Kilo Code inheritance we haven't fixed. Claude Code has no visible migration. Aider has no migration. This is a real UX problem we need to solve.

### 9. Agent prompt quality
Our architect agent prompt was stale (2250 chars until I synced it to 8330 chars). We have 6 agents. Claude Code's system prompt is proprietary and battle-tested by a massive team. Aider has a carefully tuned system prompt refined over years. Our prompts are inherited and partially maintained.

### 10. Ecosystem size
NoCowboy = 1 developer, ~2 months active. Claude Code = Anthropic (thousands of employees, billions in funding). This affects:
- Bug fix velocity
- Feature development speed
- Community support
- Documentation quality
- Third-party integrations

### 11. No IDE integration
Claude Code is primarily a CLI but has VS Code integration. Cursor IS an IDE. Copilot IS an IDE extension. Junie IS a JetBrains plugin. We are TUI-only. This limits our market to terminal users.

### 12. No sandbox execution
OpenHands, Devon, SWE-agent run code in Docker containers. We execute code directly on the user's machine. This is a security concern. We have permission rules but no sandbox.

### 13. No Windows support
We build for Linux x64 and macOS ARM64 only. No Windows. No Linux ARM. Most competitors support all three platforms (Aider, Cline, Claude Code, Codex CLI).

### 14. No web UI
OpenHands, Plandex, GPT-Engineer have web UIs. We are TUI-only. Broader market wants a browser-based interface.

### 15. Binary size
162MB uncompressed. This is large. Claude Code's npm package is ~50MB. Aider is a Python package (~10MB). Our binary is bloated by tree-sitter WASM files (50MB) for languages we may never use.

### 16. Database dependency
We require a SQLite database migration on first run. Claude Code and Aider have no persistent database — they work from files and caches. This makes our "first-run experience" slower and adds fragility (what if the DB corrupts?).

### 17. Configuration complexity
We have `nocowboy.json`, `launch.json`, `mcp/` dir, system-wide config, agent prompts, MCP server configs, indexing config. This is flexible but complex. Claude Code has a simple `~/.claude.json`. Aider has a `.aider.conf.yml`. Copilot has zero config.

### 18. No enterprise features
No SSO, no audit logs, no RBAC, no compliance certifications. Factory AI, Augment Code, Qodo CLI all have enterprise features. We don't.

### 19. No established reputation
Claude Code is trusted by thousands of enterprises. Copilot is used by millions. We have zero external users, zero testimonials, zero case studies. This affects adoption.

### 20. Russian-market positioning
We position for the Russian market (152-FZ compliance, Russian law knowledge base). This is a double-edged sword: it differentiates us in one market but limits global appeal. Most Russian developers use English tools.

## Competitor-by-competitor reality

| Competitor | Our genuine advantage | Their genuine advantage |
|---|---|---|
| **Claude Code** | Multi-provider, offline, no account wall | Agent quality, team size, ecosystem, reputation, enterprise trust |
| **Codex CLI** | Multi-provider, MCP plugins | OpenAI ecosystem, model access, team size |
| **Gemini CLI** | Multi-provider, local-first | Google ecosystem, free tier, integration with Google products |
| **Copilot CLI** | Multi-provider, local MCP | GitHub integration, millions of users, IDE integration |
| **Aider** | Compiled binary, shared MCP, MCP plugins | Agent quality (years of prompt tuning), repomap (polished), community |
| **OpenHands** | Compiled binary, TUI-native | Sandbox execution, web UI, Docker-based safety |
| **Cline / Roo Code** | Shared MCP, compiled binary | VS Code integration, large community, active development |
| **Goose (Block)** | Multi-provider, MCP plugins | Backed by Block (Square), MCP-native design, strong docs |
| **Kilo Code** | Shared MCP, embedded proxy, smaller package | (we are a fork — we improved on every metric) |
| **GPT-Engineer** | Compiled binary, MCP architecture | Web UI, simpler setup, brand recognition |

## What the competitive-advantages.md got RIGHT

- Shared MCP architecture IS unique
- Compiled binary IS faster startup than npm/Python tools
- Plugin out/plugin in MCP IS novel
- Provider-agnostic IS a real differentiator vs vendor-locked competitors
- Offline capability IS real

## What the competitive-advantages.md got WRONG (or overstated)

- "Startup in seconds" — only true after the first-run migration. First run is 30-90s.
- "0ms JS parse" — true, but the binary is 162MB (trade-off: instant startup vs large download)
- "One DB engine" — true we replaced LanceDB, but we still have SQLite migration overhead
- "Zero dependencies at runtime" — true for the binary, but `mcp start` depends on npx/uvx/node for MCP servers
- "Performance" comparison to Claude Code — Claude Code's agent quality is far superior, which matters more than startup time for actual coding tasks

## The honest ranking

In raw agent capability (the thing that actually matters for coding):

1. Claude Code (S-tier)
2. Cursor / Copilot (A-tier)
3. Aider / Cline / OpenCode (B-tier)
4. **NoCowboy** (B-tier — same as OpenCode, our fork base)
5. GPT-Engineer / Plandex (C-tier)
6. SWE-agent / Devon (research projects)

In MCP/infrastructure innovation:

1. **NoCowboy** (unique shared architecture)
2. Goose (MCP-native design)
3. Claude Code (MCP support, but basic)

In distribution and DX:

1. Copilot / Cursor (seamless IDE install)
2. Claude Code (npm install, fast)
3. Aider (pip install, simple)
4. **NoCowboy** (compiled binary, fast but large)
5. OpenHands (Docker, heavy)
