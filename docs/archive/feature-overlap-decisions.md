# Feature Overlap & Decision Matrix

**Date:** 2026-06-24 | **Status:** Draft — needs user ratification per item

## Sources

| Code | What | Where |
|---|---|---|
| **NC** | NoCowboy core (our code) | `/NoCowboy/app/` |
| **MM** | MiMo borrowings | Xiaomi MiMo-Code (MIT, same fork base) |
| **NT** | NUTAUSIK JS port | `/nutausik-js/packages/nutausik/` |
| **TS** | Python Tausik (original) | `~/.kilo/mcp-servers/tausik/` |

## Overlap Matrix

### 1. Cross-Session Memory

| Source | Implementation | Scope |
|---|---|---|
| **NC** | `MEMORY.md` + FTS5 + `/dream` | File-based, auto-indexed SQLite FTS5. Agent writes learnings to MEMORY.md. |
| **MM** | Memory system (6 files) | FTS5 search + reconcile + budgeted injection + context reconstruction. MiMo's version is richer: auto-injects at session start and on context pressure. |
| **NT** | `knowledge.ts` + `memory-audit.ts` hook | Relational knowledge graph between tasks, decisions, explorations. Structured, per-project. |
| **TS** | Memory graph (Python) | Same as NT but Python — relational links between entities. |

**Verdict:** Three layers, complementary, not competing.

| Layer | Where | What |
|---|---|---|
| **Agent memory** (per-session context) | NC (MiMo upgrade) | FTS5 search + budgeted injection from MEMORY.md at session start. Upgrade with MiMo's context reconstruction (rebuild context on overflow). |
| **Project knowledge** (cross-session, human-readable) | NC `/dream` | Agent extracts learnings → writes MEMORY.md. File-based, shareable, git-commit-able. |
| **Task-level memory** (per-task, structured) | NT `knowledge.ts` | Relations between tasks ↔ decisions ↔ explorations ↔ dead ends. Queryable by agents during task work. |

**Decision: Keep all three. They serve different timeframes.** Agent memory = per-session. Project knowledge = cross-session. Task memory = per-task.

---

### 2. Task Management (Epics, Stories, Tasks, Hierarchy)

| Source | Implementation | Scope |
|---|---|---|
| **NC** | Ralph MCP + `/plan` | PRD → beads → stories → execution. Spec-driven, agent-orchestrated. |
| **MM** | Task tree IDs (T1/T1.1/T1.2) | Lightweight hierarchical IDs. Simple, file-system friendly. |
| **NT** | `hierarchy.ts` + `task.ts` | Full CRUD for epics/stories/tasks. SQLite backend. Structured project management. |
| **TS** | Epics/Stories/Tasks (Python) | 70+ tools. The original, full-featured project management system. |

**Verdict:** Ralph + NUTAUSIK, NOT competing.

| Use case | Tool |
|---|---|
| **Spec-driven development** (PRD first) | NC Ralph: `prd agent` → beads → stories → `/act` |
| **Ad-hoc task tracking** (no PRD) | NT: `epic_create`, `task_create` — direct task management |
| **Cross-tool bridge** | NT: lightweight T1/T1.1 IDs that both Ralph and NUTAUSIK can reference |
| **Heavy project management** (gates, audits, roles) | NT: stays in NUTAUSIK. Not needed for simple projects. |

**Decision: Ralph for PRD-driven work. NUTAUSIK for ad-hoc task tracking. Both read/write T-IDs for cross-referencing.**

---

### 3. Task Verification (Gates, QA, Checks)

| Source | Implementation | Scope |
|---|---|---|
| **NC** | `/goal` + `/verify` | Agent-level: goal judge subagent evaluates completion. Verify runs lint/tests/diff. |
| **NT** | `gates/*.ts` (5 files) | Structured QA gates: command-runner, filesize, test-resolver, stack-dispatch. |
| **NT** | `verify/*.ts` (4 files) | files-hash, git-diff, cache, constants. |
| **TS** | QA Gates (Python) | Full gate state machine: create → check → pass. Acceptance criteria validation. |

**Verdict:** Complementary — different granularity.

| Granularity | Tool |
|---|---|
| **Agent-level** (did the agent do what it said?) | NC `/goal` + `/verify` |
| **Task-level** (does this task meet acceptance criteria?) | NT gates: `gate_create`, `gate_check`, `gate_pass` |
| **File-level** (did this file change correctly?) | NT verify: `files-hash`, `git-diff` |

**Decision: NoCowboy handles agent verification. NUTAUSIK handles task-level QA gates and file-level verification. /goal calls NUTAUSIK gates when a task has them defined.**

---

### 4. Knowledge Graph / Memory Graph

| Source | Implementation | Scope |
|---|---|---|
| **NC** | FTS5 + MEMORY.md | Free-text search across all memory files. |
| **NT** | `graph.ts` + `knowledge.ts` | Structured graph: tasks ↔ decisions ↔ explorations ↔ dead ends. Relational, not free-text. |

**Verdict:** Different data models. Both needed.

| When | Tool |
|---|---|
| "What did we learn about auth?" | NC FTS5 search across MEMORY.md |
| "Which tasks were affected by decision X?" | NT graph query: `decision_record` → linked tasks |
| "What dead ends did we hit on feature Y?" | NT graph: `deadend_record` → linked explorations |

