# ADR-003: Upstream Release Audit Process — recurring discipline, not a one-off

**Status:** Accepted
**Date:** 2026-09-15
**Author:** NoCowboy Architect

## Context

ADR-002 established the *strategy*: NoCowboy is a **hard fork**; upstream is a **patch source, not a merge target**; adoption is via selective cherry-pick / targeted manual port anchored on `kilocode_change` markers. That ADR left one gap un-closed: **there was no process to actually look at upstream releases on a cadence.**

The owner's 2026-09-15 question — *"did we check new releases? did we take Kilo Code's new features?"* — has an uncomfortable, evidence-backed answer:

| Fact | Value | Evidence |
|---|---|---|
| Upstream releases ever merged | **0** | `git log --merges` empty |
| Upstream tags ever reviewed | **0** of 25+ (v7.4.0→v7.7.1) plus the post-fork v7.3.x tail | local upstream refs frozen at 2026-06-19 until today's fetch |
| Features ported since fork | **0** | `git rev-list --count ca721a26f..HEAD` = 756 (all ours) |
| Live gaps carried as a result | ≥ 2 (minimatch ReDoS, empty `<task_result>`) | `core/package.json:41` = 10.2.5; `tool/task.ts:407` |

The drift was not a decision — it was the *absence* of a decision. We independently re-implemented goal-judging, recall, memory, watchdog, and permission layers while upstream was shipping security fixes we never looked at.

## Decision

**We do not change the fork posture (ADR-002 stands). We add a mandatory, recurring release audit** so "depend on upstream" means "deliberately harvest upstream", never "silently drift."

### Answer to the owner's core question

> **Is a git merge feasible after this divergence? No.** Rebranding (`kilo-*`→`nocowboy-*` across 12 packages), own packages, independent overlapping systems, version-line split (0.13.x vs 7.7.x), and a 30 664-commit gap with zero prior merges make a merge a conflict bomb that would destroy our identity and re-introduce every kilo reference. We operate as a **hard fork that harvests upstream selectively** (ADR-002, options table: A/B/C rejected, D accepted).

### The recurring audit procedure (what "checking releases" means operationally)

| Step | Command / action |
|---|---|
| 1. Fetch | `git fetch upstream --tags` |
| 2. Diff the tag frontier | `git tag -l "v*"` and diff against the **last-reviewed tag** recorded in this ADR |
| 3. Read the changeset window | `git show upstream/main:packages/opencode/CHANGELOG.md` for the new range |
| 4. Triage | classify each item against `docs/upstream-sync-audit.md` categories: S/D → port now; BUG → port; OVERLAP → keep ours / borrow; PERF → defer; SKIP → ignore |
| 5. Record | append the reviewed tag range to a "Reviewed frontier" table; update `docs/reference/upstream-port-list.md` |

### Cadence

| Trigger | Action |
|---|---|
| **Any time** | Security/data-loss fix lands upstream → read the tag's changeset, port same-week. |
| **Monthly** | Full audit (steps 1–5 above). |
| **Per own release** | Re-check for security/data-loss fixes since last triage before tagging `0.x.y`. |

### What "adopt from upstream" means — three mechanisms

| Mechanism | Use when | Cost |
|---|---|---|
| **Selective cherry-pick** (`git cherry-pick <sha>`) | Pure upstream-opencode file, no `kilocode_change` marker, no rebranded path | Lowest |
| **Targeted manual port** (hand-apply, adapted) | Rebranded surface (`nocowboy-*`), `src/nocowboy/*`/`src/kilocode/*` mirror, or a file carrying a marker | Medium — must re-derive the marker |
| **Ignore** | Cloud/VS Code/JetBrains infra we don't ship, or a feature where ours is already better (goal judge, recall, memory, watchdog) | Zero |

### Why `kilocode_change` markers must be preserved (either way)

The markers are the **auditable ledger of divergence**. Upstream itself carries the same marker in 558 files; we carry ~850. They are the only machine-checkable record of "here is where our logic diverges from the shared upstream line." Removing or blanket-renaming them would (a) break the Fork Isolation Rule (`packages/opencode/AGENTS.md`) that forces kilo/no-cowboy-specific logic into `src/kilocode/*` mirrors behind a single marker, and (b) make every future cherry-pick land blind, since a cherry-pick that crosses a marker is the exact failure mode that corrupts shared files. Rule: **never cherry-pick across a marker; every manual port re-derives its marker and cites the upstream SHA/date.**

## Consequences

**What becomes easier:**
- Security/data-loss gaps close on a known cadence instead of being discovered by accident.
- The marker set becomes a living adoption ledger, not rebranding noise.
- The fork posture becomes *defensible*: "we depend on upstream" means we can prove, per tag, what we took and what we deliberately skipped.

**What becomes harder:**
- A monthly triage pass is now mandatory process (small but non-zero).
- Manual ports cost more than blanket merges — accepted, because blanket merges are impossible here.

**Risks and mitigations:**
- 🟡 Drift re-accumulates between cadences → monthly triage + per-release security re-check.
- 🟡 Cherry-pick applies but semantically conflicts → every port runs the ported file's tests + full `typecheck` before landing.
- 🟡 We port, then upstream fixes its own fix (e.g. stream-idle default made opt-in in v7.4.16 `23963e3`) → reconcile against the *latest* upstream state, not the first fix in range.

## Reviewed frontier

| Tag range | Reviewed | Date | Result |
|---|---|---|---|
| v7.3.48 → v7.3.63 (post-fork tail) | ✅ | 2026-09-15 | Sandbox hardening triaged → `port-backlog.md` T0.4 |
| v7.4.0 → v7.7.1 | ✅ | 2026-09-15 | Full audit → `docs/upstream-sync-audit.md`; Tier 0/1 backlog in `docs/reference/upstream-port-list.md` |

*(Append rows here at each monthly pass.)*

## References

- `docs/adr/002-upstream-sync-strategy.md` (fork strategy)
- `docs/upstream-sync-audit.md` (full per-release audit)
- `docs/reference/upstream-port-list.md` (prioritized Tier 0/1 port list)
