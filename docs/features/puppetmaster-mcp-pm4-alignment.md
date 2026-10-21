# PuppetMaster MCP alignment — PM4 detection, typed config tools and project-scoped enable

> Roadmap id: `puppetmaster-mcp-pm4-alignment` — status is tracked in `docs/roadmap.json`.

## Problem

The puppetmaster MCP was written for Puppet Master v2/v3 and the harness
detected PM projects by the same dead marker. PM4 replaced the old layout:

| Dimension | MCP / harness knew | PM4 reality |
|---|---|---|
| Config | `project/puppet-master.config.ts` | `src/project/pm.config.ts` (`PM_CONFIG`) + `src/project/site-config.ts` |
| Modules | v3 module list | `src/lib/config/modules.ts` (ModuleManifest, ADR-04) |
| Database | “Drizzle + SQLite, same as v2”, 31 tables | async libSQL via `@libsql/client`, 39 framework tables |
| Init | `node_modules/.bin/nuxt` | SvelteKit 2 + Vite 7 |
| Modules present | page/CMS module | **no page/CMS module** |

Because the harness checked `project/puppet-master.config.ts`, every PM4
checkout was classified as a non-PM project: the system-prompt injection and the
PM memory write never fired. The MCP itself would have injected v3 paths and a
v3 module list — worse than no context.

## What changed

### One detection point

`packages/opencode/src/nocowboy/puppetmaster.ts` owns PM4 detection:
`src/project/pm.config.ts` or `src/lib/config/modules.ts`, or
`package.json.name === "puppetmaster-4"`. The deleted v2/v3 path is deliberately
rejected. The three former detection sites (`nutausik-client`,
`nutausik-auto-wire`, `session/system`) use this module.

### Context through the MCP service, not the proxy

`MCP.Service.call(server, tool, args)` was added to the MCP service. The system
prompt calls `pm_inject_context` on the connected puppetmaster stdio client;
the old `fetchPmContext` raw HTTP request to `127.0.0.1:9201` is gone. Injection
is gated on `status === "connected"`, and `PuppetMaster.promptBlock` refuses to
emit a header without text.

### Typed config and ModuleManifest

`packaging/mcp-servers/puppetmaster` now loads `PM_CONFIG` and
`MODULE_MANIFEST` instead of regex-parsing a TS file:

- `pm_config_get` returns `{ config, modules, moduleManifest }` and resolves
  `config.<path>` / `modules.<id>` keys.
- `pm_inject_context` renders compressed PM4 rules plus the project name, mode,
  default locale and enabled/disabled modules.
- `pm_status` reports `PM_CONFIG.mode`, the manifest, `data/sqlite.db` and the
  Vite server on `5173`.
- `pm_init` checks SvelteKit/Vite dependencies and reads `PM_CONFIG.mode`.
- `pm_dev` keeps `npm run dev` so PM4's `predev` (env-bootstrap + Paraglide sync)
  is not skipped.

`pm_config_set` is intentionally narrow and fail-closed:

1. only unique scalar leaves inside the `export const PM_CONFIG` block;
2. complete literal matching (a URL containing a comma is replaceable; arrays
   and objects are refused);
3. a replacement **function** so `$&` / `$'` in values stay literal;
4. a temp `.ts` is written next to the target, imported, the new value is
   checked, then `renameSync` replaces the original — a failed validation leaves
   the file byte-identical and no temp file behind;
5. `modules.<id>.enabled` flips `moduleEnabled` **and** `defaultEnabled` (public
   route + admin page are one switch) and rejects admin-only page ids.

### Knowledge base

`pm_knowledge` topics now describe SvelteKit 2 + Svelte 5 runes + Tailwind v4,
the `ui/` primitive layer, async libSQL, the typed config + ModuleManifest, and
the PM4 module set (`faq`, `contact`/`contacts`, `portfolio`, `blog`; optional
`testimonials`, `team`, `pricing`, `clients`, `features`) with no page/CMS.
`security` and `compliance` were kept (they already matched the PM4 env
contract).

### Project-scoped enable

The PM MCP stays disabled globally. PM4's `.nocowboy/nocowboy.jsonc` enables it
with `environment.PM_PROJECT_ROOT`, and launches `bun .../src/index.ts` so a
clean checkout does not depend on the ignored `dist/` tree.

## Key files

- `packages/opencode/src/nocowboy/puppetmaster.ts`
- `packages/opencode/src/nocowboy/nutausik-client.ts`
- `packages/opencode/src/nocowboy/nutausik-auto-wire.ts`
- `packages/opencode/src/session/system.ts`
- `packages/opencode/src/mcp/index.ts`
- `packaging/mcp-servers/puppetmaster/src/tools/{utils,config,status,init,dev,knowledge}.ts`
- `packaging/mcp-servers/puppetmaster/src/prompts.ts` (now tracked)

## Verification

- `bun test test/nocowboy/puppetmaster-detect.test.ts` — detection markers,
  legacy-path rejection, context flattening, connected/disabled gating.
- `bun test test/nocowboy/puppetmaster-mcp.test.ts` — config get/set, scalar and
  ambiguity safety, module gates, status, init, knowledge, injection.
- `bun run typecheck` — workspace 11/11.
- MCP `npm run build` and a stdio smoke: 27 tools; injection reports PM4 modules.

## Known limitations

- The MCP loads TypeScript configs with `bun` (tsconfig `$lib` aliases); a
  plain-node launch cannot import `modules.ts`.
- `pm_config_set` refuses nested arrays/objects by design — those edits stay
  manual because `pm.config.ts` is imported by `svelte.config.js`.
- The PM4 project config stores an absolute MCP command path; moving the
  NoCowboy checkout requires updating it (same class of issue as
  `~/.nocowboy/mcp/launch.json`).
