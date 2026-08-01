import { describe, expect, it } from "bun:test"
import { AutoPermissionClassifier } from "@/nocowboy/permission/auto-classifier"

describe("AutoPermissionClassifier", () => {
  describe("classifyBash", () => {
    it("classifies read-only commands as safe", () => {
      expect(AutoPermissionClassifier.classifyBash("ls -la")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("cat file.ts")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("grep -r foo src/")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git status")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git diff HEAD")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("bun test")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("bun run typecheck")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("tsgo --noEmit")).toEqual({ level: "safe", reason: expect.any(String) })
    })

    it("classifies mutating but reversible commands as caution", () => {
      expect(AutoPermissionClassifier.classifyBash("touch file.ts")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git add src/")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git commit -m 'fix'")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("bun install")).toEqual({ level: "caution", reason: expect.any(String) })
    })

    it("classifies destructive commands as block", () => {
      expect(AutoPermissionClassifier.classifyBash("sudo rm -rf /")).toEqual({ level: "block", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("rm -rf src/")).toEqual({ level: "block", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git push --force origin main")).toEqual({ level: "block", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("git reset --hard HEAD~1")).toEqual({ level: "block", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyBash("shutdown now")).toEqual({ level: "block", reason: expect.any(String) })
    })

    it("classifies unknown commands as block", () => {
      expect(AutoPermissionClassifier.classifyBash("some-unknown-tool --flag")).toEqual({ level: "block", reason: expect.any(String) })
    })
  })

  describe("classifyTool", () => {
    it("classifies read-only tools as safe", () => {
      expect(AutoPermissionClassifier.classifyTool("read")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("grep")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("glob")).toEqual({ level: "safe", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("semantic_search")).toEqual({ level: "safe", reason: expect.any(String) })
    })

    it("classifies mutating tools as caution", () => {
      expect(AutoPermissionClassifier.classifyTool("write")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("edit")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("task")).toEqual({ level: "caution", reason: expect.any(String) })
      expect(AutoPermissionClassifier.classifyTool("goal_set")).toEqual({ level: "caution", reason: expect.any(String) })
    })

    it("classifies unknown tools as block", () => {
      expect(AutoPermissionClassifier.classifyTool("unknown_tool")).toEqual({ level: "block", reason: expect.any(String) })
    })
  })

  describe("autoRuleset", () => {
    it("builds a ruleset that allows read/write/bash-safe and asks for the rest", () => {
      const rules = AutoPermissionClassifier.autoRuleset()
      expect(rules.length).toBeGreaterThan(10)

      const allowRule = (permission: string) =>
        rules.find((r) => r.permission === permission && r.action === "allow")
      expect(allowRule("read")).toBeDefined()
      expect(allowRule("write")).toBeDefined()
      expect(allowRule("edit")).toBeDefined()
      expect(allowRule("goal_set")).toBeDefined()
      expect(allowRule("goal_clear")).toBeDefined()

      // default is ask for everything not explicitly allowed
      const defaultRule = rules.find((r) => r.permission === "*" && r.pattern === "*")
      expect(defaultRule?.action).toBe("ask")
    })
  })
})
