# Svelte 5 Runes conditional directive

> Roadmap id: `svelte5-runes-enforcement` — status is tracked in `docs/roadmap.json`.

## Goal

When the workspace is a Svelte/SvelteKit project, the harness injects a directive
that forces modern **Svelte 5 Runes** architecture and forbids legacy Svelte 3/4
syntax. The directive is **conditional** — it must never bloat the system prompt of
a non-Svelte project.

## Trigger

The workspace is detected as Svelte/SvelteKit when either holds:

- a `svelte.config.{js,ts,mjs,cjs}` file exists at the project root; or
- `package.json` lists `svelte` or `@sveltejs/kit` in
  `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies`.

## Implementation

- `packages/opencode/src/nocowboy/svelte-runes.ts` — `SvelteRunes`:
  - `detected(dir)` — the trigger above (config file or dependency).
  - `directiveFor(dir)` — returns `DIRECTIVE` when detected, otherwise `undefined`.
  - `DIRECTIVE` — the ruleset text.
- `packages/opencode/src/session/system.ts` — `SystemPrompt.environment()` appends
  the directive to the environment block only when `directiveFor` returns one, so
  it reaches the system prompt of any agent working in a Svelte workspace and
  nothing else.

## Directive contents

Forbidden (legacy): `export let`, `$:` reactive statements, `<slot>`,
`on:click`-style directives, `createEventDispatcher`, Svelte stores (`writable` /
`readable`) for *local* component reactivity.

Mandatory: `$props()`, `$state`, `$derived` / `$derived.by`, `$effect`,
`$bindable`, snippets (`{#snippet}` / `{@render}`), native lowercase events.

SvelteKit: `load` in `+page.server.ts` / `+page.ts` typed from `./$types`, data via
`$props()`, form actions with `use:enhance`.

## Boundary

The directive triggers on the **workspace** (config file / dependency), which is
the project-level signal. Per-edit triggering on an individual `.svelte` /
`+server.ts` file is not a separate path: any project containing those files and a
Svelte runtime is already a Svelte workspace, so the directive is already active.
A file-edit hook would only add a second, redundant detector.

## Evidence

- `packages/opencode/test/nocowboy/svelte-runes.test.ts` — non-Svelte projects
  (and a project without `package.json`) get **no** directive; `svelte.config.js`,
  `svelte` dep, and `@sveltejs/kit` dep each trigger it; the directive contains
  every forbidden pattern and every mandatory replacement / SvelteKit rule; a
  malformed `package.json` does not crash detection.
- `bun run typecheck` — exit 0.
