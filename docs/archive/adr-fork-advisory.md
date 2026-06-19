# [DEPRECATED] ADR-001: NoCowboy TUI — Architecture Advisory (Go Fork)

**Status:** SUPERSEDED by [adr-001-architecture-platform.md](../adr/adr-001-architecture-platform.md)
**Deprecated:** 2026-06-17
**Reason:** This document recommended forking KiloCode as a Go binary. This was based on incorrect information — KiloCode's actual stack is TypeScript + OpenTUI (Zig core), not Go + Bubble Tea. The architecture direction in this document is wrong. Its competitive analysis and ADR reasoning remain valid, but the implementation target is incorrect.
**Correction:** Read [nocowboy-fork-plan.md](../plans/nocowboy-fork-plan.md) for the correct stack (TypeScript + OpenTUI).
**Do NOT implement from this document.**

---

# ADR-001: NoCowboy TUI — Architecture Advisory

**Date:** 2026-06-16
**Status:** Proposed
**Author:** Kilo Architect Agent
**Audience:** Fabrika 22 / Nikita Turuntsev

---

## Executive Summary

You already have a working agent-orchestration TUI (Kilo Code v7.3.45) with 7 MCP servers, 5 specialized agents, and a PRD-driven development workflow. Building a separate TUI from scratch would be a strategic mistake — it would fragment effort, duplicate infrastructure, and delay time-to-market. The correct approach is to **extend and brand** the existing Kilo Code TUI as the NoCowboy TUI, while building NoCowboy's unique value (AST analysis, contract validation, scoring) as pluggable MCP servers and agents.

---

## 1. Current Infrastructure Audit

### 1.1 What You Already Have (~/.config/kilo)

| Component | Status | Quality | Description |
|-----------|--------|---------|-------------|
| **Kilo Code TUI** | ✅ Operational v7.3.45 | Production | Go-based terminal UI with agent switching, session management, MCP integration |
| **Agent: architect** | ✅ Operational | Production | C4 modeling, ADRs, trade-off analysis, ISO 25010 evaluation |
| **Agent: prd** | ✅ Operational | Production | Structured interview → US-XXX PRD output |
| **Agent: ralph** | ✅ Operational | Production | PRD execution engine — one story at a time, verify → learn → commit |
| **Agent: code-reviewer** | ✅ Operational | Production | 8-dimension deep audit → findings as PRD |
| **MCP: context7** | ✅ Operational | Production | 20,000+ library docs on demand |
| **MCP: sqlite** | ✅ Operational | Production | Direct SQLite access |
| **MCP: puppeteer** | ✅ Operational | Production | Browser automation |
| **MCP: puppetmaster** | ✅ Operational | Production | PM framework operations (26 tools) |
| **MCP: tausik** | ✅ Operational | Production | Project management, epics, tasks, memory graph, QA gates |
| **MCP: git** | ✅ Operational | Production | Structured git operations |
| **MCP: ralph** | ✅ Operational | Production | PRD state machine (8 tools, file-based state offload) |
| **Commands** | ✅ Operational | Production | /plan, /act, /commit, /checkpoint, /restore, /diff, /lintcheck, /undo |
| **Instructions** | ✅ Operational | Production | Engineering rules, cybersecurity, repo-map, 152-FZ, aider-features, structured-output |
| **Indexing** | ✅ Operational | Production | Voyage AI + LanceDB semantic code search |

**Assessment:** This is a production-grade agent orchestration platform. 100% of the "TUI for agent-centric development" requirement is already satisfied. The remaining gap is NoCowboy-specific capabilities (NCP protocol, AST analysis, contract guard, scoring).

### 1.2 Kilo Code vs OpenCode

Kilo Code is a **fork of OpenCode** — the same Go-based TUI architecture:

