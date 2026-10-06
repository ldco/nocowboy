import { describe, expect, test } from "bun:test"
import { Permission } from "@/permission"
import { patchAgents } from "@/nocowboy/agent"

/**
 * Build the real built-in agent map the way agent.ts does (no MCP, no user
 * config), so the tests exercise the actual patchAgents merge order — not a
 * hand-copied ruleset.
 */
function buildAgents(user: Permission.Ruleset = []): Record<string, { name: string; permission: Permission.Ruleset }> {
  const agents: Record<string, any> = {
    build: { name: "build", mode: "primary", options: {}, permission: Permission.fromConfig({}) },
  }
  patchAgents(
    agents,
    Permission.fromConfig({ "*": "allow" }),
    user,
    {} as any,
    { mcpRules: {}, defaultsPatch: Permission.fromConfig({}) },
    process.cwd(),
    [],
  )
  return agents
}

const agents = buildAgents()
const EDIT_TOOLS = ["edit", "write", "apply_patch", "search_replace"]
const MUTATING_BASH = [
  "rm -rf /tmp/x",
  "git commit -m 'x'",
  "git push origin main",
  "touch new.ts",
  "mv a.ts b.ts",
  "cp a.ts b.ts",
  "echo hi > file.txt",
  "echo hi | tee file.txt",
  // Write/exec bypasses hidden inside otherwise-allowed read commands.
  "git log --output=/tmp/x -1",
  "git diff --output=/tmp/x",
  "bun test --reporter=junit --reporter-outfile=/tmp/x.xml",
  "rg foo --pre /bin/sh",
  "bun test -u",
  "bun test --coverage",
  // Trailing-wildcard write-mode bypass: --checkX is not --check, so generate-docs
  // / ownership-manifest / engine-manifest take their WRITE branch.
  "bun run scripts/generate-docs.ts --checkX",
  "bun run scripts/ownership-manifest.ts --checkX",
  "bun run scripts/engine-manifest.ts --checkX",
  // `git remote -v` is an EXACT allow (no wildcard); any argument form falls to
  // `git *: deny`. These all mutate .git/config and must stay denied even though
  // shell collapses whitespace and git accepts repeated/verbose flags.
  "git remote -v add evil https://example.invalid/x",
  "git remote -v set-url origin https://example.invalid/x",
  "git remote -v  add evil3 https://example.invalid/x",
  "git remote -v -v add evil4 https://example.invalid/x",
  "git remote -v --verbose add evil5 https://example.invalid/x",
]

describe.each(["planner", "reviewer"])("read-only %s contract", (name) => {
  const rules = () => agents[name].permission

  test("denies every mutating edit tool", () => {
    for (const tool of EDIT_TOOLS) {
      expect(Permission.disabled([tool], rules()).has(tool)).toBe(true)
    }
    for (const path of ["src/foo.ts", "AGENTS.md", "docs/x.md", ".nocowboy/specs/x.md", ".nocowboy/specs/x.json"]) {
      expect(Permission.evaluate("edit", path, rules()).action).toBe("deny")
    }
  })

  test("denies mutating bash", () => {
    for (const cmd of MUTATING_BASH) {
      expect(Permission.evaluate("bash", cmd, rules()).action).toBe("deny")
    }
  })

  test("keeps read-only and verification bash allowed", () => {
    expect(Permission.evaluate("bash", "git log --oneline -5", rules()).action).toBe("allow")
    expect(Permission.evaluate("bash", "git remote -v", rules()).action).toBe("allow")
    expect(Permission.evaluate("bash", "rg foo src", rules()).action).toBe("allow")
    expect(Permission.evaluate("bash", "bun test test/foo.test.ts", rules()).action).toBe("allow")
    expect(Permission.evaluate("bash", "bun run typecheck", rules()).action).toBe("allow")
    expect(Permission.evaluate("bash", "bun run scripts/generate-docs.ts --check", rules()).action).toBe("allow")
  })

  // AC3: an explicit agent-level config rule is merged after the built-in
  // ceiling in agent.ts, so it is the deliberate way to lift the restriction.
  test("explicit agent-config allow lifts the ceiling", () => {
    const lifted = Permission.merge(rules(), Permission.fromConfig({ edit: { "*": "allow" } }))
    expect(Permission.evaluate("edit", "src/foo.ts", lifted).action).toBe("allow")
  })

  // The headline claim: the ceiling must hold over a *global* permission allow.
  test("a global permission allow cannot lift the ceiling (merge order)", () => {
    const guarded = buildAgents(Permission.fromConfig({ edit: "allow", bash: "allow" }))
    const globalRules = guarded[name].permission
    for (const tool of EDIT_TOOLS) {
      expect(Permission.disabled([tool], globalRules).has(tool)).toBe(true)
    }
    for (const path of ["src/foo.ts", "AGENTS.md"]) {
      expect(Permission.evaluate("edit", path, globalRules).action).toBe("deny")
    }
    expect(Permission.evaluate("bash", "rm -rf /tmp/x", globalRules).action).toBe("deny")
    expect(Permission.evaluate("bash", "git commit -m 'x'", globalRules).action).toBe("deny")
  })
})
