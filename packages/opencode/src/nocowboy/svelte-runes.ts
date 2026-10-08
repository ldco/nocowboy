import { existsSync, readFileSync } from "fs"
import { join } from "path"

/**
 * Conditional Svelte 5 Runes directive.
 *
 * The harness must force modern Svelte 5 Runes architecture in a
 * Svelte/SvelteKit workspace and forbid legacy Svelte 3/4 syntax. The directive
 * is *conditional*: it is injected only when the workspace is detected as
 * Svelte/SvelteKit (a `svelte.config.*` file, or `svelte` / `@sveltejs/kit` in
 * `package.json`). It must never bloat the system prompt of a non-Svelte project.
 */
export namespace SvelteRunes {
  const CONFIG_FILES = ["svelte.config.js", "svelte.config.ts", "svelte.config.mjs", "svelte.config.cjs"]
  const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]

  export const DIRECTIVE = [
    "## Svelte 5 Runes — MANDATORY (legacy Svelte 3/4 is forbidden)",
    "",
    "This workspace is Svelte/SvelteKit. Generate Svelte 5 code only.",
    "",
    "FORBIDDEN legacy syntax (never emit or suggest):",
    "- `export let` (legacy props) → use `$props()`",
    "- `$: ...` reactive declarations/statements → use `$derived` / `$derived.by` / `$effect`",
    "- `<slot>` / `<slot name=...>` → use snippets (`{#snippet}` / `{@render}`)",
    "- `on:click` / `on:input` / `on:submit` directive events → use native lowercase attributes (`onclick`, ...)",
    "- `createEventDispatcher` → pass callback props",
    "- Svelte stores (`writable`, `readable`) for *local* component reactivity → use `$state` / `$derived`. Stores remain only for genuinely global shared state.",
    "",
    "MANDATORY replacements:",
    "- Props: `let { title, count = 0, value = $bindable(''), onclick, children }: Props = $props();`",
    "- State: `let count = $state(0)`; derivations: `let double = $derived(count * 2)` / `$derived.by(() => ...)`.",
    "- Side effects: `$effect(() => { ...; return () => { /* cleanup */ } })` — browser/DOM only.",
    "- Templates: snippets `{#snippet badge(label)}...{/snippet}` rendered with `{@render badge('x')}`; children via `{@render children()}`.",
    "- Events: `<button onclick={() => count++}>`.",
    "",
    "SvelteKit architecture:",
    "- Keep `load` in `+page.server.ts` / `+page.ts`, typed from the generated `./$types` (`PageServerLoad`, `ActionFailure`).",
    "- Page data in components via `$props()`: `let { data }: { data: PageData } = $props();`.",
    "- Form actions use `use:enhance` from `$app/forms` with proper optimistic/status handling.",
  ].join("\n")

  function hasConfigFile(dir: string): boolean {
    return CONFIG_FILES.some((file) => existsSync(join(dir, file)))
  }

  function hasSvelteDependency(dir: string): boolean {
    try {
      const parsed: unknown = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
      if (!parsed || typeof parsed !== "object") return false
      const pkg = parsed as Record<string, unknown>
      return DEP_FIELDS.some((field) => {
        const deps = pkg[field]
        if (!deps || typeof deps !== "object") return false
        const record = deps as Record<string, unknown>
        return typeof record["svelte"] === "string" || typeof record["@sveltejs/kit"] === "string"
      })
    } catch {
      return false
    }
  }

  /** True when `dir` is a Svelte/SvelteKit workspace (config file or dependency). */
  export function detected(dir: string): boolean {
    return hasConfigFile(dir) || hasSvelteDependency(dir)
  }

  /** The Runes directive when the workspace is Svelte/SvelteKit, otherwise undefined. */
  export function directiveFor(dir: string): string | undefined {
    return detected(dir) ? DIRECTIVE : undefined
  }
}
