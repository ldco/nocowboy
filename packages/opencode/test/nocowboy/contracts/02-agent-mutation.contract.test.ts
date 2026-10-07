/**
 * Migration contract — planner/reviewer mutation policy.
 *
 * In the default (non-YOLO) profile planner and reviewer are read-only: edit
 * (edit/write/apply_patch/search_replace) and mutating bash are denied by an
 * explicit ceiling that wins over defaults, while a delegated subagent keeps its
 * own bash policy (delegation). YOLO is the explicit lift. (The full YOLO-lift
 * end-to-end lives in test/nocowboy/server/permission-allow-everything.test.ts.)
 */
import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { deriveSubagentSessionPermission } from "@/agent/subagent-permissions"
import { NoCowboySessionPrompt } from "@/nocowboy/session/prompt"
import { isAllowEverythingConfig } from "@/nocowboy/permission/allow-everything-config"
import { disposeAllInstances, provideInstance, provideTestInstance, tmpdir } from "../../fixture/fixture"

function load<A>(dir: string, fn: (svc: Agent.Interface) => Effect.Effect<A>) {
  return Effect.runPromise(provideInstance(dir)(Agent.Service.use(fn)).pipe(Effect.provide(Agent.defaultLayer)))
}

afterEach(async () => {
  await disposeAllInstances()
})

describe("planner/reviewer mutation policy", () => {
  test("planner and reviewer deny edit and mutating bash by default", async () => {
    await using tmp = await tmpdir({ git: true })
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        for (const name of ["planner", "reviewer"]) {
          const agent = await load(tmp.path, (svc) => svc.get(name))
          expect(agent).toBeDefined()
          expect(Permission.evaluate("edit", "*", agent!.permission).action).toBe("deny")
          expect(Permission.evaluate("bash", "git commit -m x", agent!.permission).action).toBe("deny")
          expect(Permission.evaluate("read", "*", agent!.permission).action).toBe("allow")
        }
      },
    })
  }, 20_000)

  test("the read-only ceiling is a hard ruleset (YOLO is the only lift)", async () => {
    await using tmp = await tmpdir({ git: true })
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const planner = await load(tmp.path, (svc) => svc.get("planner"))
        const hard = NoCowboySessionPrompt.hardPermissions({ agent: planner! })
        expect(hard).toBeDefined()
        expect(Permission.evaluate("edit", "*", hard!).action).toBe("deny")
        // YOLO is the recognised global grant that lifts such ceilings.
        expect(isAllowEverythingConfig({ "*": { "*": "allow" } })).toBe(true)
        expect(isAllowEverythingConfig({ edit: "allow" })).toBe(false)
      },
    })
  }, 20_000)

  test("delegation forwards the parent's edit denies to the subagent", async () => {
    await using tmp = await tmpdir({ git: true })
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const planner = await load(tmp.path, (svc) => svc.get("planner"))
        const worker = await load(tmp.path, (svc) => svc.get("worker"))
        const rules = deriveSubagentSessionPermission({
          parentSessionPermission: [],
          parentAgent: planner,
          subagent: worker!,
        })
        expect(rules.some((r) => r.permission === "edit" && r.action === "deny")).toBe(true)
        // worker's own bash policy governs bash (broad bash denies are not inherited).
        expect(rules.some((r) => r.permission === "bash" && r.action === "deny")).toBe(false)
      },
    })
  }, 20_000)
})
