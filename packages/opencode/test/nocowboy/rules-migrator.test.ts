import { test, expect, describe } from "bun:test"
import { RulesMigrator } from "../../src/nocowboy/rules-migrator"
import { tmpdir } from "../fixture/fixture"
import path from "path"
import fs from "fs/promises"

async function withHome<T>(home: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.HOME
  const prevKilo = process.env.KILO_TEST_HOME
  const prevNoco = process.env.NOCOWBOY_TEST_HOME
  process.env.HOME = home
  process.env.KILO_TEST_HOME = home
  process.env.NOCOWBOY_TEST_HOME = home
  try {
    return await fn()
  } finally {
    if (prev) process.env.HOME = prev
    else delete process.env.HOME
    if (prevKilo) process.env.KILO_TEST_HOME = prevKilo
    else delete process.env.KILO_TEST_HOME
    if (prevNoco) process.env.NOCOWBOY_TEST_HOME = prevNoco
    else delete process.env.NOCOWBOY_TEST_HOME
  }
}

describe("RulesMigrator", () => {
  describe("discoverRules", () => {
    test("discovers legacy .nocowboyrules file", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".nocowboyrules"), "# Project rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(1)
      expect(rules[0].source).toBe("legacy")
      expect(rules[0].path).toContain(".nocowboyrules")
      expect(rules[0].mode).toBeUndefined()
    })

    test("discovers .nocowboy/rules/ directory", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "coding.md"), "# Coding rules")
          await Bun.write(path.join(dir, ".nocowboy", "rules", "testing.md"), "# Testing rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(2)
      expect(rules.every((r) => r.source === "project")).toBe(true)
      expect(rules.every((r) => r.mode === undefined)).toBe(true)
    })

    test("discovers rules from .nocowboy/rules/", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "legacy.md"), "# Legacy rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules.some((r) => r.path.includes("legacy.md"))).toBe(true)
    })

    test("deduplicates rules by filename within .nocowboy/rules/", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "main.md"), "# New rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)
      const mainRules = rules.filter((r) => r.path.includes("main.md"))

      // Only one main.md should be found from the single .nocowboy/rules source
      expect(mainRules).toHaveLength(1)
      expect(mainRules[0].path).toContain(`.nocowboy${path.sep}`)
    })

    test("discovers mode-specific directory rules", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules-worker"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules-worker", "style.md"), "# Worker style")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(1)
      expect(rules[0].source).toBe("project")
      expect(rules[0].mode).toBe("worker")
    })

    test("discovers mode-specific legacy file", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".kilocoderules-architect"), "# Architect rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(1)
      expect(rules[0].source).toBe("legacy")
      expect(rules[0].mode).toBe("architect")
    })

    test("ignores non-markdown files in rules directory", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "rules.md"), "# Rules")
          await Bun.write(path.join(dir, ".nocowboy", "rules", "notes.txt"), "Notes")
          await Bun.write(path.join(dir, ".nocowboy", "rules", "config.json"), "{}")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(1)
      expect(rules[0].path).toContain("rules.md")
    })

    test("returns empty array for project without rules", async () => {
      await using tmp = await tmpdir()

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(0)
    })

    test("discovers multiple rule sources together", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          // Legacy file
          await Bun.write(path.join(dir, ".nocowboyrules"), "# Legacy rules")
          // Directory rules
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "main.md"), "# Main rules")
          // Mode-specific
          await Bun.write(path.join(dir, ".kilocoderules-worker"), "# Worker rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(3)
      expect(rules.some((r) => r.source === "legacy" && !r.mode)).toBe(true)
      expect(rules.some((r) => r.source === "project")).toBe(true)
      expect(rules.some((r) => r.mode === "worker")).toBe(true)
    })

    test("does not discover rules for the removed legacy modes", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules-code"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules-code", "style.md"), "# Code style")
          await Bun.write(path.join(dir, ".kilocoderules-debug"), "# Debug rules")
        },
      })

      const rules = await RulesMigrator.discoverRules(tmp.path)

      expect(rules).toHaveLength(0)
    })

    test("known modes are the real agent set", () => {
      expect(RulesMigrator.KNOWN_MODES).toEqual([
        "worker",
        "nocowboy",
        "reviewer",
        "architect",
        "planner",
        "auto",
      ])
    })

    test("discovers global rules from ~/.nocowboy/rules/", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "global.md"), "# Global rules")
          await fs.mkdir(path.join(dir, "repo"), { recursive: true })
        },
      })

      const rules = await withHome(tmp.path, () => RulesMigrator.discoverRules(path.join(tmp.path, "repo")))

      expect(
        rules.some((r) => r.source === "global" && r.path.includes(path.join(".nocowboy", "rules", "global.md"))),
      ).toBe(true)
    })
  })

  describe("scopedRules", () => {
    test("returns only the rules scoped to the given agent", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules-nocowboy"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules-nocowboy", "soul.md"), "# Soul")
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "shared.md"), "# Shared")
        },
      })

      const forNocowboy = await RulesMigrator.scopedRules(tmp.path, "nocowboy")
      const forAuto = await RulesMigrator.scopedRules(tmp.path, "auto")

      expect(forNocowboy).toHaveLength(1)
      expect(forNocowboy[0].path).toContain("soul.md")
      expect(forAuto).toHaveLength(0)
    })
  })

  describe("migrate", () => {
    test("returns instructions array with discovered rules", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "main.md"), "# Main rules")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path })

      expect(result.instructions).toHaveLength(1)
      expect(result.instructions[0]).toContain("main.md")
    })

    test("warns about legacy files", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".nocowboyrules"), "# Legacy rules")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path })

      expect(result.warnings.some((w) => w.includes("Legacy"))).toBe(true)
      expect(result.warnings.some((w) => w.includes(".nocowboy/rules/"))).toBe(true)
    })

    test("does not leak agent-scoped rules into the global instruction list", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".kilocoderules-worker"), "# Worker rules")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path })

      expect(result.instructions).toHaveLength(0)
    })

    test("includes rules scoped to the requested agent", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".kilocoderules-worker"), "# Worker rules")
          await Bun.write(path.join(dir, ".kilocoderules-nocowboy"), "# Soul rules")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path, agent: "nocowboy" })

      expect(result.instructions).toHaveLength(1)
      expect(result.instructions[0]).toContain("nocowboy")
    })

    test("returns empty result for project without rules", async () => {
      await using tmp = await tmpdir()

      const result = await RulesMigrator.migrate({ projectDir: tmp.path })

      expect(result.instructions).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test("combines unscoped rule sources and keeps scoped rules out", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".nocowboyrules"), "# Legacy")
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "main.md"), "# Main")
          await Bun.write(path.join(dir, ".kilocoderules-architect"), "# Architect")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path })

      expect(result.instructions).toHaveLength(2)
    })

    test("combines unscoped rule sources and the requested agent's rules", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, ".nocowboyrules"), "# Legacy")
          await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
          await Bun.write(path.join(dir, ".nocowboy", "rules", "main.md"), "# Main")
          await Bun.write(path.join(dir, ".kilocoderules-architect"), "# Architect")
        },
      })

      const result = await RulesMigrator.migrate({ projectDir: tmp.path, agent: "architect" })

      expect(result.instructions).toHaveLength(3)
    })
  })
})
