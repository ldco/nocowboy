// Roadmap: svelte5-runes-enforcement (v1.2.0).
//
// The Svelte 5 Runes directive must be injected conditionally — only in a
// Svelte/SvelteKit workspace — and must forbid the legacy Svelte 3/4 syntax.
import { test, expect, describe } from "bun:test"
import { SvelteRunes } from "../../src/nocowboy/svelte-runes"
import { tmpdir } from "../fixture/fixture"
import path from "path"

const writePackage = (dir: string, pkg: unknown) => Bun.write(path.join(dir, "package.json"), JSON.stringify(pkg))

describe("SvelteRunes", () => {
  describe("conditional trigger", () => {
    test("not injected for a non-Svelte project", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await writePackage(dir, { dependencies: { zod: "^3.0.0", express: "^4.0.0" } })
        },
      })

      expect(SvelteRunes.detected(tmp.path)).toBe(false)
      expect(SvelteRunes.directiveFor(tmp.path)).toBeUndefined()
    })

    test("not injected for a project with no package.json at all", async () => {
      await using tmp = await tmpdir()

      expect(SvelteRunes.detected(tmp.path)).toBe(false)
      expect(SvelteRunes.directiveFor(tmp.path)).toBeUndefined()
    })

    test("injected when svelte.config.js is present", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, "svelte.config.js"), "export default {}")
        },
      })

      expect(SvelteRunes.detected(tmp.path)).toBe(true)
      expect(SvelteRunes.directiveFor(tmp.path)).toContain("Svelte 5 Runes")
    })

    test("injected when package.json depends on svelte", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await writePackage(dir, { devDependencies: { svelte: "^5.0.0" } })
        },
      })

      expect(SvelteRunes.detected(tmp.path)).toBe(true)
      expect(SvelteRunes.directiveFor(tmp.path)).toBeDefined()
    })

    test("injected when package.json depends on @sveltejs/kit", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await writePackage(dir, { dependencies: { "@sveltejs/kit": "^2.0.0" } })
        },
      })

      expect(SvelteRunes.detected(tmp.path)).toBe(true)
      expect(SvelteRunes.directiveFor(tmp.path)).toBeDefined()
    })

    test("a malformed package.json does not crash detection", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, "package.json"), "{ not json")
        },
      })

      expect(SvelteRunes.detected(tmp.path)).toBe(false)
    })
  })

  describe("legacy syntax is explicitly forbidden", () => {
    test("every prohibited pattern is present in the directive", () => {
      for (const forbidden of [
        "export let",
        "$:",
        "<slot",
        "on:click",
        "createEventDispatcher",
        "writable",
        "readable",
      ]) {
        expect(SvelteRunes.DIRECTIVE).toContain(forbidden)
      }
    })

    test("mandatory Svelte 5 replacements are present", () => {
      for (const required of ["$props()", "$state", "$derived", "$derived.by", "$effect", "$bindable", "{#snippet}", "{@render}"]) {
        expect(SvelteRunes.DIRECTIVE).toContain(required)
      }
    })
  })

  describe("SvelteKit architecture rules", () => {
    test("typed load, use:enhance and data via $props()", () => {
      for (const rule of ["./$types", "use:enhance", "$props()"]) {
        expect(SvelteRunes.DIRECTIVE).toContain(rule)
      }
    })
  })
})
