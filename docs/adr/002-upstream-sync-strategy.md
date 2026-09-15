# ADR-002: Upstream Sync Strategy — hard fork, cherry-pick discipline

**Status:** Accepted
**Date:** 2026-09-15
**Author:** NoCowboy Architect

## Context

NoCowboy is a fork of KiloCode (`upstream = https://github.com/kilo-org/kilocode.git`), forked at `ca721a26f` ("NoCowboy TUI — fork of KiloCode v7.3.46", 2026-06-19). Since the fork we have diverged hard:

| Fact | Value | Confidence |
|---|---|---|
| Upstream commits since fork | **30 664** (`git rev-list --count ca721a26f..upstream/main`) — dominated by upstream's own repeated merges of `sst/opencode`, treat as direction not line count | 🟢 verified |
| Our commits since fork | **754** | 🟢 verified |
| Upstream releases ever merged | **0** (`git log --merges` empty) | 🟢 verified |
| Unreviewed upstream tags | 25 minor/major (v7.4.0→v7.7.1) + a v7.3.x tail (v7.3.48→v7.3.63) | 🟢 verified |
| Our version line | `0.13.x` (own) vs upstream `7.7.x` | 🟢 verified |
| Our package surface | 12 packages: `core, http-recorder, llm, nocowboy-cli, nocowboy-gateway, nocowboy-indexing, nocowboy-telemetry, nocowboy-vscode, opencode, plugin, sdk, ui` — `kilo-*` renamed to `nocowboy-*` | 🟢 verified |
| `kilocode_change` markers | ~850 in our tree (780+ in `.ts` alone) | 🟡 measured |

We have since built independent systems that overlap upstream features:

| Capability | Ours | Upstream equivalent |
|---|---|---|
| Goal judging | `nocowboy/session/goal.ts` — **independent judge model** evaluates stop condition from transcript (`JUDGE_SYSTEM`), with `impossible` verdict and turn budget | v7.6.0 `/goal` — model **self-reports** completion, *"without a separate evaluator or independent verification claim"* |
| Session recall | `tool/recall.ts` (`nocowboy_local_recall`) — title/transcript search | v7.3.53 recall tool + v7.7.1 ranking/typo |
| Memory | NUTAUSIK memory graph + `auto-dream.ts` | `@kilocode/kilo-memory` (opt-in) |
| Stream watchdog | `nocowboy/session/stream-idle.ts` + `watchdog.ts` | v7.4.15 `cd205d8` + v7.4.17 `deddf00` first-byte deadline |
| Permission system | own permission matcher (plan/architect/code modes) | upstream permission + sandbox |
| Worktree/snapshot | TUI-first, inherited snapshot code | Agent Manager + snapshot pre-warm |

The full per-release audit is in `docs/upstream-sync-audit.md`; the prioritized port list is in `docs/reference/upstream-port-list.md`. This ADR plus ADR-003 define the going-forward process; the audit below is the first pass, not a one-off.

## Decision

**NoCowboy is a hard fork. Upstream is a patch source, not a merge target.** We do **not** merge upstream; we run a **low-ceremony cherry-pick / targeted-manual-port discipline**, triaged monthly and anchored on `kilocode_change` markers.

### Why a git merge of upstream is no longer viable

1. **Rebranding.** `kilo-*` → `nocowboy-*` across 12 packages (gateway, indexing, telemetry, cli, vscode). A merge would re-introduce every upstream `kilo` reference and collide with our renames.
2. **Own packages.** `nocowboy-gateway`, `nocowboy-indexing`, `nocowboy-telemetry`, `nocowboy-cli`, `nocowboy-vscode` are first-class forks of upstream sub-packages with our own version line — there is no clean base to fast-forward to.
3. **Independent systems.** goal judge, recall, memory, watchdog, permission matcher — a merge would create duplicate, conflicting implementations of the same capability.
4. **Version line.** `0.13.x` vs `7.7.x` — our releases are our own; upstream tags are not meaningful milestones for us.
5. **Divergence magnitude.** 30 664 upstream commits vs 754 ours, with zero prior merges; the first merge would be a 30k-commit conflict bomb.

## Options considered

| # | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| A | **Full `git merge upstream/main`** (periodic rebase onto upstream) | Zero manual triage; automatic adoption of everything | Destroys rebranding; collides with own packages + systems; 30k-commit conflict; version-line collapse; 850 markers become noise | **Rejected** |
| B | **Abandon upstream entirely** (stop tracking) | Zero maintenance | We already carry a live ReDoS gap (minimatch 10.2.5) and a live silent-failure bug (empty `<task_result>`) that upstream fixed — ignoring upstream is what produced them | **Rejected** |
| C | **Blanket cherry-pick every upstream tag** | No decision overhead | Cherry-picks of `sst/opencode` merges and rebranded kilo surfaces will not apply cleanly; imports cloud-only features we don't want | **Rejected as a blanket policy** |
| D | **Targeted manual port + selective cherry-pick** (chosen) | Surgical, reviewable, preserves rebranding + own systems; each port is a deliberate decision with upstream SHA reference | Manual effort; requires monthly triage discipline; risk of missing upstream fixes between cadences | **Accepted** |

