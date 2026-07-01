# P2-C1 — Agent Audit: Inventory, Overlaps & Recommendations

**Status:** Proposed | **Roadmap ref:** P2-C1 | **Effort:** Medium

---

## Executive Summary

NoCowboy has **21 agents** across 3 source locations. Two critical **name collisions** exist (`plan`, `explore`). One agent is **deprecated but still shipped** (`orchestrator`). Four agents serve overlapping planning/research roles. Two are **Kilo org project-specific** leaked artifacts.

---

## Complete Agent Inventory

### Layer 1 — Native Agents (`packages/opencode/src/agent/agent.ts`)

Built into the binary. Defined in code, not config files.

| # | Name | Mode | Purpose | Hidden? | Status |
|---|---|---|---|---|---|
| 1 | `code` | primary | Default agent. Executes tools. Anything goes. | No | ✅ Active |
| 2 | `plan` | primary | **Plan MODE.** Read-only except plan files. Disallows edit tools. | No | 🔴 NAME COLLISION |
| 3 | `general` | subagent | Multi-step task execution in parallel. Used by `task` tool. | No | ✅ Active |
| 4 | `explore` | subagent | Codebase exploration. Read+grep+glob+web. No edits. | No | 🔴 NAME COLLISION |
| 5 | `scout` | subagent | External doc/dependency research. Can clone repos. | No | ⚠️ Experimental |
| 6 | `compaction` | primary | Compaction handler. All tools denied. | Yes (hidden) | ✅ Internal |
| 7 | `title` | primary | Title generation. | Yes (hidden) | ✅ Internal |
| 8 | `summary` | primary | Summary generation. | Yes (hidden) | ✅ Internal |

### Layer 2 — NoCowboy Patched (`packages/opencode/src/nocowboy/agent/index.ts`)

Added via `patchAgents()` during state initialization. Modifies Layer 1 in-place.

| # | Name | Mode | Purpose | Hidden? | Status |
|---|---|---|---|---|---|
| 9 | `debug` | primary | Systematic debugging methodology. | No | ✅ Active |
| 10 | `orchestrator` | primary | Coordinate tasks by delegating to specialized agents. | No | 🔴 DEPRECATED |
| 11 | `ask` | primary | Read-only Q&A without code changes. | No | ⚠️ Overlap |

**Layer 2 also patches:**
- Renames `build` → `code` in agent map
- Replaces `plan` permissions with tighter guard
- Enhances `explore` with codebase_search + semantic_search

### Layer 3 — Config Agents (`packaging/config/agent/*.md`)

Loaded from global config directory. User-facing, override Layer 1/2 agents with same name.

| # | Name | Mode | Lines | Purpose | Status |
|---|---|---|---|---|---|
| 12 | `architect` | primary | 159L | Designs systems. ADRs, C4, ISO 25010. Never writes code. | ✅ Active |
| 13 | `code-reviewer` | primary | 158L | Deep codebase audit (8 dimensions). Outputs review PRDs. Also does PR diff reviews. | ⚠️ Split identity |
| 14 | `prd` | primary | 105L | Structured PRD interview. Outputs user stories. | ✅ Active |
| 15 | `ralph` | primary | 91L | Executes PRDs iteratively. Verify → learn → commit → repeat. | ✅ Active |
| 16 | `plan` | primary | 36L | Research agent for planning. Gathers context before presenting a plan. | 🔴 NAME COLLISION |
| 17 | `explore` | primary | 35L | Fast read-only exploration. | 🔴 NAME COLLISION |
| 18 | `ru/architect` | primary | 19L | Russian version of architect. | ⚠️ Stub |

### Layer 4 — Project Agents (`.opencode/agent/*.md`)

Repo-local, only active when working in this project.

| # | Name | Mode | Purpose | Status |
|---|---|---|---|---|---|
| 19 | `triage` | primary | GitHub issue triage (assigns to teams). | 🟡 Kilo org artifact |
| 20 | `duplicate-pr` | primary | Duplicate PR detection. | 🟡 Kilo org artifact |

---

## 🔴 Critical Issues

