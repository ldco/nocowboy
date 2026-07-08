# ADR-001: Integration of External Patterns (ponytail + mattpocock skills)

**Status:** Accepted  
**Date:** 2026-07-09  
**Author:** NoCowboy Architect

## Context

Three high-impact open-source repos were analyzed:

| Repo | Stars | Core insight |
|---|---|---|
| DietrichGebert/ponytail | 78k | 7-rung decision ladder — "lazy senior dev" that stops over-engineering |
| mattpocock/sandcastle | 6.7k | Sandboxed agent orchestration in Docker (REJECTED for this phase) |
| mattpocock/skills | 161k | 13 Claude Code skills for engineering discipline |

**Constraint:** NoCowboy is maximally automated. The user does NOT invoke skills manually. Everything should work under the hood — rules, hooks, agent behaviours. Adding user-visible commands is the exception, not the rule.

**Existing system:** NoCowboy already has:
- `.nocowboy/rules/` — 5 files loaded every session (soul, identity, integrity)
- Global instructions — 10+ files (engineering rules, no-shortcuts (169 lines), structured output, auto-memory, hooks, etc.)
- Constitution MCP — 12 rules enforcing code standards
- Quality gates — filesize, ruff, mypy, tsc, eslint
- Score engine — dimension-based quality scoring
- NUTAUSIK — task/memory/handoff/verify lifecycle
- Hooks system — PreToolUse, PostToolUse, SessionStart, SessionEnd, Stop
- Verify — scope-based verification (lightweight/standard/high/critical/manual)

## Decision

Integrate patterns **under the hood** — not as user-visible skills. Only 2 commands as exception.

### Integration Matrix

| Pattern | Source | Integration method | Rationale |
|---|---|---|---|
| 7-rung ladder | ponytail | Rule file: `.nocowboy/rules/lazy-senior.md` | Formalizes existing instincts from `no-shortcuts.md` + `AGENTS.md` |
| Auto-grill trigger | skills: grill-me | Rule file + hook: `.nocowboy/rules/auto-grill.md` | Existing memory/handoff/soul already cover domain model. Only missing: proactive context-check trigger |
| 6-step debug loop | skills: diagnosing-bugs | Rule file: `.nocowboy/rules/debug-loop.md` | Formalizes debug agent behavior. Spirit already in `no-shortcuts.md`. |
| Spec-compliance axis | skills: code-review + sandcastle | Extension of existing score-engine + nutausik_verify | Standards axis already covered (constitution, gates). Spec axis is the gap. |
| /to-spec | skills: to-spec | Command: `.nocowboy/command/to-spec.md` | Needs user volition — "yes, this conversation IS the spec now" |
| /wayfinder | skills: wayfinder | Command: `.nocowboy/command/wayfinder.md` | Needs user volition — "this is too big for one session, make a map" |

### Patterns REJECTED

| Pattern | Reason |
|---|---|
| Sandbox runner (sandcastle) | Not needed at current stage. Infrastructure dependency (Docker). Separate epic if needed later. |
| Domain modeling (skills) | Already covered by NUTAUSIK memory (43 entries) + handoff + soul. |
| prompt-key-substitution | Requires code changes in prompt pipeline — infrastructure work, not rules. Separate epic. |
| handoff-structure | Existing `nutausik_handoff_save` already has session_id, task_slug, summary, last_message, state. Adding 3 more fields is trivial — doesn't justify a separate story. |
| /ponytail-review, /ponytail-audit, /ponytail commands | Already covered by constitution + score-engine + verify. |
| All other mattpocock skills (triage, teach, ask-matt, setup, resolve-merge, implement) | Not relevant to NoCowboy's architecture or already covered. |

## Consequences

**What becomes easier:**
- Code agent writes less code (7-rung ladder formalizes "do I need this at all?")
- Tasks start with sufficient context (auto-grill closes the "agent built wrong thing" gap)
- Debug agent follows systematic process (less "shotgun debugging")
- Score reflects spec compliance — not just code quality (closes verification gap)

**What becomes harder:**
- Nothing. All changes are extensions of existing systems, not new systems.

**Risks:**
- 🟢 Low: auto-grill could over-question on well-defined tasks → mitigate with context threshold check
- 🟢 Low: 7-rung ladder could suppress legitimate code → safety invariants (security, error handling, validation) are NEVER cut

**Verification:**
- Each story has acceptance criteria in NUTAUSIK
- Plan file: `.nocowboy/plans/external-patterns-integration-v2.md`
