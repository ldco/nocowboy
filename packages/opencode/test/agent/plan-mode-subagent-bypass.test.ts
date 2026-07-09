/**
 * Reproducer for opencode issue #26514:
 *
 * In Plan Mode (the `plan` agent), the main agent's edit/write tools are
 * blocked by the plan agent's permission ruleset (`edit: { "*": "deny" }`).
 * However, when the plan agent spawns a subagent via the `task` tool, the
 * subagent retains full file modification capabilities — a security bypass.
 *
 * This test replicates the permission ruleset that would govern a
 * `general` subagent when launched from a `plan` parent session, mirroring
 * the logic in `src/tool/task.ts` (filtered parent permissions ++ runtime
 * subagent agent permissions, evaluated as in `session/prompt.ts`).
 *
 * The expected (secure) behavior is that the subagent inherits the plan
 * mode read-only restriction and `edit`/`write` resolve to `deny`. On
 * origin/dev this assertion fails because the parent **agent** permissions
 * are not propagated to the subagent — only the parent **session**
 * permissions are passed through, and Plan Mode's restrictions live on the
 * agent, not the session.
 */
import { expect } from "bun:test"
import { Effect } from "effect"
import { Agent } from "../../src/agent/agent"
import { deriveSubagentSessionPermission } from "../../src/agent/subagent-permissions"
import { Permission } from "../../src/permission"
import { testEffect } from "../lib/effect"

const it = testEffect(Agent.defaultLayer)

function testAgent(input: {
  name: string
  mode: Agent.Info["mode"]
  permission: Parameters<typeof Permission.fromConfig>[0]
}) {
  return {
    name: input.name,
    mode: input.mode,
    permission: Permission.fromConfig(input.permission),
    options: {},
  } satisfies Agent.Info
}

// `deriveSubagentSessionPermission` is imported from production. The test
// exercises the actual helper that task.ts uses to build the subagent's
// session permission, so any regression in that helper trips this test.

it.effect("[#26514] subagent spawned from read-only parent inherits its edit restriction (edit denied)", () =>
  Effect.sync(() => {
    const parent = testAgent({
      name: "readonly-parent",
      mode: "primary",
      permission: { "*": "deny", edit: "deny" },
    })
    const sub = testAgent({
      name: "sub",
      mode: "subagent",
      permission: { "*": "allow" },
    })

    expect(Permission.evaluate("edit", "/some/file.ts", parent.permission).action).toBe("deny")

    const parentSessionPermission: Permission.Ruleset = []
    const subagentSessionPermission = deriveSubagentSessionPermission({
      parentSessionPermission,
      parentAgent: parent,
      subagent: sub,
    })
    const effective = Permission.merge(sub.permission, subagentSessionPermission)

    expect(Permission.evaluate("edit", "/some/file.ts", effective).action).toBe("deny")
    expect(Permission.evaluate("edit", "/another/path/index.tsx", effective).action).toBe("deny")
  }),
)

it.effect("[#26514] subagent with intrinsic read-only launched from read-only parent stays read-only", () =>
  Effect.sync(() => {
    const parent = testAgent({
      name: "readonly-parent",
      mode: "primary",
      permission: { "*": "deny", edit: "deny" },
    })
    const readOnlySub = testAgent({
      name: "readonly-sub",
      mode: "subagent",
      permission: { "*": "deny" },
    })

    const parentSessionPermission: Permission.Ruleset = []
    const subagentSessionPermission = deriveSubagentSessionPermission({
      parentSessionPermission,
      parentAgent: parent,
      subagent: readOnlySub,
    })
    const effective = Permission.merge(readOnlySub.permission, subagentSessionPermission)

    expect(Permission.evaluate("edit", "/x.ts", effective).action).toBe("deny")
  }),
)

it.effect(
  "[#26514] custom subagent with allow-default inherits read-only parent edit restriction",
  // The most damaging case: a subagent with default permissions
  // (allow-by-default). The subagent must NOT be able to edit
  // when the parent agent denies edit.
  () =>
    Effect.sync(() => {
      const parent = testAgent({
        name: "readonly-parent",
        mode: "primary",
        permission: { "*": "deny", edit: "deny" },
      })
      const my = testAgent({
        name: "my_subagent",
        mode: "subagent",
        permission: { "*": "allow" },
      })

      const parentSessionPermission: Permission.Ruleset = []
      const subagentSessionPermission = deriveSubagentSessionPermission({
        parentSessionPermission,
        parentAgent: parent,
        subagent: my,
      })
      const effective = Permission.merge(my.permission, subagentSessionPermission)

      expect(Permission.evaluate("edit", "/some/file.ts", effective).action).toBe("deny")
    }),
)

it.effect("[#26700] controller self-restrictions do not erase executor permissions", () =>
  Effect.sync(() => {
    const controller = testAgent({
      name: "controller",
      mode: "primary",
      permission: {
        "*": "deny",
        read: "deny",
        bash: "deny",
        task: {
          "*": "deny",
          executor: "allow",
        },
        edit: "deny",
        write: "deny",
      },
    })
    const executor = testAgent({
      name: "executor",
      mode: "subagent",
      permission: {
        "*": "deny",
        read: "allow",
        bash: "allow",
        task: {
          "*": "deny",
          worker: "allow",
        },
        edit: "deny",
        write: "deny",
      },
    })

    const effective = Permission.merge(
      executor.permission,
      deriveSubagentSessionPermission({
        parentSessionPermission: [],
        parentAgent: controller,
        subagent: executor,
      }),
    )

    expect(Permission.evaluate("read", "README.md", effective).action).toBe("allow")
    expect(Permission.evaluate("bash", "git status", effective).action).toBe("allow")
    expect(Permission.evaluate("task", "worker", effective).action).toBe("allow")
    expect(Permission.evaluate("task", "other", effective).action).toBe("deny")
    expect(Permission.disabled(["edit", "write", "apply_patch"], effective)).toEqual(
      new Set(["edit", "write", "apply_patch"]),
    )
  }),
)

it.effect("subagent inherits parent session deny rules as hard runtime ceilings", () =>
  Effect.sync(() => {
    const executor = testAgent({
      name: "executor",
      mode: "subagent",
      permission: {
        bash: "allow",
      },
    })
    const effective = Permission.merge(
      executor.permission,
      deriveSubagentSessionPermission({
        parentSessionPermission: Permission.fromConfig({ bash: "deny" }),
        parentAgent: undefined,
        subagent: executor,
      }),
    )

    expect(Permission.evaluate("bash", "git status", effective).action).toBe("deny")
  }),
)
