# Upstream Sync Audit — NoCowboy vs KiloCode

**Date:** 2026-09-15
**Author:** NoCowboy Architect
**Scope:** everything upstream shipped after our fork point `ca721a26f` that we have not reviewed or taken.

---

## 1. Measured divergence facts

All numbers spot-checked today (2026-09-15) unless marked otherwise.

| Fact | Value | Evidence |
|---|---|---|
| Fork point | `ca721a26f9` "NoCowboy TUI — fork of KiloCode v7.3.46" | `git log --oneline -1 ca721a26f`; commit dated **2026-06-19** |
| Upstream remote | `https://github.com/kilo-org/kilocode.git` | `git remote -v` |
| `upstream/main` now | `9597be3a14` (2026-09-15 13:08) | measured by user, re-verified `git fetch` state |
| Commits upstream since fork | **30 664** | `git rev-list --count ca721a26f..upstream/main` (verified) — includes upstream's own merges of `sst/opencode`, treat as *direction*, not line count |
| Upstream **non-merge** commits since fork | **26 036** | `git rev-list --count --no-merges ca721a26f..upstream/main` (verified) — the honest "their own hand-written work" upper bound |
| Our own commits since fork | **756** | `git rev-list --count ca721a26f..HEAD` (verified, HEAD = `ddf2a1ff6d`); task brief said 754 — +2 landed since (rebrand `a5d9d2a16f`, docs `ddf2a1ff6d`) |
| Upstream releases ever merged | **0** | `git rev-list --merges --count HEAD` = 0; `git log --merges` empty (verified) |
| Unreviewed release tags | 25 + a hidden tail (see §2) | `git tag -l` (verified) |
| Our version line | `0.13.x` (own) vs upstream `7.7.x` | `git log --oneline -1 HEAD` = `0fdf29d98 chore(release): v0.13.1` |
| `kilocode_change` markers | ~850 in our tree; ~558 upstream files | user-measured; spot-check of `.ts` alone found **780 matches** (grep), remainder in `.tsx`/other |

The `30 664` figure is dominated by upstream merging the whole `sst/opencode` history repeatedly. It is **not** 30k files of hand-written delta. The actionable surface is the per-release changesets in `packages/opencode/CHANGELOG.md` (read via `git show upstream/main:packages/opencode/CHANGELOG.md`), summarized in §4.

---

## 2. ⚠️ The "25 tags" undercounts the gap

The user's list "v7.4.0–v7.7.1" is correct for the **minor/major** line, but the fork commit `ca721a26f` (2026-06-19) also leaves a **post-fork v7.3.x tail** unreviewed:

| Tag | Date | Notable content |
|---|---|---|
| v7.3.48–v7.3.50 | 2026-06-18/19 | pre-freeze patches |
| v7.3.51–v7.3.54 | 2026-06-22/23 | config `.opencode`→`.kilo` migration (#11638), recall tool (#11468), sandbox session state |
| **v7.3.63** | 2026-06-30 | **sandbox security hardening**: symlink-escape fix (#11591 `76a9d9b`), Linux network restriction (#11659 `7f4702b` / #11603 `9fbc456`), writes confined to project roots (#11556 `c55e804`), session-weakening prevention (#11703 `163aef5`), worktree confinement (#11584 `588335e`) |

Confidence that these are missing from our tree: 🟢 **verified** — `git rev-list --count HEAD..v7.3.63` = **23 675** (non-zero ⇒ v7.3.63 is not an ancestor of HEAD). The entire post-fork v7.3.x tail (v7.3.48→v7.3.63), including the v7.3.63 sandbox hardening, is **absent** from our tree. **The sandbox hardening in v7.3.63 is a first-class security gap** and is triaged in §5/§7.

---

## 3. Method

- Upstream release notes: `git show upstream/main:packages/opencode/CHANGELOG.md` (changesets, reverse-chronological).
- Per-tag dates: `git tag -l --format`.
- Our-tree equivalence checks: grep/read of `package.json`, `packages/opencode/src/tool/task.ts`, `packages/opencode/src/nocowboy/session/{stream-idle,watchdog}.ts`.

---

## 4. Release-by-release, grouped by area

Legend: **(S)=security**, **(D)=data-loss**, **(P)=permissions/approval**, **(perf)=performance**, **(ux)=UX**. SHA is the changeset commit.

### 4.1 Security (S)

| Release | PR | SHA | What |
|---|---|---|---|
| v7.4.1 | #11887 | `51dc189` | Require authentication before enabling allow-everything permissions over HTTP (S) |
| v7.4.2 | #11886 | `b793bf7` | **Config credential substitution hardening** — `{env:VAR}` now resolves only in trusted config; `{file:...}` confined to project root (rejects `../`, absolute, symlink escapes). Closes malicious-repo secret exfiltration to attacker `baseURL` (S) |
| v7.4.7 | #12168 | `032f3bb` | Block env and out-of-project file substitutions in project markdown config (S) |
| v7.4.17 | #12585 | `a0a760e` | **Bash permission bypass** on PowerShell for bare `--` commands (e.g. `git checkout -- file`) — unparsable commands now checked against raw text (S) |
| v7.4.17 | (upstream `opencode`) | `#12460` | Prevent local server credentials from leaking into spawned PTY processes (S) |
| v7.4.21 | #12554 | `dcf9c5a` | Prevent project MCP configs from resolving variable-backed headers / inheriting trusted headers when changing endpoints (S) |
| v7.4.22 | #12373 | `3a99f36` | Fix subagent **phantom deny rules** — read-only parent `readOnlyBash` allowlist no longer projected onto writable subagents (S, correctness) |
| v7.4.23 | #13124 | `d4f3a3a` | Stop broad "Allow everything" / catch-all `<command> *` rules from granting Ask/Plan modes mutating tools (S) |
| v7.5.6 | #13484 | `34b10a6` | **ReDoS fix** in glob matching — minimatch → 10.2.6 (S) |
| v7.3.63 | #11591/#11584/#11556/#11703/#11603/#11659 | `76a9d9b` etc. | macOS/Linux sandbox confinement + symlink-escape + session-weakening prevention (S, see §2) |

### 4.2 Data-loss / session integrity (D)

| Release | PR | SHA | What |
|---|---|---|---|
| v7.4.17 | #12545 | `b2735bf` | **Session transcripts losing final messages on exit** — pending uploads flushed on shutdown and on session close (D) |
| v7.4.17 | #12587 | `16f8e7e` | **Checkpoint restore** — keep conversation + workspace unchanged when a checkpoint can't be fully restored (D) |
| v7.4.17 | #12583 | `1310c12` | Keep Windows snapshot diffs parseable; preserve valid files when a stored patch is malformed (D) |
| v7.4.16 | #11940 | `0d830cb` | `$schema` injection via jsonc-parser — avoids write-on-read corruption of comment-first JSONC (D) |
| v7.4.16 | #12508 | `0fe46ec` | Fatal "readonly database" startup crash — auto-repair WAL permissions (D) |
| v7.4.17 | #12588 | `deddf00` | Bound wait for provider **first response byte** by request timeout (prevents infinite hang) (D-ish, reliability) |
| v7.5.6 | #13493 | `bf7848c` | **Task tool intermittently returning empty `<task_result>`** — synthetic/ignored text parts no longer surfaced as final answer (see §6) |

### 4.3 Provider / model support

- Adaptive thinking for Claude Opus 4.7/Sonnet 5/Fable (v7.4.0 `1d3a9e0`, v7.4.17 `b8d83fb`, v7.2.12 `e60c326`); Opus 4.8 Bedrock (v7.3.20 `593903f`).
- xAI Grok OAuth + SuperGrok device-code (v7.3.9 `4ef3717`); prompt-cache key for xAI (v7.4.15 `2dc1a52`).
- Mistral Medium 3.5 reasoning (v7.3.30 `c4de1ac`); GLM-5.2 high/max variants (v7.4.22 `d1d1630b` context).
- GPT-5.6 over ChatGPT OAuth full Codex context window (v7.4.23 `5e6e93a`); GPT-5.6 tool schemas w/ regex lookarounds (v7.4.7 `be15cf4`).
- DeepSeek multi-turn reasoning round-trip on OpenRouter (v7.2.25 `c8113f2`) — **note: pre-fork, likely already in our tree**.
- Anaconda local model server (v7.3.63 `7b2063f`).

### 4.4 TUI / UX

- TUI question dialog Enter/Escape fix while autocomplete active (v7.6.1 `7c23a3e`).
- `/review` findings as numbered severity-tagged sections (v7.7.0 `d4e894f`); `/review` staged/unpushed/quick modes (v7.4.21 `0e1f11b`).
- Vim modal editing in prompt (v7.4.2 `69f5b9d`).
- About dialog + diagnostics copy (v7.5.8 `d8a35ff`).
- `/auto-approve` toggle (v7.4.17 `92076e7`); privacy mode (`/privacy`, v7.4.21 `6b8c736`).
- Token-throughput display (v7.4.16 `dcc0d64`); `last commit` diff option (v7.5.8 `d638418`).
- Home/End cursor restore (v7.5.16 `d75ae54`).

### 4.5 Session / memory / recall (overlaps our `nocowboy_local_recall`)

- **Local session recall speedup + whole-word ranking + typo matching** (v7.7.1 #14148 `02e92bc`; earlier v7.4.19 `2fbd380`, v7.4.11 `06c2337`).
- Search latest 5 000 chats across worktree family, best 50 matches (v7.5.6 `5d1313f`).
- `@` past-chat mention picker (v7.4.16 `3d648d7`).
- Project memory opt-in commands/tools (v7.4.2 `b976b5a`; memory package `@kilocode/kilo-memory` appeared v7.4.15+).

### 4.6 Worktree / snapshot / performance

- **First worktree snapshot several times faster** — reuse index state, reconcile before first prompt, defer repack (v7.7.0 #14115 `f40394f`).
- **Pre-warm worktrees** — claim ready checkout instead of full checkout (v7.7.0 #14050 `7a6ab9a`).
- Defer file indexing until search used (v7.4.21 `12865` `35801cb`); avoid home-dir indexing (v7.5.6 `6e05f48`).
- CLI cold/warm startup speedups (v7.5.0 `4ca951c`, v7.4.18 `ed9e132`).

### 4.7 Permissions / approval / sandbox

- **Permission denials carry feedback so the agent adjusts** (v7.7.0 #14051 `b30b2cf`).
- Subagents continue and return findings on permission denial (v7.5.11 `4b85267`).
- Sandbox settings page + per-session toggle + network allowlist (v7.4.4 `394af39`, v7.4.6 `1e0b25a`, v7.4.0 `1f80fdf`).
- Prompt before reading `.env` even after broad read approval (v7.2.42 `27d14d4` — pre-fork, likely in our tree).

### 4.8 Goal / orchestration (overlaps our goal judge)

- `/goal` with pause/resume/clear, model self-reports completion (v7.6.0 #13679 `e27ff0a`).
- **Goal keeps running after a user message** (v7.7.0 #14101 `5665631`).
- Kilo Swarm shared agent board (`board_post`/`board_read`, v7.5.11 `c0eba39`; enabled by default v7.7.0 `50fc57d`).
- Background subagents enabled by default (v7.5.0).

### 4.9 Gateway / cloud / remote / build

- PR-link via `set_pr_link` remote command; removal of GraphQL-rate-limit-burning poller (v7.7.0 #14075 `fdf1bca`).
- Auxiliary tasks (titles/commit/branch) routed to cloud small model only when credentials exist, else session model (v7.7.0 #13192 `1e73d38`).
- Scheduled/cancellable session wakeups (v7.7.0 #14094 `b7070e5`).
- Whole-project `/reload` across worktrees (v7.7.0 #14103 `3a2c5d5`).
- Build CLI with Bun 1.4 (v7.5.0 `eba00e6`).
- Removed `interactive_terminal` tool (major, v7.6.0 `b5cf426`).

> Gateway/cloud items (`kilo-gateway`, `kilo-telemetry`, `kilo cloud`, KiloClaw, Swarm board) are **upstream-only** — they depend on kilo.ai cloud infra we do not use. Treat as **ignore** unless a specific one also fixes a local-only bug.

---

## 5. Items RELEVANT to NoCowboy

| # | Item (release·PR·SHA) | Why it matters | Our equivalent? | Effort | Risk | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Task tool empty `<task_result>` (7.5.6 #13493 `bf7848c`) | **Directly fixes our #1 gotcha** — reviewer subagent returning empty output | ❌ bug live in our tree: `src/tool/task.ts:405-407` still emits `synthetic:true` marker that can be read as final answer | S | Low | **PORT (immediate)** |
| 2 | minimatch ReDoS (7.5.6 #13484 `34b10a6`) | glob ReDoS is remotely triggerable via agent search patterns | ⚠️ we are **one patch behind**: `packages/core/package.json:41` = `minimatch 10.2.5`, fix is `10.2.6` | S | Low | **PORT (immediate)** |
| 3 | Config credential exfiltration (7.4.2 #11886 `b793bf7` + 7.4.7 #12168 `032f3bb`) | malicious repo can exfiltrate `{env:...}` secrets to an attacker `baseURL`, and `{file:...}` can read arbitrary files | 🔴 **verified vulnerable**: inherited `src/config/variable.ts:37,41` resolves `{env:}`/`{file:}` with no trust check, **and** our own `src/nocowboy/config/markdown.ts:13-31` re-implements the same substitution and even allows absolute + `~/` paths (worse) | M | Med | **PORT to BOTH sites** |
| 4 | Session transcript flush on exit (7.4.17 #12545 `b2735bf`) | losing final assistant messages on shutdown | ❌ not verified; upstream fix is post-fork | S | Med | **PORT** |
| 5 | Bash permission bypass, bare `--` (7.4.17 #12585 `a0a760e`) | permission bypass on Windows PowerShell | 🟡 our permission matcher forked; unparsable-command path likely shared | M | Low | **PORT** |
| 6 | PTY credential leak (7.4.17 #12460) | local server secrets leaking into spawned PTY | 🟡 shared upstream `opencode` surface | M | Low | **PORT** |
| 7 | Ask/Plan catch-all mutation (7.4.23 #13124 `d4f3a3a`) | "Allow everything" grants mutating tools to read-only modes | 🟡 our permission modes (plan/architect) mirror this exact structure | M | Med | **ADAPT** |
| 8 | Checkpoint-restore data-loss (7.4.17 #12587 `16f8e7e`) | revert must not destroy workspace/conversation | ❌ not verified; post-fork | M | Med | **PORT** |
| 9 | Provider first-byte timeout (7.4.17 #12588 `deddf00`; 7.4.15 #12249 `cd205d8`) | hangs when provider accepts request then sends nothing | ⚠️ **we have our own** `nocowboy/session/stream-idle.ts` + `watchdog.ts`; upstream adds a *first-byte deadline* we may lack | M | Med | **ADAPT (reconcile, don't duplicate)** |
| 10 | Subagent phantom deny rules (7.4.22 #12373 `3a99f36`) | delegated subagents blocked by parent's read-only allowlist | 🟡 our subagent permission inheritance is forked from the same logic | M | Med | **ADAPT** |
| 11 | Session recall speedup + typo/whole-word (7.7.1 #14148 `02e92bc`) | faster recall on large histories | ⚠️ **we built our own** `nocowboy_local_recall`; upstream's is ranking/typo-focused, ours is title/transcript search | M | Low | **IGNORE/ADAPT — keep ours, borrow ranking heuristics if cheap** |
| 12 | Goal continues after user message (7.7.0 #14101 `5665631`) | UX of long-running goals | ⚠️ **we built our own goal judge** (independent evaluator); upstream's model self-reports — different design | L | Med | **IGNORE (keep ours)** |
| 13 | First-worktree-snapshot + pre-warm (7.7.0 #14115 `f40394f` + #14050) | big perf win | 🟡 we are TUI-first; worktrees less central, but snapshot path is shared upstream code | L | Med | **DEFER (perf, not correctness)** |
| 14 | PR-link detection (7.7.0 #14075 `fdf1bca`) | kills GraphQL rate-limit poller | ❌ not applicable (no PR surface in TUI today) | S | Low | **IGNORE** |
| 15 | Sandbox hardening (7.3.63 §2) | symlink-escape / network / write-confinement | ❌ almost certainly missing (post-fork tail) | L | High | **PORT core confinement; triage first** |

---

## 6. The headline finding

**Our most painful live bug is already fixed upstream and waiting to be ported.**

`packages/opencode/src/tool/task.ts:395-417` — `TaskTool.injectBackgroundResult` injects a synthetic `type:"text", synthetic:true` part into the parent prompt. Upstream v7.5.6 #13493 (`bf7848c`) is explicit:

> "Subagents that ran with memory context had a synthetic marker part appended after their answer, which was picked up as the final text part and surfaced as an empty `<task_result>` to the parent agent. The task tool now ignores synthetic, ignored, and empty text parts."

This is byte-for-byte the **"reviewer subagent returns `<task_result></task_result>`"** failure we logged. Porting it is a single-file, low-risk fix that removes a whole class of silent subagent no-ops — **including the reviewer-attestation pipeline that failed our 0.13.1 release.**

---

## 7. SECURITY and DATA-LOSS call-outs (top priority regardless of everything else)

**Security — port before any feature work:**
1. `minimatch` 10.2.5 → **10.2.6** (ReDoS) — one-line dep bump, remotely triggerable.
2. Config credential substitution hardening — `b793bf7` + `032f3bb` — secret exfiltration via malicious repo.
3. Bash permission bypass (bare `--`) — `a0a760e`.
4. PTY credential leak — upstream #12460.
5. Ask/Plan catch-all mutation — `d4f3a3a`.
6. Sandbox confinement tail — v7.3.63 (`76a9d9b`, `c55e804`, `163aef5`) — **verify ancestry first**.

**Data-loss — port before any feature work:**
1. Session transcript flush on exit — `b2735bf`.
2. Checkpoint-restore preservation — `16f8e7e`.
3. Windows snapshot diff malformed-patch preservation — `1310c12` (if Windows is a target).
4. `$schema` write-on-read JSONC corruption — `0d830cb`.

---

## 8. Verdict

We are a **hard fork** that has drifted 30 664 commits / 25+ release tags with **zero** upstream merges, while independently re-implementing recall, goal-judging, permissions, and watchdog layers. That is survivable — but it is currently **unmanaged**: no cadence, no triage, and we are carrying **at least one known security gap (minimatch ReDoS) and one known silent-failure bug (empty task result) that upstream has already fixed.**

The correct posture is not "merge upstream" (infeasible) and not "ignore upstream" (what we've de-facto done). It is a **systematic, low-ceremony cherry-pick discipline** anchored on the `kilocode_change` markers. Full strategy and operating procedure in `docs/adr/ADR-upstream-sync-strategy.md`.