```
Kilo Code Architecture (inherited from OpenCode):
┌─────────────────────────────────────────────────────────┐
│                    TUI (Go + Bubble Tea)                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Agent Panel  │  │ Chat View │  │ File/Session Tabs  │ │
│  └──────┬───────┘  └─────┬────┘  └─────────┬──────────┘ │
│         │                │                  │             │
│  ┌──────┴────────────────┴──────────────────┴──────────┐ │
│  │                Core Engine (Go)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │ │
│  │  │ LLM Client│  │ Tool Mgr │  │ Permission System │ │ │
│  │  └──────────┘  └──────────┘  └───────────────────┘ │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │ MCP Protocol                     │
│  ┌──────────────────────┼───────────────────────────────┐ │
│  │            MCP Servers (external processes)           │ │
│  │  context7 │ sqlite │ puppeteer │ puppetmaster │ ...  │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Kilo Code differences from OpenCode:
- Additional agents (prd, ralph, code-reviewer)
- PM-specific MCP servers (puppetmaster)
- Tausik integration for project management
- Russian law instructions (152-FZ)
- Plan/Act/Checkpoint command system

---

## 2. TUI Framework Analysis

### 2.1 Decision Matrix

| Criteria (weight) | Kilo Code/OpenCode | Bubble Tea (Go) | Ink (Node/React) | Ratatui (Rust) | Textual (Python) | Blessed (Node) |
|---|---|---|---|---|---|---|
| **Already operational** (30%) | ✅ 10/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 |
| **Agent/MCP integration** (25%) | ✅ 10/10 | ⚠️ 5/10 | ⚠️ 4/10 | ⚠️ 3/10 | ❌ 2/10 | ❌ 1/10 |
| **LLM provider support** (15%) | ✅ 10/10 | ⚠️ 5/10 | ⚠️ 5/10 | ⚠️ 3/10 | ⚠️ 3/10 | ❌ 1/10 |
| **LSP integration** (10%) | ✅ 10/10 | ❌ 2/10 | ❌ 2/10 | ❌ 2/10 | ❌ 1/10 | ❌ 0/10 |
| **Semantic code search** (10%) | ✅ 10/10 | ❌ 1/10 | ⚠️ 3/10 | ⚠️ 3/10 | ❌ 1/10 | ❌ 0/10 |
| **Multi-agent support** (5%) | ✅ 10/10 | ❌ 0/10 | ⚠️ 3/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 |
| **Permission system** (5%) | ✅ 10/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 | ❌ 0/10 |
| **Weighted Score** | **10.0** | **3.2** | **3.2** | **1.9** | **1.8** | **0.8** |

### 2.2 Analysis Per Framework

#### Bubble Tea (Go) — Charmbracelet Ecosystem
- **Pros:** Elm Architecture (Model/Update/View), excellent widget library (Bubbles), Lip Gloss for styling. Used by many CLI tools.
- **Cons:** You'd need to rebuild the entire agent loop, LLM client, MCP client, LSP client, permission system, session management from scratch.
- **Verdict:** ❌ Great framework for a greenfield TUI. Not rational when you already have an operational agentic TUI.

#### Ink (Node.js) — React for Terminals
- **Pros:** Component model familiar to web developers, Flexbox layout, Ink UI component library.
- **Cons:** Node.js process overhead, no built-in agent/MCP/LSP support. Would need to build everything.
- **Verdict:** ❌ Good for simple CLI tools, not for a full agent orchestration TUI.

#### Ratatui (Rust) — Immediate Mode Rendering
- **Pros:** Best performance, excellent for data-heavy TUIs.
- **Cons:** Steep learning curve, no built-in agent infrastructure. Building an LLM agent loop in Rust is significant work.
- **Verdict:** ❌ Overkill. Performance is not the bottleneck for an agent TUI.

#### Textual (Python)
- **Pros:** Rich widget system, CSS-like styling, web-browser fallback.
- **Cons:** Python ecosystem for LLM agents is fragmented. No LSP support. No MCP client ecosystem.
- **Verdict:** ❌ Wrong ecosystem for this problem.

#### Blessed (Node.js)
- **Pros:** Mature, DOM-like API.
- **Cons:** Unmaintained (last release 2019). The neo-neo-blessed fork is better but still not agent-focused.
- **Verdict:** ❌ Legacy.

### 2.3 Recommendation

🟢 **High Confidence: Build on Kilo Code, do NOT build a new TUI.**

The question isn't "which TUI framework?" — you already have **the** TUI framework for agent-centric development. Kilo Code IS the TUI. The question is: how to make it the NoCowboy TUI.

---

## 3. Architecture: NoCowboy TUI = Kilo Code + NoCowboy Extensions

### 3.1 C4 Level 1 — System Context

```
┌──────────────────────────────────────────────────────────────────┐
│                         NoCowboy TUI                              │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │  Developer   │──▶│  NoCowboy   │◀──│  LLM Providers          ││
│  │  (Terminal)  │   │  TUI (Go)   │   │  (DeepSeek, Claude,     ││
│  └─────────────┘   │             │   │   OpenAI, local)        ││
│                    │  ┌───────┐  │   └─────────────────────────┘│
│  ┌─────────────┐   │  │ Kilo   │  │                              │
│  │  Puppet      │──▶│  │ Core   │◀──┌─────────────────────────┐│
│  │  Master      │   │  └───┬───┘  │  │  NoCowboy MCP Servers   ││
│  └─────────────┘   │      │      │  │  ┌─────────────────────┐││
│                     │      │ MCP  │  │  │ ncp-validator       │││
│  ┌─────────────┐   │      ├──────┼──│  │ (NCP Protocol)      │││
│  │  Git Repos   │◀──│      │      │  │  ├─────────────────────┤││
│  └─────────────┘   │      │      │  │  │ ast-analyzer        │││
│                     │      │      │  │  │ (TS/Python AST)     │││
│  ┌─────────────┐   │      │      │  │  ├─────────────────────┤││
│  │  Web Browser │◀──│      │      │  │  │ contract-guard      │││
│  │  (Puppeteer) │   │      │      │  │  │ (API contract val)  │││
│  └─────────────┘   │      │      │  │  ├─────────────────────┤││
│                     │      │      │  │  │ score-engine        │││
│  ┌─────────────┐   │      │      │  │  │ (NoCowboy Score)    │││
│  │  DB (SQLite) │◀──│      │      │  │  └─────────────────────┘││
│  └─────────────┘   │      │      │  │  ┌─────────────────────┐││
│                     │      │      │  │  │ Existing MCPs:       │││
│                     │      │      ├──│  │ context7, sqlite,    │││
│                     │      │      │  │  │ puppeteer, pm,       │││
│                     │      │      │  │  │ tausik, git, ralph   │││
│                     │      │      │  │  └─────────────────────┘││
│                     │  ┌───┴───┐  │  └─────────────────────────┘│
│                     │  │Project │  │                              │
│                     │  │ Files  │  │                              │
│                     │  └───────┘  │                              │
│                     └─────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 C4 Level 2 — Container Decomposition

