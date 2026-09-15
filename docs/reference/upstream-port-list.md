# Upstream Port List — NoCowboy (prioritized)

**Date:** 2026-09-15
**Author:** NoCowboy Architect
**Scope:** concrete upstream changes worth porting, in priority order, with mechanism, effort, risk, and rebrand/architecture conflict. Companion to `docs/adr/002-upstream-sync-strategy.md` (strategy) and `docs/upstream-sync-audit.md` (full audit).

**Mechanism legend:** `cp` = selective `git cherry-pick <sha>` (only on pure-upstream files with no `kilocode_change` marker and no rebranded path); `mp` = targeted manual port (hand-apply, adapted — any file carrying a marker, a `src/kilocode/*`/`src/nocowboy/*` mirror, or a `kilo-*`→`nocowboy-*` rename). Rule from ADR-002: **never cherry-pick across a `kilocode_change` marker.**

**Effort:** XS (<1h) · S (half day) · M (1–2 days) · L (multi-day, needs triage).

---

## Tier 0 — PORT NOW (live bugs / security / data-loss in our tree)

| # | Ref (release · PR · SHA) | Change | Mechanism | Effort | Risk | Rebrand/arch conflict |
|---|---|---|---|---|---|---|
| T0.1 | v7.5.6 · #13493 · `bf7848cb48` | **Empty `<task_result>`** — subagent result extractor now skips `synthetic`, `ignored`, and empty text parts; background jobs no longer let an empty run overwrite a non-empty result. Fixes #13469. | `mp` — `src/tool/task.ts` (8 lines) + `core/src/background-job.ts` (2 lines) | S | Low | **None.** Bug verified live at `packages/opencode/src/tool/task.ts:407` (`synthetic: true`). This is our #1 gotcha — breaks the reviewer-attestation pipeline. |
| T0.2 | v7.5.6 · dependabot · `34b10a672b` | **minimatch ReDoS** — bump `10.2.5` → `10.2.6` | `mp` — bump `core`, `opencode`, `nocowboy-indexing` package.json + `bun.lock` | XS | Low | **Partial.** `kilo-indexing`→`nocowboy-indexing` rename means no clean cherry-pick; bump by hand. Verified one patch behind at `packages/core/package.json:41`. Remotely triggerable via agent search patterns. |
| T0.3 | v7.4.2 · #11886 · `b793bf788f` + v7.4.7 · #12168 · `032f3bb` | **Config credential/file exfiltration** — `{env:VAR}` resolves only in trusted config; `{file:...}` confined to project root (rejects `../`, absolute, symlink escape) | `mp` — port to **both** vulnerable sites | M | Med | **Yes (2 sites).** (a) inherited `src/config/variable.ts:37,41`; (b) **our own** `src/nocowboy/config/markdown.ts:13-31` re-implements the same substitution and even allows absolute + `~/` paths — *worse than upstream*. Malicious repo can read `~/.ssh`, `~/.aws`. |
| T0.4 | v7.3.63 · #11591 `76a9d9b`, #11556 `c55e804`, #11703 `163aef5`, #11659 `7f4702b`, #11603 `9fbc456`, #11584 `588335e` | **Sandbox confinement** — symlink-escape fix, writes confined to project roots, session-weakening prevention, Linux network restriction, worktree confinement | `mp` — big, multi-commit | L | High | **Yes.** Entire post-fork v7.3.x security tail is absent (`HEAD..v7.3.63` = 23 675). Port core confinement only; triage against our permission matcher first. |
| T0.5 | v7.4.17 · #12585 · `a0a760e` | **Bash permission bypass** on PowerShell for bare `--` commands — unparsable commands checked against raw text | `mp` | M | Low | **Yes (forked matcher).** Our permission matcher forked from same logic; adapt the unparsable-command path. |
| T0.6 | v7.4.17 · (upstream `opencode`) · #12460 | **PTY credential leak** — local server credentials no longer leak into spawned PTY processes | `mp` | M | Low | **Partial.** Shared upstream `opencode` surface; our server/PTY layer is rebranded. |
| T0.7 | v7.4.17 · #12545 · `b2735bf` | **Session transcript flush on exit** — pending uploads flushed on shutdown/close (final messages no longer lost) | `mp` | S | Med | **Yes.** Session layer is heavily forked (`src/nocowboy/session/*`); reconcile flush logic with ours. |
| T0.8 | v7.4.17 · #12587 · `16f8e7e` | **Checkpoint restore data-loss** — keep conversation + workspace unchanged when a checkpoint can't be fully restored | `mp`/adapt | M | Med | **Yes.** We have our own checkpoint system (`src/nocowboy/session/checkpoint*.ts`); reconcile, don't duplicate. |
| T0.9 | v7.4.23 · #13124 · `d4f3a3a` | **Ask/Plan catch-all mutation** — broad "Allow everything" / `<command> *` rules no longer grant mutating tools to read-only modes | `mp`/adapt | M | Med | **Yes.** Our permission modes (plan/architect) mirror this structure. |
| T0.10 | v7.4.22 · #12373 · `3a99f36` | **Subagent phantom deny rules** — read-only parent allowlist no longer projected onto writable subagents | `mp`/adapt | M | Med | **Yes.** Subagent permission inheritance forked from same logic. |