## Decision details

### Cherry-pick vs targeted manual port — when to use which

| Mechanism | Use when | Example |
|---|---|---|
| **Selective cherry-pick** (`git cherry-pick <sha>`) | The change touches a *pure upstream-opencode* file with no `kilocode_change` marker and no rebranding in the path | `minimatch` bump in `packages/core/package.json`; a fix in `opencode/src` with no kilo-specific override |
| **Targeted manual port** (hand-apply the diff, adapted) | The change touches a rebranded surface (`nocowboy-*`), a `src/kilocode/*` mirror, or a file carrying `kilocode_change` markers | `task.ts` synthetic-part fix; config credential substitution (our config layer is rebranded); permission matcher |

Rule: **never cherry-pick across a `kilocode_change` marker.** Any port that would cross a marker is done manually, then the marker is re-derived.

### Keeping `kilocode_change` markers meaningful

The Fork Isolation Rule (see `packages/opencode/AGENTS.md`) already encodes the invariant: Kilo/NoCowboy-specific logic must live in a mirror file `src/kilocode/<same/path>.ts` and be called from the upstream file behind a **single** `kilocode_change` marker; files whose path contains `kilocode` never carry markers. When porting:

1. Apply the upstream change to the shared file **first**.
2. If it collides with our NoCowboy logic, re-extract that logic into the `src/kilocode/*` mirror and shrink the call-site to one marker.
3. **Every ported change gets a new `kilocode_change` marker** whose comment cites the upstream PR/SHA and date, so the marker set is an auditable ledger of "what we took, and when".
4. Never inline NoCowboy-specific logic into a shared upstream file without a marker — that is how markers rot into meaningless noise.

### Cadence

| Trigger | Action |
|---|---|
| **Immediately** (any time) | Any upstream **security** or **data-loss** fix (ReDoS, injection, permission bypass, credential leak, transcript loss). Read the relevant tag's changeset and port same-week. |
| **Monthly** | `git fetch upstream`; diff `git tag -l` against the last reviewed tag; read `packages/opencode/CHANGELOG.md` for the new range; triage into take-now / take-later / skip against the port list. |
| **Per own release** | Before tagging `0.x.y`, re-check that no security/data-loss fix has landed upstream since the last triage. |

### What to take vs skip

| Class | Rule |
|---|---|
| Security / data-loss | **Always port** (immediate). |
| Bug we can reproduce in our tree | **Port** (immediate) — e.g. empty `<task_result>`, minimatch ReDoS. |
| Provider / model support | Port **only** for providers/models we actually route to; skip kilo.ai-gateway-specific routing. |
| Gateway / telemetry / cloud / board (Kilo Swarm, `set_pr_link`, scheduled wakeups, kilo-auto small model) | **Skip** — depends on kilo.ai infra we do not use. |
| Feature with a NoCowboy equivalent (goal judge, recall, memory, watchdog) | **Keep ours**; borrow only cheap, orthogonal heuristics (e.g. recall whole-word ranking). |
| Perf (worktree snapshot pre-warm, CLI startup) | **Defer** — not correctness; revisit when worktrees become central. |
| Sandbox hardening (v7.3.63 tail) | Ancestry **verified absent** (`HEAD..v7.3.63` = 23 675) → port core confinement (symlink-escape, write confinement, session-weakening) — see audit §2. |

## Consequences

**What becomes easier:**
- Security/data-loss gaps are closed on a known cadence instead of discovered by accident.
- The `kilocode_change` markers become an auditable ledger of upstream adoption, not rebranding noise.
- Cherry-picks stay clean because they never cross markers or rebranded surfaces.

**What becomes harder:**
- A monthly triage pass is now mandatory process (small, but non-zero).
- Manual ports cost more than blanket merges — accepted because blanket merges are impossible here.

**Risks and mitigations:**
- 🟡 **Drift re-accumulates between cadences** → monthly triage + per-release security re-check.
- 🟡 **Cherry-pick applies but semantically conflicts** (upstream changed surrounding code we forked) → every port runs the ported file's tests + full `typecheck` before landing; see the port list's per-item risk column.
- 🟡 **We port upstream, then upstream fixes its own fix** (e.g. stream-idle default was later made opt-in in v7.4.16 `23963e3`) → for anything touching our watchdog/stream layer, reconcile against the *latest* upstream state, not the first fix in the range.

## References

- Audit: `docs/upstream-sync-audit.md`
- Port list: `docs/reference/upstream-port-list.md`
- Fork playbook (historical): `docs/reference/kilocode-fork-playbook.md`