```
NoCowboy TUI = Kilo Code (forked/branded) + NoCowboy Extension Layer

┌─────────────────────────────────────────────────────────────────┐
│                     NoCowboy TUI Binary (Go)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Branding Layer                                           │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐  │  │
│  │  │ NoCowboy   │  │ NoCowboy    │  │ "No Magic, Just   │  │  │
│  │  │ ASCII Logo │  │ Color Theme │  │  Logic" header    │  │  │
│  │  └────────────┘  └─────────────┘  └───────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent System (extended)                                   │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │architect │ │prd        │ │ralph     │ │code-reviewer│ │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └────────────┘ │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────────────┐ │  │
│  │  │ncp       │ │governor   │ │contract-guard (agent)     │ │  │
│  │  │(designer)│ │(auditor)  │ │(integration validator)    │ │  │
│  │  └──────────┘ └───────────┘ └──────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MCP Integration Layer                                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │  │
│  │  │ Existing MCPs │ │ NoCowboy MCPs│ │ Future MCPs       │ │  │
│  │  │ (7 servers)  │ │ (4 servers)  │ │ (IDE plugin, etc) │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Kilo Core (unchanged)                                     │  │
│  │  LLM Client │ Tool Manager │ Permission System │ Session  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 NoCowboy MCP Servers (the real work)

These are what make it "NoCowboy" rather than just "Kilo Code":

#### MCP: `ncp-validator` (L1 — Before Code)
```
Purpose: Validate NCP (NoCowboy Protocol) spec files before implementation
Tools:
  - ncp_validate(filePath) → { valid, errors[] }
  - ncp_generate_stubs(ncpPath, target) → generates typed stubs
  - ncp_diff(oldPath, newPath) → { breakingChanges[] }