### Issue 1 — NAME COLLISION: `plan`

| | Built-in `plan` (native) | Config `plan` (packaging) |
|---|---|---|
| Purpose | **Plan MODE.** Read-only, can edit plan files only. | **Implementation RESEARCH.** Gathers context, writes plan.md. |
| Mode restriction | Denies all edit except `.nocowboy/plans/*.md` | "No Write, Edit, Bash, or mutation tools" |
| Conflict | This is a **constraint mode** for the code agent. | This is a **research subagent**. |

**What actually happens:** The config `plan` OVERRIDES the built-in `plan` because the config loop in `agent.ts:298-328` processes config agents last. The native plan mode (which was a critical safety feature — disallowing edits) gets replaced by a research-only agent. However, the `nocowboy/agent/index.ts` `patchAgents()` also patches `plan` with `planGuard()` — but this runs BEFORE config processing. Result: the config agent wins, and the plan MODE is lost.

### Issue 2 — NAME COLLISION: `explore`

| | Built-in `explore` (native) | Config `explore` (packaging) |
|---|---|---|
| Purpose | **Subagent** for code exploration via `task` tool. | **Primary agent** for code exploration. |
| Tools | grep, glob, list, bash, webfetch, websearch, read | grep, glob, read (Read-only) |
| Conflict | Used by OTHER agents as a delegated subagent. | Used directly by the user. |

**What actually happens:** Same override problem. The config `explore` replaces the built-in `explore` subagent. This means when other agents try to delegate to the explore subagent via the `task` tool, they get the config agent instead — which may have different tool permissions.

### Issue 3 — DEPRECATED: `orchestrator`

Still in `nocowboy/agent/index.ts:424-459` with `deprecated: true`. Should be removed or moved to archive. Adds 36 lines of dead code.

### Issue 4 — Kilo Org Artifacts

`triage` and `duplicate-pr` in `.opencode/agent/` are Kilo org project-specific agents. They reference Kilo team names (`tui, desktop_web, core, inference, windows, jetbrains, extension`), Kilo models (`kilo/openai/gpt-5-nano`, `kilo/anthropic/claude-haiku-4.5`), and Kilo-specific MCP tools (`github-triage`, `github-pr-search`). These should be removed or moved to archive.

---

## ⚠️ Overlap Analysis

### Planning/Research Cluster (4 agents)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  architect    │  │     prd      │  │  plan (cfg)  │  │     ask      │
│               │  │              │  │              │  │              │
│ Output: ADRs  │  │ Output: PRDs │  │ Output: plan │  │ Output: text │
│   + plans     │  │  + stories   │  │   .md file   │  │   answers    │
│               │  │              │  │              │  │              │
│ Level:        │  │ Level:       │  │ Level:       │  │ Level:       │
│ Architecture  │  │ Product      │  │ Implement-   │  │ General      │
│               │  │              │  │ ation        │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
      High               Mid              Low              Any
