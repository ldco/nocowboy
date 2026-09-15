# Agent system vs the best harnesses — 2026-09 assessment

Owner question: *how does our agent system compare to the best harnesses in the
world — are we right, better, or worse?*

Method: compare our architecture, read from this repo, against the publicly
documented behaviour of the mainstream harnesses. Competitor claims are marked
with confidence; anything I cannot verify is marked 🟡 and should not be treated
as settled.

## What we compared

Axes: agent loop, tools, permissions, memory, subagents/teams, UX/TUI,
extensibility, and operability (packaging, tests, releases).

## Where we are clearly ahead

1. **Permission model depth (🟢).** Wildcard rules, per-session and global
   scopes, a global allow-everything grant that survives restarts *and* still
   lets explicit denies and external-directory vetoes win, plus config-path
   protection. Most harnesses offer a coarse "auto-approve toggle" or a
   per-command allowlist.
2. **Cross-model review cascade (🟢, ours).** Choosing the reviewer by the
   author's model family and running a second review phase is not a pattern the
   mainstream harnesses ship. It is opt-in and configurable
   (`docs/features/review-cascade.md`).
3. **Project memory that outlives the session (🟢).** NUTAUSIK gives tasks,
   memory, decisions, handoffs and gates over MCP — durable across sessions and
   shared across concurrently running instances. Several harnesses have no
   persistent project memory at all; some have per-repo notes.
4. **Operability discipline (🟢).** A roadmap verifier (148 features, 238
   directives), commit-message guards, attestations, and a compile-to-single-
   binary release path. This level of mechanical enforcement is rare.
5. **Startup performance (🟢, measured).** Lazy command loading took `--version`
   from 3.4 s to 0.28 s and `--help` from 2.5 s to 0.62 s (`7160fbbe13`).

## Where we are level

6. **Tools (🟢).** We have the standard set (read/edit/bash/grep/glob/search),
   plus subagents, background processes, web, MCP, skills. Comparable breadth.
7. **Subagents (🟢).** One-level delegation, per-subagent model choice, stall and
   runtime watchdogs, background subagents. This matches or exceeds the common
   "spawn an agent" feature; the watchdog is a differentiator.
8. **Extensibility (🟢).** Plugins, skills, MCP servers, agent definitions,
   commands. On par with the leaders.
9. **TUI (🟡).** Solid, feature-rich, Russian-localised hooks — but the wide
   ecosystem harnesses have larger plugin/theme communities.

## Where we are behind

10. **Ecosystem and community (🟡).** Distribution, integrations and third-party
    content are far smaller. This is a function of age, not design.
11. **Multi-agent orchestration (🟡).** We have teams and background subagents,
    but no durable, resumable long-horizon workflow engine across process
    restarts. The closest mainstream analogues ship visual/UIs for this.
12. **Model-agnostic cost governance (🟡).** We show balance for a few providers
    (DeepSeek, Kimi, OpenRouter). Budget caps per task and automatic downgrade
    are not yet enforced end-to-end (task rows carry budget columns; enforcement
    is partial).
13. **Docs for users (🟡).** Internal docs are now clean, but user-facing
    guides lag the implementation.
14. **Test coverage of the TUI (🟡).** The render smoke tests require a real TTY
    and do not run headless; behaviour is otherwise covered by unit tests.

## Prioritised recommendations

| # | Recommendation | Why | Effort |
|---|---|---|---|
| 1 | Behavioural routing in the router prompt: code questions → code index; decisions/gotchas → NUTAUSIK FTS | Removes the "double search" behaviour, cheap | S |
| 2 | Enforce per-task budget caps (token/cost columns already exist) and auto-downgrade | Turns existing schema into a real guardrail | M |
| 3 | Durable, resumable goal workflows across restarts | Closes the biggest orchestration gap | L |
| 4 | Wire the existing i18n provider into TUI components | Completes a feature that is currently infrastructure-only | M |
| 5 | Headless TTY harness for TUI tests | Makes the TUI genuinely testable in CI | M |
| 6 | Publish user docs generated from `docs/features/` | Leverages work already done | S |

## Bottom line

On the axes that matter for a *professional Russian-language coding harness* —
permissions, project memory, cross-model review, operability, startup speed — we
are ahead of or level with the mainstream. We are behind mainly on ecosystem,
long-horizon orchestration, and user-facing docs. None of those are architectural
blockers; the first is time, the other two are scoped work.

Not-investigated (🟡, do not quote as fact): exact feature parity of any specific
competitor version. This assessment compares *patterns*, not pinned releases.
