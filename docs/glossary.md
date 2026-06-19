# NoCowboy TUI — Glossary

## Core Concepts

| Term | Definition |
|------|-----------|
| **No Cowboy** | The overall product: AI code quality enforcement standard + tooling |
| **NoCowboy TUI** | The terminal application (fork of KiloCode) — chat-first agent with togglable panels |
| **NoCowboy Score** | 0–100% quality metric across 5 dimensions (NCP, Constitution, Contract, Tests, Security) |
| **Code Constitution** | AST-based rule engine that blocks unsafe AI-generated code patterns |
| **No Cowboy Protocol (NCP)** | YAML/JSON spec format for entities, endpoints, and contracts before code is written |

## Three-Level Architecture

| Level | Name | Stage | Mechanism |
|-------|------|-------|-----------|
| **L1** | NCP Protocol | Before Code | YAML/JSON Schema — entities, endpoints, contracts |
| **L2** | AI Governance / Code Constitution | During Code | AST + LLM semantic check — anti-pattern rules |
| **L3** | Live Contract Guard | After Code | API contract validation — backend change → frontend build fails |

## Ecosystem

| Term | Definition |
|------|-----------|
| **Puppet Master (PM)** | AI code generation tool (Nuxt-based). Generates. No Cowboy verifies. |
| **KiloCode** | The OSS terminal agent being forked for NoCowboy TUI. TypeScript + OpenTUI. |
| **OpenTUI** | Zig-core TUI framework using Yoga flexbox for layout |
| **MCP (Model Context Protocol)** | Standardized protocol for AI-tool communication. HTTP or stdio transport. |

## MCP Servers

| Server | Purpose | Transport |
|--------|---------|-----------|
| **constitution** | AST-based code quality rules (TypeScript, Python) | stdio |
| **ncp-validator** | Validate `.ncp` spec files, generate stubs | stdio |
| **contract-guard** | Detect breaking API changes backend ↔ frontend | stdio |
| **score-engine** | Compute NoCowboy Score, track history | stdio |
| **ralph** | PRD-driven autonomous execution engine | stdio |
| **tausik** | Project management: epics, tasks, memory graph | HTTP :8204 |
| **git** | Structured git operations | HTTP :8205 |
| **puppetmaster** | PM framework operations (26 tools) | HTTP :8203 |
| **context7** | Documentation search (20k+ libraries) | HTTP :8200 |
| **sqlite** | Direct SQLite access | HTTP :8201 |
| **puppeteer** | Browser automation | HTTP :8202 |

## Agents

| Agent | Role |
|-------|------|
| **architect** | C4 modeling, ADRs, trade-off analysis, ISO 25010 evaluation |
| **prd** | Structured interview → US-XXX PRD output |
| **ralph** | PRD execution engine — one story at a time, verify → learn → commit |
| **code-reviewer** | 8-dimension deep audit → findings as PRD |
| **ncp** | NCP spec design interviews, `.ncp` file generation (planned) |
| **governor** | Constitution rule enforcement via AST analyzer (planned) |

## Quality Dimensions

| Dimension | Weight | Measures |
|-----------|--------|----------|
| NCP Compliance | 25% | Are all modules covered by `.ncp` specs? |
| Constitution | 30% | Zero AST violations? All rules passing? |
| Contract Integrity | 20% | API contracts consistent frontend ↔ backend? |
| Test Coverage | 15% | Critical paths tested? Negative cases? |
| Security Posture | 10% | No hardcoded secrets? CSRF enforced? Headers set? |

## Storage & Config

| Term | Location |
|------|----------|
| Project config | `nocowboy.json` (project root) |
| MCP servers | `~/.config/kilo/mcp-servers/` |
| Agent prompts | `~/.config/kilo/.kilo/agents/` |
| Instructions | `~/.config/kilo/instructions/` |
| Session storage | `~/.local/share/nocowboy/sessions/` |
| Layout presets | `~/.local/share/nocowboy/layouts/` |
