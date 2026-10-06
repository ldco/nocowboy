import { describe, expect, test } from "bun:test"
import type { Config } from "@/config/config"
import { Permission } from "@/permission"
import { patchAgents } from "@/nocowboy/agent"
import { I18n } from "@/nocowboy/ui/i18n"

function buildAgents(lang: string): Record<string, { prompt: string; permission: Permission.Ruleset }> {
  const agents: Record<string, { name: string; mode: string; options: object; permission: Permission.Ruleset }> = {
    build: { name: "build", mode: "primary", options: {}, permission: Permission.fromConfig({}) },
  }
  patchAgents(
    agents as never,
    Permission.fromConfig({ "*": "allow" }),
    [],
    { lang } as unknown as Config.Info,
    { mcpRules: {}, defaultsPatch: Permission.fromConfig({}) },
    process.cwd(),
    [],
  )
  return agents as never
}

describe("contract: planner/reviewer mutation policy", () => {
  test("planner and reviewer deny edit tools and mutating bash", () => {
    const agents = buildAgents("en")
    for (const name of ["planner", "reviewer"]) {
      const rules = agents[name]!.permission
      for (const tool of ["edit", "write", "apply_patch", "search_replace"]) {
        expect(Permission.disabled([tool], rules).has(tool)).toBe(true)
      }
      expect(Permission.evaluate("bash", "rm -rf /tmp/x", rules).action).toBe("deny")
      expect(Permission.evaluate("bash", "git commit -m x", rules).action).toBe("deny")
      expect(Permission.evaluate("bash", "bun test test/foo.test.ts", rules).action).toBe("allow")
    }
  })

  test("an explicit agent-level allow lifts the read-only ceiling", () => {
    const agents = buildAgents("en")
    const lifted = Permission.merge(agents.reviewer!.permission, Permission.fromConfig({ edit: { "*": "allow" } }))
    expect(Permission.evaluate("edit", "src/foo.ts", lifted).action).toBe("allow")
  })

  test("RU/EN locale selection changes the agent prompt and the UI strings", () => {
    const en = buildAgents("en")
    const ru = buildAgents("ru")
    expect(ru.reviewer!.prompt).not.toBe(en.reviewer!.prompt)
    expect(/[А-Яа-я]/.test(ru.reviewer!.prompt)).toBe(true)
    expect(/[А-Яа-я]/.test(en.reviewer!.prompt)).toBe(false)
    // The same `lang` input drives the UI dictionary (the live session sets it from config.lang).
    expect(I18n.getStrings("ru")["sidebar.settings"]).not.toBe(I18n.getStrings("en")["sidebar.settings"])
  })
})
