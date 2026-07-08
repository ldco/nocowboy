# NUTAUSIK — Strategic Analysis

**Date:** 2026-06-24 | **Status:** Analysis — decision pending

## What is Tausik?

Tausik is a Python MCP server (~70 tools) that provides project management capabilities.
Currently in `~/.kilo/mcp-servers/tausik/`. Needs porting to JS as `@nocowboy/mcp-tausik`.

The JS fork is called **NUTAUSIK** (New Tausik).

## Tausik's feature set (70+ tools)

| Category | Tools | What it does |
|---|---|---|
| **Epics/Stories/Tasks** | `epic_create`, `story_create`, `task_create`, `task_update`, `task_delete`, etc. | Full project management hierarchy |
| **Memory Graph** | `memory_create`, `memory_link`, `memory_query` | Cross-session knowledge graph between tasks, decisions, explorations |
| **QA Gates** | `gate_create`, `gate_check`, `gate_pass` | Quality assurance checkpoints between workflow stages |
| **Sessions** | `session_start`, `session_end`, `session_summary` | Time tracking + session summaries linked to tasks |
| **Roles** | `role_assign`, `role_list` | Role-based assignment in projects |
| **Stacks** | `stack_create`, `stack_push`, `stack_pop` | Decision/context stacks (LIFO reasoning) |
| **Decisions** | `decision_record`, `decision_review` | Lightweight ADR-like decision tracking |
| **Explorations** | `exploration_start`, `exploration_complete` | Spike/research tracking |
| **Dead Ends** | `deadend_record` | Failed approaches — prevents repetition |
| **Verify** | `verify_task`, `verify_epic` | Automated verification against acceptance criteria |
| **Audit** | `audit_trail`, `audit_report` | Full audit log of all project management actions |

## Overlap analysis: Tausik vs NoCowboy existing/planned

| Tausik feature | NoCowboy equivalent | Overlap | Recommendation |
|---|---|---|---|
| **Epics/Stories/Tasks** | Ralph MCP (PRD → beads → stories) | **HIGH** — both manage hierarchical tasks | Merge into NUTAUSIK. Ralph is PRD-driven; NUTAUSIK adds free-form PM. |
| **Memory Graph** | MiMo FTS5 memory + MEMORY.md + /dream | **MEDIUM** — both store cross-session knowledge | Keep MiMo memory for file-based knowledge. NUTAUSIK memory graph for relational task→decision→exploration links. |
| **QA Gates** | /goal judge + /verify | **HIGH** — both verify completion | Merge into NUTAUSIK. Goal judge is token-level; NUTAUSIK adds structured gate stages. |
| **Sessions** | NoCowboy sessions + session-memory (deprecated) | **LOW** — different scope | Keep NoCowboy sessions for AI context. NUTAUSIK sessions for human time tracking. Separate concerns. |
| **Roles** | None | **NONE** — missing | **Add to NUTAUSIK** or keep as config |
| **Stacks** | None | **NONE** — missing | **Add to NUTAUSIK** — unique feature |
| **Decisions** | /plan → ADRs in docs/adr/ | **MEDIUM** — ADRs are formal; decisions are lightweight | Keep both. ADRs for big decisions, decisions for small ones. |
| **Explorations** | explore agent (read-only code analysis) | **LOW** — different purpose | Keep both. Explore agent for code. NUTAUSIK for research spikes. |
| **Dead Ends** | None | **NONE** — missing | **Add to NUTAUSIK** — prevents repeating failures |
| **Verify** | /verify command + /goal judge | **HIGH** | Merge. NUTAUSIK adds structured verification against acceptance criteria. |
| **Audit** | NoCowboy audit logs (permission/action logging) | **MEDIUM** | Merge. NUTAUSIK adds ProjMgmt-specific audit trail. |

## Architecture decision: thin client vs full engine vs hybrid

### Option A: Thin client — ALL logic in NUTAUSIK

```
NoCowboy (TUI) → HTTP/SSE → NUTAUSIK MCP server (port 9204)
                               └── all ProjMgmt logic: epics, tasks, gates, memory, audit
```