**T0 data-loss batch (XS–S, port alongside the above):**

| Ref (release · PR · SHA) | Change | Mechanism | Effort | Risk | Conflict |
|---|---|---|---|---|---|
| v7.4.16 · #11940 · `0d830cb` | `$schema` injection via jsonc-parser — avoids write-on-read corruption of comment-first JSONC | `mp` | S | Low | Partial (config layer) |
| v7.4.16 · #12508 · `0fe46ec` | Fatal "readonly database" startup — auto-repair WAL permissions | `mp` | S | Low | Partial (storage) |
| v7.4.17 · #12583 · `1310c12` | Windows snapshot diff malformed-patch preservation | `mp` | S | Low | Only if Windows is a target |

---

## Tier 1 — PORT NEXT (reliability, reconcile with ours)

| # | Ref (release · PR · SHA) | Change | Mechanism | Effort | Risk | Rebrand/arch conflict |
|---|---|---|---|---|---|---|
| T1.1 | v7.4.17 · #12588 · `deddf00` + v7.4.15 · #12249 · `cd205d8` | **Provider first-byte timeout** — bound wait for first response byte by request timeout (prevents infinite hang) | **reconcile, don't duplicate** | M | Med | **Yes.** We already have `src/nocowboy/session/stream-idle.ts` + `watchdog.ts`. Add the *first-byte deadline* we may lack; do not port upstream's whole stream-idle (upstream later made its default opt-in in v7.4.16 `23963e3`). |
| T1.2 | v7.4.0/v7.4.17/v7.4.23 | **Provider/model support** (Claude Opus 4.7/Sonnet 5, GPT-5.6, GLM-5.2, Mistral Medium 3.5, xAI Grok OAuth) | `mp` | S–M per model | Low | Port **only** for models we actually route; skip kilo.ai-gateway-specific routing. |

---

## Tier 2 — DEFER / SKIP

| Item | Ref | Verdict | Why |
|---|---|---|---|
| Worktree first-snapshot speedup + pre-warm | v7.7.0 · #14115 `f40394f` + #14050 `7a6ab9a` | **Defer** | Perf, not correctness; we are TUI-first. Revisit when worktrees become central. |
| Goal keeps running after user message | v7.7.0 · #14101 `5665631` | **Keep ours** | Upstream = model self-reports; ours = independent judge (`src/nocowboy/session/goal.ts`). Different design, ours is stricter. |
| Session recall speedup + whole-word/typo ranking | v7.7.1 · #14148 `02e92bc`; v7.4.19 `2fbd380`; v7.4.11 `06c2337` | **Keep ours, borrow heuristics** | We built `nocowboy_local_recall` (title/transcript search). Borrow cheap whole-word ranking only. |
| Defer file indexing until search used | v7.4.21 · `35801cb` | **Defer** | Perf; our indexer (`nocowboy-indexing`) is our own fork. |
| PR-link detection (`set_pr_link`) | v7.7.0 · #14075 `fdf1bca` | **Skip** | No PR surface in our TUI today. |

## Skip entirely (upstream-only cloud infra)

Kilo Swarm shared board (`board_post`/`board_read`), `kilo-gateway`, `kilo-telemetry`, `kilo cloud`, scheduled/cancellable session wakeups (`b7070e5`), auxiliary tasks routed to cloud small model (`1e73d38`), `set_pr_link`, whole-project `/reload` across worktrees if it assumes the Agent Manager. These depend on kilo.ai infra we do not use. Take only if one also fixes a local-only bug.

---

## The three biggest things we are missing

1. **Empty `<task_result>` (T0.1).** Our most painful *live, silent* bug — the reviewer subagent returns an empty result because `task.ts:407` injects a `synthetic:true` part that the extractor surfaces as the final answer. Upstream fixed it (`bf7848cb48`); a small port restores the reviewer-attestation pipeline that failed our 0.13.1 release.

2. **Config credential + arbitrary-file exfiltration (T0.3).** Malicious repo can exfiltrate `{env:...}` secrets to an attacker `baseURL` and, via our own `nocowboy/config/markdown.ts`, read arbitrary files (`~/.ssh`, `~/.aws`) because it resolves absolute and `~/` paths with no trust boundary. Inherited from upstream *and* re-implemented worse in our own overlay.

