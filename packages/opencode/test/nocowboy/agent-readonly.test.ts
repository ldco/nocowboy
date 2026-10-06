import { afterEach, expect, test } from "bun:test"
import { Effect } from "effect"
import { Agent } from "../../src/agent/agent"
import { Permission } from "../../src/permission"
import { disposeAllInstances, provideInstance, provideTestInstance, tmpdir } from "../fixture/fixture"

function load<A>(dir: string, fn: (svc: Agent.Interface) => Effect.Effect<A>) {
  return Effect.runPromise(provideInstance(dir)(Agent.Service.use(fn)).pipe(Effect.provide(Agent.defaultLayer)))
}

afterEach(async () => {
  await disposeAllInstances()
})

const edit = (agent: Agent.Info, pattern = "*") => Permission.evaluate("edit", pattern, agent.permission).action

test("planner is read-only by default (edit + mutating bash denied)", async () => {
  await using tmp = await tmpdir({ git: true })
  await provideTestInstance({
    directory: tmp.path,
    fn: async () => {
      const planner = await load(tmp.path, (svc) => svc.get("planner"))
      expect(planner).toBeDefined()
      // All edit-family tools (edit/write/apply_patch/search_replace) ask under "edit".
      expect(edit(planner!)).toBe("deny")
      expect(edit(planner!, "src/index.ts")).toBe("deny")
      // Mutating bash denied; read-only bash still works.
      expect(Permission.evaluate("bash", "git commit -m x", planner!.permission).action).toBe("deny")
      expect(Permission.evaluate("bash", "rm -rf build", planner!.permission).action).toBe("deny")
      expect(Permission.evaluate("bash", "git status", planner!.permission).action).toBe("allow")
      expect(Permission.evaluate("read", "*", planner!.permission).action).toBe("allow")
    },
  })
})

test("reviewer is read-only by default (edit denied, verification still possible)", async () => {
  await using tmp = await tmpdir({ git: true })
  await provideTestInstance({
    directory: tmp.path,
    fn: async () => {
      const reviewer = await load(tmp.path, (svc) => svc.get("reviewer"))
      expect(reviewer).toBeDefined()
      expect(edit(reviewer!)).toBe("deny")
      expect(edit(reviewer!, "src/index.ts")).toBe("deny")
      expect(Permission.evaluate("bash", "git commit -m x", reviewer!.permission).action).toBe("deny")
      expect(Permission.evaluate("bash", "bun add left-pad", reviewer!.permission).action).toBe("deny")
      expect(Permission.evaluate("bash", "echo hi > out.txt", reviewer!.permission).action).toBe("deny")
      // The reviewer must still be able to run read-only verification commands.
      expect(Permission.evaluate("bash", "bun test test/x.test.ts", reviewer!.permission).action).not.toBe("deny")
      expect(Permission.evaluate("bash", "git status", reviewer!.permission).action).not.toBe("deny")
    },
  })
})

test("architect remains read-only (regression guard)", async () => {
  await using tmp = await tmpdir({ git: true })
  await provideTestInstance({
    directory: tmp.path,
    fn: async () => {
      const architect = await load(tmp.path, (svc) => svc.get("architect"))
      expect(edit(architect!)).toBe("deny")
      expect(Permission.evaluate("bash", "git commit -m x", architect!.permission).action).toBe("deny")
      // Design artifacts stay writable for the architect.
      expect(edit(architect!, "docs/design.md")).toBe("allow")
    },
  })
})

test("worker is not read-only (control)", async () => {
  await using tmp = await tmpdir({ git: true })
  await provideTestInstance({
    directory: tmp.path,
    fn: async () => {
      const worker = await load(tmp.path, (svc) => svc.get("worker"))
      expect(edit(worker!)).not.toBe("deny")
    },
  })
})

test("explicit agent config lifts the read-only ceiling", async () => {
  await using tmp = await tmpdir({
    git: true,
    config: { agent: { planner: { permission: { edit: { "*": "allow" } } } } },
  })
  await provideTestInstance({
    directory: tmp.path,
    fn: async () => {
      const planner = await load(tmp.path, (svc) => svc.get("planner"))
      expect(edit(planner!)).toBe("allow")
    },
  })
})