- **Pro**: clean separation. NoCowboy is just a UI. NUTAUSIK is the ProjMgmt engine.
- **Con**: network dependency for every ProjMgmt operation. Slow. NoCowboy can't function without NUTAUSIK.
- **Verdict**: ❌ against NoCowboy's local-first philosophy.

### Option B: Full incorporation — ALL logic in NoCowboy core

```
NoCowboy (TUI)
  └── src/nocowboy/pm/ — all ProjMgmt logic built-in
```

- **Pro**: zero latency, local-first, offline.
- **Con**: bloats the core binary. Every ProjMgmt feature is a core dependency.
- **Verdict**: ❌ against plugin-out/plugin-in architecture.

### Option C: Hybrid (recommended) — Core ProjMgmt in NUTAUSIK, lightweight in NoCowboy

```
NoCowboy (TUI)
  ├── /ralph — PRD → beads → stories workflow (built-in agent)
  ├── /goal + /verify — goal judge + verification (built-in commands)
  ├── /plan → ADRs (built-in)
  └── NUTAUSIK MCP server (port 9204) — optional ProjMgmt engine
        └── heavy ProjMgmt: gates, stacks, memory graph, dead ends, audit, roles
```

**What stays in NoCowboy core:**
- Ralph workflow (PRD → execution)
- Goal judge + verify
- ADR-based decisions
- Task tracking via MiMo task tree IDs (T1/T1.1)

**What moves to NUTAUSIK:**
- QA Gates (structured stages)
- Memory graph (relational task→decision links)
- Stacks (decision context, LIFO reasoning)
- Dead ends (failed approach tracking)
- Roles (project management roles)
- Audit (ProjMgmt-specific audit trail)

**What's shared (both read/write the same data):**
- Epics/Stories/Tasks — both Ralph and NUTAUSIK can create tasks
- Sessions — NoCowboy sessions + NUTAUSIK time tracking share the same DB
- Memory — MiMo memory (file-based) + NUTAUSIK memory graph (relational) complement each other

## NUTAUSIK package structure

```
@nocowboy/mcp-tausik/
├── src/
│   ├── index.ts           — MCP server entry, registers 50+ tools
│   ├── providers/         — search providers (DuckDuckGo, Tavily, Google, Brave)
│   ├── pm/                — project management engine
│   │   ├── epics.ts       — Epic CRUD
│   │   ├── stories.ts     — Story CRUD
│   │   ├── tasks.ts       — Task CRUD
│   │   ├── gates.ts       — QA gate state machine
│   │   ├── memory-graph.ts — Relational knowledge graph
│   │   ├── stacks.ts      — LIFO decision stacks
│   │   ├── deadends.ts    — Dead end tracking
│   │   ├── audit.ts       — Audit trail
│   │   └── roles.ts       — Role management
│   └── fetcher.ts         — Web page fetch + readability
├── package.json
└── dist/
```

## Recommendation

**Option C — Hybrid.** Keep the lightweight, fast, local-first workflow in NoCowboy core (Ralph, goal judge, verify, ADRs). Move the heavy, structured ProjMgmt features to NUTAUSIK as an optional MCP server. Users who don't need structured ProjMgmt get the lean core. Users who need full ProjMgmt install NUTAUSIK: `npm install -g @nocowboy/mcp-tausik`.

## Open questions (to resolve later)

1. Which task ID format? Ralph uses bead IDs. MiMo uses T1/T1.1. Tausik uses its own. Need a unified format.
2. Database: NUTAUSIK uses its own SQLite DB or shares NoCowboy's `nocowboy.db`?
3. Search: Tausik has web search tools (DuckDuckGo, Tavily, Google). Are these ProjMgmt-specific or general-purpose? If general-purpose, should they be a separate MCP server?
4. Python → JS port scope: all 70 tools, or MVP of 20?

## Roadmap impact

- **P0 (MiMo)**: memory + dream + distill + goal judge — these feed INTO NUTAUSIK's memory graph
- **P1 (UX)**: server management UI — needed to show NUTAUSIK's status in Settings
- **P3**: NUTAUSIK itself — the JS port of Tausik
