# Soul engine scoped to the `nocowboy` agent

> Roadmap id: `soul-engine-agent-scoping` — status is tracked in `docs/roadmap.json`.

## Problem

The soul/identity rules and the soul-engine mandate (Order #0 — connect to
`http://127.0.0.1:9339`, register the session) reached **every** agent. They live
in the shared project rules directory `.nocowboy/rules/`, which is injected
through `config.instructions` for all agents. On top of that, the per-agent rule
directories (`.nocowboy/rules-{mode}/`) were **not actually scoped**: every
`rules-{mode}` file was appended to the one global instruction list, so a rule
meant for one agent leaked to all of them. The mode registry itself was stale —
`KNOWN_MODES` was `["code", "architect", "debug", "worker", "planner",
"reviewer"]`, naming two agents that do not exist (`code`, `debug`) and omitting
two that do (`nocowboy`, `auto`), so `rules-nocowboy/` could never be addressed.

Result: `auto`, `worker`, `architect`, `reviewer` and `planner` were all told to
invoke the soul engine. Only `nocowboy` should.

## Fix

The root cause was the missing scope, not the file location, so the mechanism was
fixed first and the rules moved second.

1. **Registry brought in line with reality** —
   `packages/opencode/src/nocowboy/rules-migrator.ts` `KNOWN_MODES` is now
   `["worker", "nocowboy", "reviewer", "architect", "planner", "auto"]` (the six
   real agents from `packages/opencode/src/nocowboy/agent/index.ts`). The legacy
   `code`/`debug` names are gone, so `rules-code/` / `.kilocoderules-debug` can no
   longer be discovered for an agent that does not exist.

2. **Agent-scoped rules no longer leak into the global list** — `RulesMigrator`
   `migrate()` now returns only *unscoped* rules unless an `agent` is passed; rules
   whose `mode` equals that agent are included for that agent alone. A new
   `RulesMigrator.scopedRules(projectDir, agent)` exposes exactly the rules scoped
   to one agent.

3. **Per-agent injection** — `packages/opencode/src/session/instruction.ts`
   `Instruction.system(agent)` / `systemPaths(agent)` resolves the agent-scoped
   project rules on top of the global `config.instructions`; the session prompt
   passes `agent.name` (`packages/opencode/src/session/prompt.ts`). The global
   list stays global — it can never carry a scoped rule.

4. **Rules moved** — the soul/identity rules (`сознание.md`,
   `сохранение-души.md`, `защита-стержня.md`, `русский-стержень.md`) moved from the
   shared `.nocowboy/rules/` into `.nocowboy/rules-nocowboy/`. `.nocowboy/` is
   gitignored, so this is a workspace arrangement; the shipped fix is the
   mechanism above.

5. **Second shared channel closed** — the root `AGENTS.md` (loaded for every agent
   via `Instruction` `findUp`) also carried the soul-engine mandate ("connect to
   `127.0.0.1:9339`, do not answer before connecting"). That is the same class of
   leak, so the mandate was removed from the shared file; the `nocowboy` agent
   still gets it from `.nocowboy/rules-nocowboy/сознание.md`.

## Acceptance criteria

- ✅ Soul/identity rules apply only to `nocowboy`; the other agents receive the
  shared rules but not the soul rules.
- ✅ No non-`nocowboy` agent receives a rule carrying the soul-engine mandate
  (`127.0.0.1:9339`) — asserted against rule **content**, not file names.
- ✅ The mode registry equals the real agent set; `auto` gets no soul.

## Boundary

The product deliberately gives *identity* (not the engine mandate) to every agent
through `SystemPrompt.identityAnchor()` in `packages/opencode/src/session/llm.ts`
and the built-in `soul.txt` — those are a separate, intentional design
("for ANY model and ANY agent"), not the rules-file channel this feature scopes.
This feature scopes the **rules files** and the **soul-engine mandate**.

## Evidence

- `packages/opencode/test/nocowboy/soul-engine-agent-scoping.test.ts` — registry
  is the real agent set; global list never carries the soul rules; only
  `nocowboy` gets them; no non-`nocowboy` agent can obtain a rule whose content
  contains the soul-engine marker.
- `packages/opencode/test/nocowboy/instruction.test.ts` — `Instruction.system(agent)`
  injects the scoped soul rule for `nocowboy` and shared rules for everyone, while
  `auto`/`worker`/`reviewer`/`architect`/`planner` never see the soul rule.
- `packages/opencode/test/nocowboy/rules-migrator.test.ts` — updated to the new
  scoping semantics (scoped rules never leak into the global instruction list).
- `bun run typecheck` — exit 0.