Input:  .ncp/*.yaml files
Output: Validation report, generated stubs for Puppet Master
```

#### MCP: `ast-analyzer` (L2 — During Code)
```
Purpose: AST-based code quality analysis with AI governance
Tools:
  - ast_check(fileGlob, rules) → { violations[] }
  - ast_constitution_status() → { rules, active }
  - ast_analyze_diff(commitHash) → { newViolations[], fixedViolations[] }
Rules: no-any-type, no-raw-sql, max-complexity, require-tests, etc.
Tech:   tree-sitter (unified AST for TS/Python/Rust/Go)
```

#### MCP: `contract-guard` (L3 — After Code)
```
Purpose: Live API contract validation at build time
Tools:
  - contract_validate(apiSpec, implementation) → { breaking, compatible }
  - contract_watch() → continuous validation during development
  - contract_report() → full contract compliance report
```

#### MCP: `score-engine` (Visualization)
```
Purpose: Compute and track NoCowboy Score (0-100%)
Tools:
  - score_compute(projectPath) → { score, dimensions{}, history[] }
  - score_badge(projectPath) → SVG badge
  - score_trend() → score over time
Dimensions: NCP compliance, AST violations, contract integrity, test coverage, security
```

### 3.4 NoCowboy Agents

| Agent | Inherits From | New Capability |
|-------|---------------|----------------|
| **ncp** | architect | NCP spec design interviews, `.ncp` file generation |
| **governor** | code-reviewer | Constitution rule enforcement via `ast-analyzer` MCP |
| **contract-guard** | ralph | Contract validation execution, breaking change reports |

---

## 4. Build Strategy: Fork + Brand + Extend

### Phase 1: Brand Kilo Code as NoCowboy TUI (immediate)

```
Actions:
  1. Fork kilocode → nocowboy-tui repository
  2. Replace branding: ASCII logo, color theme (from design/logoRC.svg)
  3. Add "No Cowboy" header/footer in TUI
  4. Change binary name: `kilocode` → `nocowboy`
  5. Replace default agents: architect → ncp, add governor
  6. Ship: `nocowboy --version` → "NoCowboy TUI v0.1.0"

Result: Working TUI with NoCowboy branding in <1 week.
```

### Phase 2: NCP Protocol MCP (weeks 1-2)

```
Actions:
  7. Define .ncp YAML/JSON Schema specification
  8. Build ncp-validator MCP server (Node.js, like ralph MCP)
  9. Create ncp agent (extends architect, outputs .ncp files)
  10. Integrate with Puppet Master: PM reads .ncp to generate stubs
  11. Add Constitution rules as .nocowboyrc YAML

Result: NoCowboy Protocol is operational. PM+NCP pipeline works.
```

### Phase 3: AST Analyzer MCP (weeks 2-3)

```
Actions:
  12. Integrate tree-sitter for TS/JS + Python AST parsing
  13. Implement 5-10 Constitution rules (no-any, no-raw-sql, etc.)
  14. Build ast-analyzer MCP server
  15. Create governor agent (extends code-reviewer)
  16. Add pre-commit hook integration

Result: Code Constitution enforcement in TUI and git hooks.
```

### Phase 4: Contract Guard + Score (weeks 3-4)

```
Actions:
  17. Build contract-guard MCP server (OpenAPI → implementation check)
  18. Build score-engine MCP server
  19. Create contract-guard agent
  20. Add NoCowboy Score to TUI status bar

Result: Full L1+L2+L3 pipeline operational. Score visible in TUI.
```

### Phase 5: CI/CD + Dashboard (weeks 4-6)

```
Actions:
  21. CI/CD integration: GitHub Actions, GitLab CI templates
  22. Nuxt dashboard with project Score, trends, violation history
  23. Badge generation for READMEs: "NoCowboy Approved"
  24. Publish article + open-source the TUI core

Result: Complete NoCowboy ecosystem = TUI + CI + Dashboard.
```

---

## 5. ADR: Why NOT Build a Separate TUI

# ADR-002: Build on Kilo Code, Not a New TUI

## Status: Proposed

## Context
NoCowboy needs a terminal user interface for agent-centric development. Two paths exist:
- **Path A:** Build a new TUI from scratch using Bubble Tea, Ink, Ratatui, or Textual
- **Path B:** Fork and brand the existing Kilo Code TUI (which already does agent-centric development)

## Decision
**Path B — Fork and brand Kilo Code.**

## Options Considered

| Option | Score | Rationale |
|--------|-------|-----------|
| **A. New TUI (Bubble Tea)** | 3/10 | Would require rebuilding: agent loop, LLM client, MCP client, LSP client, permission system, session management, tool approval flow, auto-compaction, semantic search, multi-agent switching, command system. Estimated effort: 6-12 months to reach parity. |
| **B. New TUI (Ink/React)** | 2/10 | Same rebuild problem. React component model is nice but the agent infrastructure is the hard part, not the UI. |
| **C. Fork Kilo Code** | 10/10 | Already operational. All agent infrastructure exists. Only needs branding + NoCowboy-specific MCP servers. Estimated effort: 4-6 weeks to full NoCowboy feature set. |
| **D. Use OpenCode directly** | 8/10 | Viable but Kilo Code already has the agent ecosystem (prd, ralph, code-reviewer) that OpenCode lacks. Kilo Code IS the better starting point. |

## Consequences

**What becomes easier:**
- Time-to-market: 4-6 weeks vs 6-12 months
- Maintenance: one codebase, shared upstream improvements
- Agent ecosystem: prd, ralph, code-reviewer already work
- MCP integration: all 7 servers already connected
- Semantic search: Voyage AI + LanceDB already configured
- Russian law compliance: 152-FZ instructions already loaded

**What becomes harder:**
- Custom UI paradigms — but the existing TUI layout (agent panel + chat + file tabs) is already optimal for agent-centric development
- Framework lock-in to Go — but Go is a good choice for CLI tools (single binary, fast startup, cross-platform)

**Risks:**
- Upstream kilocode changes could cause merge conflicts → mitigate by maintaining a thin fork
- Branding must be clearly distinct from kilocode → addressed in Phase 1

---

## 6. ISO 25010 Quality Attribute Evaluation

| Dimension | Risk | Notes |
|-----------|------|-------|
| **Functional Suitability** | ✅ Low | Kilo Code already covers 100% of agent-centric TUI needs. NoCowboy MCPs add unique capabilities. |
| **Reliability** | ✅ Low | Kilo Code v7.3.45 is production-tested. MCP servers follow the proven ralph MCP pattern. |
| **Performance Efficiency** | ✅ Low | Go binary, fast startup. MCP servers are separate processes (no blocking). Semantic search via LanceDB is millisecond-fast. |
| **Usability** | ⚠️ Medium | Agent switching inside TUI is good. NCP spec editing might need a dedicated mode. Score visibility needs dashboard. |
| **Security** | ✅ Low | Permission system inherited from Kilo Code. MCP runs as separate processes. No secrets in codebase. |
| **Compatibility** | ✅ Low | MCP protocol is standardized. Works with any LLM provider. NCP files are YAML/JSON (universal). |
| **Maintainability** | ✅ Low | Extension via MCP servers (not monolith patches). Each NoCowboy capability is a separate, testable MCP server. |
| **Portability** | ✅ Low | Single Go binary. Linux, macOS, Windows. MCP servers require Node.js 22+ (already standard). |

---

## 7. Edge Case Stress Testing

| Case | Handling |
|------|----------|
| **10× load** (large monorepo) | AST analysis scoped to changed files only. MCP servers can run on separate machines. |
| **100× load** (enterprise) | CI/CD mode for batch analysis. TUI stays responsive by offloading heavy work to MCP. |
| **NCP spec file corruption** | `ncp_validate` returns clear error with line number and context. Parser fails gracefully. |
| **AST parser failure** | Falls back to grep-based rules. Reports "AST unavailable, using regex fallback." |
| **Contract guard false positive** | Override mechanism in `.nocowboyrc`: `ignoreContracts: ["legacy-api"]` |
| **Score engine offline** | TUI shows "Score: N/A" instead of crashing. Score computed on next MCP connection. |
| **Multi-project workspace** | Each project has own `.nocowboyrc` + `.ncp/` directory. Score per project. |
| **No git repo** | Score engine skips git-based metrics. AST analysis still works on filesystem. |

---

## 8. Competitive Positioning

### NoCowboy TUI vs RENAR/SENAR

| Dimension | RENAR/SENAR | NoCowboy TUI |
|-----------|-------------|--------------|
| **Process definition** | 15 normative chapters + 13 standard sections | Inherits Kilo workflow + Constitution rules |
| **Tooling** | None (process documents only) | Operational TUI + MCP servers + CLI + pre-commit hooks |
| **Code-level enforcement** | Spot-check (manual) | AST analysis (automatic, programmatic) |
| **Contract validation** | Prose-based ADAPT | Machine-verifiable NCP (YAML/JSON Schema) |
| **Live integration guard** | Not offered | L3 Contract Guard (unique differentiator) |
| **Quality metric** | FPSR, DER (technical) | NoCowboy Score 0-100% (marketable, intuitive) |
| **Developer experience** | Read spec → apply manually | TUI with real-time feedback, pre-commit integration |
| **Ecosystem** | Self-contained | Puppet Master (generation) + NoCowboy (verification) |
| **License** | CC BY-SA 4.0 (open) | Core TUI open-source, enterprise features paid |

**Winning strategy**: RENAR/SENAR define *what* to do. NoCowboy TUI *does it automatically*. That's the competitive moat.

---

## 9. Verification Checklist

- [ ] Kilo Code fork compiles with NoCowboy branding
- [ ] `nocowboy` binary starts TUI, all existing agents work
- [ ] `ncp-validator` MCP server starts and parses `.ncp` files
- [ ] `ast-analyzer` MCP detects 5+ Constitution rule violations in sample code
- [ ] `contract-guard` MCP detects a breaking API change in sample project
- [ ] `score-engine` MCP computes score for a sample project
- [ ] NoCowboy Score visible in TUI status bar
- [ ] Pre-commit hook blocks violations
- [ ] Puppet Master + NCP integration: PM generates stubs from `.ncp`
- [ ] Article draft: "NoCowboy TUI: AI Under Control"

---

## 10. Summary

```
WHAT TO BUILD:
  NoCowboy TUI = Kilo Code (branded fork)
                + ncp-validator MCP (L1 — Before Code)
                + ast-analyzer MCP   (L2 — During Code)
                + contract-guard MCP (L3 — After Code)
                + score-engine MCP   (Visualization)
                + ncp agent          (Spec designer)
                + governor agent     (Constitution auditor)

WHAT NOT TO BUILD:
  ❌ A new TUI framework from scratch
  ❌ A separate agent orchestration system
  ❌ Custom LLM client or MCP protocol

EXISTING ASSETS TO LEVERAGE:
  ✅ Kilo Code TUI v7.3.45 (Go, operational)
  ✅ 7 MCP servers (context7, sqlite, puppeteer, puppetmaster, tausik, git, ralph)
  ✅ 5 agents (architect, prd, ralph, code-reviewer, summary)
  ✅ PRD-driven workflow (Plan → Execute → Review → Fix)
  ✅ Permission system, auto-compaction, LSP integration
  ✅ Semantic code search (Voyage AI + LanceDB)
  ✅ Russian law instructions (152-FZ)

TIMELINE (not hours, but phases):
  Phase 1 (immediate): Fork + brand Kilo Code as NoCowboy TUI
  Phase 2 (weeks 1-2): NCP Protocol MCP + ncp agent
  Phase 3 (weeks 2-3): AST Analyzer MCP + governor agent
  Phase 4 (weeks 3-4): Contract Guard + Score Engine MCPs
  Phase 5 (weeks 4-6): CI/CD integration + Nuxt dashboard
```

---

*Analysis compiled from: Kilo Code configuration (~/.config/kilo), Ralph MCP server source, NoCowboy Strategy Document v1.0, RENAR/SENAR competitive analysis, and TUI framework ecosystem research (Bubble Tea, Ink, Ratatui, Textual, Blessed).*