```

**Verdict:** These are NOT true overlaps — they serve distinct levels of abstraction:
- **architect**: System-level architecture (ADR, C4, trade-offs)
- **prd**: Product-level requirements (user stories, acceptance criteria)
- **plan (config)**: Implementation-level research (files to change, risks)
- **ask**: Free-form Q&A (no structured output)

**Recommendation:** Keep all 4. They form a coherent pipeline: `ask` (explore) → `architect` (design) → `prd` (spec) → `plan` (research) → `ralph`/`code` (implement). But the `plan` name collision MUST be resolved.

### Execution Cluster (2 agents)

| | `ralph` | `general` (subagent) |
|---|---|---|
| Protocol | Structured: PRD-driven, verify → learn → commit | Ad-hoc: "execute multiple units of work in parallel" |
| Persistence | Stateful (PRD progress tracking) | Stateless (one-shot) |
| Tool set | Full (code + git + verify + learn) | Full (all tools, except todowrite) |
| Usage | User-facing: "Execute docs/foo.md" | Internal: used by `task` tool from other agents |

**Verdict:** Complementary, not overlapping. `general` is a subagent for delegation. `ralph` is a primary agent for structured execution. Keep both.

### Code Review

`code-reviewer` has two modes in the same prompt:
1. **Deep audit mode**: Full codebase scan across 8 dimensions → outputs `docs/review-<name>.md`
2. **PR diff mode**: Only reviews `git diff origin/main` changed files

**Verdict:** These are different enough that they might benefit from being separate agents or a mode toggle. But low priority.

---

## Gap Analysis

| Gap | Importance | Planned in Roadmap |
|---|---|---|
| **Testing agent** — writes/runs/analyzes tests | Medium | Not planned |
| **Security agent** — OWASP scan, secret detection | High | P3-B1 (Lawer agent, 152-FZ focused) |
| **Database agent** — schema design, migration generation | Low | Not planned |
| **CI/CD agent** — GitHub Actions, deploy pipelines | Low | Not planned |
| **Documentation agent** — generates docs from code | Low | Not planned |
| **Russian agents** — all 6 config agents in Russian | High | P2-B1 (planned) |

---

## Recommendations

### Immediate (this iteration)

| # | Action | Priority |
|---|---|---|
| R1 | **Resolve `plan` name collision.** Rename the config `plan` agent to `researcher` or `implementer`. Restore the built-in `plan` as a safety MODE (read-only + plan files only). | 🔴 Critical |
| R2 | **Resolve `explore` name collision.** Rename the config `explore` agent to `surveyor` or merge it into the built-in `explore` subagent. | 🔴 Critical |
| R3 | **Remove deprecated `orchestrator` agent.** Delete from `nocowboy/agent/index.ts`. | 🟡 High |
| R4 | **Remove Kilo org artifacts.** Delete `triage.md` and `duplicate-pr.md` from `.opencode/agent/`. Move to archive. | 🟡 High |

### Short-term (P2-C completion)

| # | Action | Priority |
|---|---|---|
| R5 | **Audit `code-reviewer` split identity.** Decide: separate agent for PR reviews vs deep audits, or keep as one with mode? | 🟡 Medium |
| R6 | **Fill `ru/architect.md` stub.** Currently 19 lines vs 159 lines (English). Either flesh out or remove. | 🟡 Medium |
| R7 | **Document agent pipeline.** Create `docs/reference/agent-pipeline.md` describing: `ask → architect → prd → plan → ralph → code`. | 🟢 Low |
| R8 | **Standardize agent location.** Move ALL user-facing agents to `packaging/config/agent/`. Don't split between code and config. | 🟢 Low |

### Rename Proposals

| Current Name | Proposed Name | Rationale |
|---|---|---|
| `plan` (config md) | `researcher` | Describes what it actually does — implementation research |
| `explore` (config md) | Merge into built-in `explore` | The built-in subagent has all the same tools. Make it usable as primary mode. |
| `plan` (built-in) | Keep as `plan` | It's a safety MODE, not an agent. Must not be overridable. |

---

## Verification Checklist

- [ ] `nocowboy` lists correct agents with no duplicates
- [ ] Built-in `plan` mode disallows edit tools (safety check)
- [ ] Config `researcher` agent (renamed from `plan`) works and outputs plan files
- [ ] Built-in `explore` works both as subagent (via `task` tool) and as primary agent
- [ ] `orchestrator` agent no longer appears in agent list
- [ ] `triage` and `duplicate-pr` agents no longer appear
- [ ] `ru/architect.md` is either filled out or removed
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No test regressions (agent tests pass)

---

## Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `packaging/config/agent/plan.md` | Rename to `researcher.md` with `name: researcher` |
| 2 | `packaging/config/agent/explore.md` | Delete — merge into built-in explore |
| 3 | `packages/opencode/src/nocowboy/agent/index.ts` | Remove orchestrator agent block (lines 403-459) |
| 4 | `.opencode/agent/triage.md` | Delete or move to archive |
| 5 | `.opencode/agent/duplicate-pr.md` | Delete or move to archive |
| 6 | `packages/opencode/src/agent/agent.ts` | Ensure built-in `plan` is not overridable by config agents |
| 7 | `docs/ROADMAP.md` | Update P2-C1 status |
