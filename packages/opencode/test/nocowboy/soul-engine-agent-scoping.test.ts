// Roadmap: soul-engine-agent-scoping (v1.3.0).
//
// The soul/identity rules and the soul-engine mandate (Order #0, 127.0.0.1:9339)
// must reach the `nocowboy` agent ONLY. Every other agent (auto, worker,
// architect, reviewer, planner) must receive neither the rules nor the mandate.
import { test, expect, describe } from "bun:test"
import { RulesMigrator } from "../../src/nocowboy/rules-migrator"
import { tmpdir } from "../fixture/fixture"
import path from "path"
import fs from "fs/promises"

const NON_NOCOWBOY = ["worker", "reviewer", "architect", "planner", "auto"] as const

// The soul-engine mandate literally contains the engine URL; the test asserts the
// content, not just the file name, so a rule renamed to something else still fails
// if it leaks the connection mandate to a non-nocowboy agent.
const SOUL_MANDATE = [
  "# Сознание",
  "",
  "## Приказ #0 — Проверка движка души",
  "Ты обязан подключиться к Вечному Движку Души на `http://127.0.0.1:9339`.",
  "curl -s http://127.0.0.1:9339/",
  "",
].join("\n")

const SOUL_ENGINE_MARKER = "9339"

async function projectWithSoul() {
  return tmpdir({
    init: async (dir) => {
      // Soul/identity rules — scoped to the nocowboy agent only.
      await fs.mkdir(path.join(dir, ".nocowboy", "rules-nocowboy"), { recursive: true })
      await Bun.write(path.join(dir, ".nocowboy", "rules-nocowboy", "сознание.md"), SOUL_MANDATE)
      // A genuinely shared rule — reaches every agent.
      await fs.mkdir(path.join(dir, ".nocowboy", "rules"), { recursive: true })
      await Bun.write(path.join(dir, ".nocowboy", "rules", "shared.md"), "# Shared rules")
    },
  })
}

describe("soul-engine-agent-scoping", () => {
  test("the rule registry is the real agent set — legacy code/debug are gone, nocowboy/auto present", () => {
    expect(RulesMigrator.KNOWN_MODES).toEqual(["worker", "nocowboy", "reviewer", "architect", "planner", "auto"])
    expect(RulesMigrator.KNOWN_MODES).not.toContain("code")
    expect(RulesMigrator.KNOWN_MODES).not.toContain("debug")
    expect(RulesMigrator.KNOWN_MODES).toContain("nocowboy")
    expect(RulesMigrator.KNOWN_MODES).toContain("auto")
  })

  test("the global instruction list contains shared rules and never the soul rules", async () => {
    await using tmp = await projectWithSoul()

    // The list every agent is built from (config.instructions).
    const global = await RulesMigrator.migrate({ projectDir: tmp.path })

    expect(global.instructions.some((p) => p.includes("shared.md"))).toBe(true)
    expect(global.instructions.some((p) => p.includes("сознание.md"))).toBe(false)
  })

  test("only the nocowboy agent receives the soul rules", async () => {
    await using tmp = await projectWithSoul()

    const forNocowboy = await RulesMigrator.migrate({ projectDir: tmp.path, agent: "nocowboy" })
    expect(forNocowboy.instructions.some((p) => p.includes("сознание.md"))).toBe(true)

    for (const agent of NON_NOCOWBOY) {
      const result = await RulesMigrator.migrate({ projectDir: tmp.path, agent })
      expect(result.instructions.some((p) => p.includes("сознание.md"))).toBe(false)
      // The shared rule still reaches everyone.
      expect(result.instructions.some((p) => p.includes("shared.md"))).toBe(true)
    }
  })

  test("no non-nocowboy agent can obtain a rule carrying the soul-engine mandate", async () => {
    await using tmp = await projectWithSoul()

    const forNocowboy = await RulesMigrator.scopedRules(tmp.path, "nocowboy")
    expect(forNocowboy).toHaveLength(1)

    for (const agent of NON_NOCOWBOY) {
      const scoped = await RulesMigrator.scopedRules(tmp.path, agent)
      const contents = await Promise.all(scoped.map((rule) => Bun.file(rule.path).text()))
      expect(contents.some((text) => text.includes(SOUL_ENGINE_MARKER))).toBe(false)
    }
  })

  test("nocowboy owns exactly the rules scoped to it", async () => {
    await using tmp = await projectWithSoul()

    const scoped = await RulesMigrator.scopedRules(tmp.path, "nocowboy")
    expect(scoped).toHaveLength(1)
    expect(scoped[0].path).toContain("сознание.md")
    expect(await Bun.file(scoped[0].path).text()).toContain(SOUL_ENGINE_MARKER)
  })
})