3. **Post-fork v7.3.x sandbox-confinement tail (T0.4).** Symlink-escape, project-root write confinement, session-weakening prevention, and Linux network restriction shipped in v7.3.63 — all absent from our tree (23 675 commits behind that tag). This is the largest single security gap.

(Also: `minimatch` 10.2.5→10.2.6 ReDoS is a one-line dep bump — T0.2 — do it in the same PR as T0.1.)

---

## Port log

| Item | Status | Commit | Notes |
|---|---|---|---|
| T0.1 empty `<task_result>` | ✅ done | `92e1ecd83f` | `tool/task.ts` returns the subagent's real answer. |
| T0.2 minimatch / brace-expansion ReDoS | ✅ done | `01efd1e012` | Root cause is `brace-expansion` (advisory ≥2.0.0 <2.1.3), not minimatch. Direct deps bumped to 10.2.6 / 5.0.9; root overrides added. |
| T0.3 config credential/file exfil | ✅ done | `d2e69a0b2b` | Ported `b793bf788f` + `032f3bb`: trust flag threaded through config/agent/command/markdown/overlay/tui/skill/instruction/workflows; `ConfigVariableGuard` confines untrusted `{file:}` to the project root and blocks server-credential `{env:}`. Regression tests added. |
| T0.7 transcript flush on exit | ✅ done | `e56482a0d0` | Ported `b2735bf` onto our ingest queue: `IngestQueue.drain()`, once-guarded `Sessions.drainIngestForShutdown()` wired into serve/web/worker, terminal batch flushed on session close. |
| T0.9 Ask/Plan catch-all mutation | ✅ N/A | — | We have no `ask`/`plan` agents (removed in the P3 agent refactor). Our read-only agents (`architect`) merge their restrictive rules **last** so a global `permission.bash/edit` allow cannot widen them; `planner`/`reviewer` are edit-denied via defaults. Re-check if ask/plan are reintroduced. |
| T0.10 subagent phantom bash denies | ✅ done | `37889c07f9` | Ported `3a99f36`: `KiloTask.inherited` no longer projects the caller's `bash` denials onto the subagent (only deny rules, and only edit/notebook_edit/notebook_execute + MCP). Regression tests added. |

| T0.6 PTY credential leak | ✅ done (pre-existing) | — | Our PTY layer already deletes `NOCOWBOY_SERVER_PASSWORD`/`NOCOWBOY_SERVER_USERNAME` from the spawned environment (`src/pty/index.ts`), so the leak upstream fixed was never present here. |
| T0.8 checkpoint restore data-loss | ✅ done | `52e01a2b2f` | Ported `16f8e7e`: `NoCowboySessionRevert` re-materialises the baseline and removes files added since; snapshot restore validates every checkpoint (`cat-file -e <hash>^{tree}`) before mutating files and dies instead of logging-and-returning on failure. |
| data-loss batch `0d830cb` | ✅ done | `4901cad0f8` | `$schema` injection via jsonc-parser — no write-on-read churn, comment-first JSONC preserved. |
| data-loss batch `0fe46ec` | ✅ done | `4901cad0f8` | `DbPreflight` heals permissions for nocowboy-owned db files and otherwise names the exact file, instead of an opaque readonly-database crash (`@nocowboy/core/nocowboy/db-preflight`). |
| data-loss batch `1310c12` | ✅ N/A | — | Windows-only snapshot malformed-patch fix; Windows is not a build target at this stage. |
| T0.4 sandbox confinement tail | ✅ N/A | — | We have **no OS-sandbox subsystem**: no sandbox package, no `assertWrite`/`decorateFileSystem`, no sandbox config. Our "sandbox" is a Docker command wrapper (`nocowboy/sandbox.ts`), a different architecture. The part that applied to us — filesystem containment — is already present (`AppFileSystem.contains` rejects `../` and cross-drive; realpath symlink resolution). The upstream confinement engine (bubblewrap/seatbelt/mutation-protocol/network isolation) is a separate subsystem, not a tail. |
| T0.5 PowerShell `--` bash bypass | ✅ N/A | `9416ce84f2` (reverted in `3ab2d5b778`) | Ported and then reverted: PowerShell is not a target at this stage. The upstream bug only manifests through the tree-sitter-powershell parser (bare `--` commands land in ERROR nodes), so it is not reachable on our current bash/zsh surface. Re-port if Windows/PowerShell becomes a target. |

Tier-0 is fully dispositioned: done (T0.1, T0.2, T0.3, T0.6, T0.7, T0.8, T0.10) or explicitly N/A (T0.4, T0.5, T0.9).
