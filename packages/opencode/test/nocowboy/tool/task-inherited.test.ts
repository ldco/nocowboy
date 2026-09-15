import { describe, expect, test } from "bun:test"
import { KiloTask } from "../../../src/nocowboy/tool/task"

// Upstream 3a99f36 (T0.10): a read-only/delegating caller carries a readOnlyBash allowlist whose
// deny rules only shape that allowlist. Projecting them onto a writable subagent capped commands
// the subagent's own config allowed (e.g. `git status`) with phantom denies the user never wrote.
describe("KiloTask.inherited", () => {
  test("does not inherit broad bash denies from a read-only caller", () => {
    const caller = {
      permission: [
        { permission: "bash", pattern: "*", action: "deny" },
        { permission: "bash", pattern: "git *", action: "deny" },
        { permission: "edit", pattern: "*", action: "deny" },
      ],
    } as any

    const rules = KiloTask.inherited({ caller, session: { permission: [] } as any, mcp: undefined })

    expect(rules.some((r) => r.permission === "bash")).toBe(false)
    // edit denials remain hard ceilings
    expect(rules).toContainEqual({ permission: "edit", pattern: "*", action: "deny" })
  })

  test("inherits only deny rules, never allow/ask", () => {
    const caller = {
      permission: [
        { permission: "edit", pattern: "*", action: "allow" },
        { permission: "notebook_edit", pattern: "*", action: "ask" },
      ],
    } as any

    const rules = KiloTask.inherited({ caller, session: { permission: [] } as any, mcp: undefined })

    expect(rules.length).toBe(0)
  })

  test("inherits notebook denies and MCP denies", () => {
    const caller = {
      permission: [
        { permission: "notebook_execute", pattern: "*", action: "deny" },
        { permission: "myserver_run", pattern: "*", action: "deny" },
        { permission: "myserver_run", pattern: "*", action: "allow" },
      ],
    } as any

    const rules = KiloTask.inherited({ caller, session: { permission: [] } as any, mcp: { myserver: {} } as any })

    expect(rules).toContainEqual({ permission: "notebook_execute", pattern: "*", action: "deny" })
    expect(rules).toContainEqual({ permission: "myserver_run", pattern: "*", action: "deny" })
    expect(rules.some((r) => r.action === "allow")).toBe(false)
  })
})
