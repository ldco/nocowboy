# Stop injecting the drifting PM4 rule cache — automatic context is state only

> Roadmap id: `puppetmaster-mcp-no-rule-injection` — status is tracked in `docs/roadmap.json`.

## Problem

v1.4.2 (commit `a18db15f82`) repaired PM4 detection and routed `pm_inject_context`
through `MCP.Service.call`, so every PM4 session began receiving the tool result as
a `## PuppetMaster 4 Project Context` block in the system prompt. That tool returned
`compressedRules` — nine hardcoded rules plus `PROJECT:`/`MODULES:` lines.

The nine rules were a condensed copy of the project's `AGENTS.md`, and the copy had
drifted:

| Injected cache | PM4 reality | Harm |
|---|---|---|
| "FEATURES/MODULES from `$lib/config/site`" | defined in `src/project/site-config.ts`; `$lib/config/site` only re-exports | the agent edits the framework barrel instead of the project layer |
| nine absolutes ("no `<style>`, no BEM", "use canonical primitives", "every string via `t()`") | `AGENTS.md` (284 lines) with allowlists, `NATIVE_OWNERS`, native-owner exceptions and "data-driven titles stay inline" | the agent "fixes" documented exceptions and breaks working code |

NoCowboy already loads `AGENTS.md` automatically, so the session carried two rule
sources — and the condensed one was wrong and blunter.

## What changed

### `packaging/mcp-servers/puppetmaster/src/tools/knowledge.ts`

- `compressedRules(project)` replaced by `projectState(project)`, which returns only
  runtime facts a static `AGENTS.md` cannot carry:

  ```
  PuppetMaster 4 project detected — AGENTS.md is authoritative for framework rules.
  PROJECT: <name> mode=<mode> defaultLocale=<locale>
  MODULES: faq=ON, team=OFF
  ```

- `pm_inject_context` calls `projectState`; an unreadable/missing config still yields
  `""`, so `PuppetMaster.promptBlock` never leaves a dangling header.
- `pm_knowledge topic=rules` is unchanged — it stays the full, explicit knowledge
  path. Only the automatic injection lost the rules.
- `TOPICS.state` / `TOPICS.rules` now name `src/project/site-config.ts` as the place
  where FEATURES/MODULES live (previously `$lib/config/site`, a re-export barrel).
- `dist/` rebuilt with `tsc`.

### `packages/opencode/test/nocowboy/puppetmaster-mcp.test.ts`

`injects PM4 rules plus the typed module state` became
`injects PM4 project state, never cached rules`: it asserts the state lines and that
`Self-check`, `canonical ui/`, `NO literal`, `validate:pm4` and `PM4 PROJECT` are
absent. The `pm_knowledge topic=rules` test is unchanged and still sees the rules.

## Note on the table count

The plan proposed changing the database topic from "39 framework tables" to "38".
Verified against `PuppetMaster4/src/lib/server/db/schema.ts`: there are **39**
distinct `sqliteTable` definitions, so the count was already correct and was not
changed — 38 would have introduced an error.

## Verification

- `bun test test/nocowboy/puppetmaster-mcp.test.ts test/nocowboy/puppetmaster-detect.test.ts`
  → 28 pass, 0 fail.
- `bun run typecheck` → 11/11 tasks successful.
- `bun run build` in `packaging/mcp-servers/puppetmaster` (tsc) → OK.