**Decision: NC FTS5 for free-text memory. NT graph for structured task knowledge. /dream should also index NT graph nodes into FTS5.**

---

### 5. Web Search

| Source | Implementation | Scope |
|---|---|---|
| **NC** | `tausik` in DEFAULT_LAUNCHES (null — not yet) | MCP server for web search |
| **NT** | `providers/duckduckgo.ts` + `web-search.ts` | DuckDuckGo already implemented. No API key needed. |
| **TS** | Web search (Python) | Connected to Claude subscription proxy |

**Verdict:** NUTAUSIK IS the web search server.

**Decision: Move NT's DuckDuckGo search into a standalone `@nocowboy/mcp-tausik` MCP tool at startup. NoCowboy uses NUTAUSIK for search. No separate search server needed.**

---

### 6. Hooks (Session Lifecycle)

| Source | Implementation | Scope |
|---|---|---|
| **NC** | None (not yet) | — |
| **NT** | `hooks/*.ts` (12 files) | bash-firewall, budgets, git-push-gate, keyword-detect, memory-audit, scope-gate, secret-scan, session-metrics, session-start, task-gate, task-verify, auto-format |
| **MM** | Permission hooks | Hooks → before/after tool calls |

**Verdict:** NUTAUSIK hooks should be a SEPARATE MCP server — not tied to project management.

| Hook group | Where |
|---|---|
| **Security** (bash-firewall, secret-scan, scope-gate) | NT — security MCP server |
| **Quality** (task-gate, task-verify, budgets) | NT — quality MCP server |
| **Session** (session-start, session-metrics, memory-audit) | NC core — needs to run regardless of whether NUTAUSIK is installed |

**Decision: Split hooks. Security + Quality stay in NUTAUSIK (optional install). Session hooks move to NC core (always run).**

---

### 7. Decision Tracking

| Source | Implementation | Scope |
|---|---|---|
| **NC** | `/plan` → `docs/adr/` | Formal ADRs for big decisions. |
| **NT** | `decision_record` | Lightweight per-task decisions. |
| **MM** | None | — |

**Verdict:** Both — different formality levels.

| Formality | Tool |
|---|---|
| **Architecture decisions** (cross-project, team review) | NC `/plan` → ADR in docs/adr/ |
| **Task-level decisions** (within a task, context-dependent) | NT `decision_record` linked to task |

**Decision: ADRs for formal decisions. NUTAUSIK decisions for lightweight task context.**

---

### 8. Audit Trail

| Source | Implementation | Scope |
|---|---|---|
| **NC** | Permission logging + action logging | Agent-level: what was allowed/denied. |
| **NT** | `audit` (planned) | Project-level: who did what task, when, with what gates. |
| **MM** | None | — |

**Verdict:** Different scopes.

**Decision: NC audit for agent actions. NT audit for project management actions. Both write to `nocowboy.db` (same DB).**

---

### 9. Dead End Tracking

| Source | Implementation | Scope |
|---|---|---|
| **NC** | `/dream` extracts dead ends to MEMORY.md | Free-text knowledge extraction. |
| **NT** | `deadend_record` (planned) | Structured: linked to task, reasoning, timestamp. |
| **TS** | Dead Ends (Python) | Same as NT but Python. |

**Verdict:** NT structured approach is better for programmatic access. NC free-text is better for human reading.

**Decision: NT records dead ends programmatically. /dream reads them and writes human-readable summaries to MEMORY.md.**

---

### 10. Stacks (Decision Context)

| Source | Implementation | Scope |
|---|---|---|
| **NC** | None | — |
| **NT** | `stacks/registry.ts` | LIFO decision stacks. Push context, pop when resolved. |
| **TS** | Stacks (Python) | Same as NT. |

**Verdict:** Unique NUTAUSIK feature. No overlap.

**Decision: Keep in NT. Richer than any NC equivalent.**

---

## Summary: What goes where

| Capability | NoCowboy core | NUTAUSIK MCP | Shared |
|---|---|---|---|
| **Agent memory** (FTS5 search) | ✅ | — | — |
| **Agent memory** (context reconstruction) | ✅ (MiMo upgrade) | — | — |
| **Project knowledge** (/dream) | ✅ | — | `/dream` indexes NT graph → FTS5 |
| **Task memory** (knowledge graph) | — | ✅ | — |
| **PRD-driven tasks** (Ralph) | ✅ | — | NT creates tasks → Ralph can reference them |
| **Ad-hoc tasks** | — | ✅ | — |
| **Task IDs** (T1/T1.1) | ✅ (MiMo port) | ✅ (read/write) | Shared format |
| **Agent verification** (/goal, /verify) | ✅ | — | `/goal` calls NT gates when defined |
| **QA gates** | — | ✅ | — |
| **File verification** | — | ✅ | — |
| **Web search** (DuckDuckGo) | — | ✅ | — |
| **Security hooks** (bash-firewall, secret-scan) | — | ✅ | Optional install |
| **Session hooks** (session-start, metrics) | ✅ | — | Always run |
| **Formal ADRs** | ✅ | — | — |
| **Lightweight decisions** | — | ✅ | — |
| **Agent audit** | ✅ | — | — |
| **Project audit** | — | ✅ | Same DB |
| **Dead ends** | ✅ (/dream extracts) | ✅ (structured record) | /dream reads NT |
| **Stacks** | — | ✅ | Unique NT feature |
