import { afterEach, expect } from "bun:test"
import { Cause, Effect, Exit, Layer } from "effect"
import path from "path"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Agent } from "../../src/agent/agent"
import * as NocowboyAgent from "../../src/nocowboy/agent"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config/config"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { Global } from "@nocowboy/core/global"
import { Permission } from "../../src/permission"
import { Plugin } from "../../src/plugin"
import { Provider } from "../../src/provider/provider"
import { Skill } from "../../src/skill"
import { Truncate } from "../../src/tool/truncate"

const agentLayer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Agent.layer.pipe(
    Layer.provide(Plugin.defaultLayer),
    Layer.provide(Provider.defaultLayer),
    Layer.provide(Auth.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(Skill.defaultLayer),
    Layer.provide(RuntimeFlags.layer(flags)),
  )

const it = testEffect(agentLayer())
const scout = testEffect(agentLayer({ experimentalScout: true }))

// Helper to evaluate permission for a tool with wildcard pattern
function evalPerm(agent: Agent.Info | undefined, permission: string): Permission.Action | undefined {
  if (!agent) return undefined
  return Permission.evaluate(permission, "*", agent.permission).action
}

function load<A>(fn: (svc: Agent.Interface) => Effect.Effect<A>) {
  return Agent.Service.use(fn)
}

const expectDefaultAgentError = Effect.fn("AgentTest.expectDefaultAgentError")(function* (message: string) {
  const exit = yield* load((svc) => svc.defaultAgent()).pipe(Effect.exit)
  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) expect(Cause.pretty(exit.cause)).toContain(message)
})

afterEach(async () => {
  await disposeAllInstances()
})

it.instance("returns default native agents when no config", () =>
  Effect.gen(function* () {
    const agents = yield* load((svc) => svc.list())
    const names = agents.map((a) => a.name)
    expect(names).toContain("auto")
    expect(names).toContain("planner")
    expect(names).toContain("worker")
    expect(names).toContain("reviewer")
    expect(names).toContain("nocowboy")
    expect(names).not.toContain("code")
    expect(names).not.toContain("architect")
    expect(names).not.toContain("overseer")
    expect(names).not.toContain("debug")
    expect(names).not.toContain("goal")
    expect(names).not.toContain("jurist")
    expect(names).toContain("compaction")
    expect(names).toContain("title")
    expect(names).toContain("summary")
  }),
)

it.instance("worker agent has correct default properties", () =>
  Effect.gen(function* () {
    const worker = yield* load((svc) => svc.get("worker"))
    expect(worker).toBeDefined()
    expect(worker?.mode).toBe("primary")
    expect(worker?.native).toBe(true)
    expect(evalPerm(worker, "edit")).toBe("allow")
    expect(evalPerm(worker, "bash")).toBe("ask")
    expect(evalPerm(worker, "repo_clone")).toBe("deny")
    expect(evalPerm(worker, "repo_overview")).toBe("deny")
  }),
)

it.instance("legacy persona names resolve to the simplified set", () =>
  Effect.gen(function* () {
    expect(NocowboyAgent.resolveKey("worker")).toBe("worker")
    expect(NocowboyAgent.resolveKey("general")).toBe("worker")
    expect(NocowboyAgent.resolveKey("code")).toBe("worker")
    expect(NocowboyAgent.resolveKey("debug")).toBe("worker")
    expect(NocowboyAgent.resolveKey("architect")).toBe("planner")
    expect(NocowboyAgent.resolveKey("overseer")).toBe("reviewer")
    expect(NocowboyAgent.resolveKey("worker")).toBe("worker")
    expect(NocowboyAgent.resolveKey("planner")).toBe("planner")
    expect(NocowboyAgent.resolveKey("reviewer")).toBe("reviewer")
  }),
)

it.instance("reviewer agent exists with correct permissions", () =>
  Effect.gen(function* () {
    const reviewer = yield* load((svc) => svc.get("reviewer"))
    expect(reviewer).toBeDefined()
    expect(reviewer?.mode).toBe("primary")
    expect(evalPerm(reviewer, "question")).toBe("allow")
    expect(evalPerm(reviewer, "suggest")).toBe("allow")
  }),
)

it.instance("compaction agent denies all permissions", () =>
  Effect.gen(function* () {
    const compaction = yield* load((svc) => svc.get("compaction"))
    expect(compaction).toBeDefined()
    expect(compaction?.hidden).toBe(true)
    expect(evalPerm(compaction, "bash")).toBe("deny")
    expect(evalPerm(compaction, "edit")).toBe("deny")
    expect(evalPerm(compaction, "read")).toBe("deny")
  }),
)

it.instance(
  "custom agent from config creates new agent",
  () =>
    Effect.gen(function* () {
      const custom = yield* load((svc) => svc.get("my_custom_agent"))
      expect(custom).toBeDefined()
      expect(String(custom?.model?.providerID)).toBe("openai")
      expect(String(custom?.model?.modelID)).toBe("gpt-4")
      expect(custom?.description).toBe("My custom agent")
      expect(custom?.temperature).toBe(0.5)
      expect(custom?.topP).toBe(0.9)
      expect(custom?.native).toBe(false)
      expect(custom?.mode).toBe("all")
    }),
  {
    config: {
      agent: {
        my_custom_agent: {
          model: "openai/gpt-4",
          description: "My custom agent",
          temperature: 0.5,
          top_p: 0.9,
        },
      },
    },
  },
)

it.instance(
  "custom agent config overrides native agent properties",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker).toBeDefined()
      expect(String(worker?.model?.providerID)).toBe("anthropic")
      expect(String(worker?.model?.modelID)).toBe("claude-3")
      expect(worker?.description).toBe("Custom worker agent")
      expect(worker?.temperature).toBe(0.7)
      expect(worker?.color).toBe("#FF0000")
      expect(worker?.native).toBe(true)
    }),
  {
    config: {
      agent: {
        worker: {
          model: "anthropic/claude-3",
          description: "Custom worker agent",
          temperature: 0.7,
          color: "#FF0000",
        },
      },
    },
  },
)

it.instance(
  "agent disable removes agent from list",
  () =>
    Effect.gen(function* () {
      const disabled = yield* load((svc) => svc.get("reviewer"))
      expect(disabled).toBeUndefined()
      const agents = yield* load((svc) => svc.list())
      const names = agents.map((a) => a.name)
      expect(names).not.toContain("reviewer")
    }),
  {
    config: {
      agent: {
        reviewer: { disable: true },
      },
    },
  },
)

it.instance(
  "agent permission config merges with defaults",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker).toBeDefined()
      // Specific pattern is denied
      expect(Permission.evaluate("bash", "rm -rf *", worker!.permission).action).toBe("deny")
      // Edit still allowed
      expect(evalPerm(worker, "edit")).toBe("allow")
    }),
  {
    config: {
      agent: {
        worker: {
          permission: {
            bash: {
              "rm -rf *": "deny",
            },
          },
        },
      },
    },
  },
)

it.instance(
  "global permission config applies to all agents",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker).toBeDefined()
      expect(evalPerm(worker, "bash")).toBe("deny")
    }),
  {
    config: {
      permission: {
        bash: "deny",
      },
    },
  },
)

it.instance(
  "agent steps/maxSteps config sets steps property",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      const reviewer = yield* load((svc) => svc.get("reviewer"))
      expect(worker?.steps).toBe(50)
      expect(reviewer?.steps).toBe(100)
    }),
  {
    config: {
      agent: {
        worker: { steps: 50 },
        reviewer: { maxSteps: 100 },
      },
    },
  },
)

it.instance(
  "agent mode can be overridden",
  () =>
    Effect.gen(function* () {
      const planner = yield* load((svc) => svc.get("planner"))
      expect(planner?.mode).toBe("primary")
    }),
  {
    config: {
      agent: {
        planner: { mode: "primary" },
      },
    },
  },
)

it.instance(
  "agent name can be overridden",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker?.name).toBe("Builder")
    }),
  {
    config: {
      agent: {
        worker: { name: "Builder" },
      },
    },
  },
)

it.instance(
  "agent prompt can be set from config",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker?.prompt).toBe("Custom system prompt")
    }),
  {
    config: {
      agent: {
        worker: { prompt: "Custom system prompt" },
      },
    },
  },
)

it.instance(
  "unknown agent properties are placed into options",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker?.options.random_property).toBe("hello")
      expect(worker?.options.another_random).toBe(123)
    }),
  {
    config: {
      agent: {
        worker: {
          random_property: "hello",
          another_random: 123,
        },
      },
    },
  },
)

it.instance(
  "agent options merge correctly",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(worker?.options.custom_option).toBe(true)
      expect(worker?.options.another_option).toBe("value")
    }),
  {
    config: {
      agent: {
        worker: {
          options: {
            custom_option: true,
            another_option: "value",
          },
        },
      },
    },
  },
)

it.instance(
  "multiple custom agents can be defined",
  () =>
    Effect.gen(function* () {
      const agentA = yield* load((svc) => svc.get("agent_a"))
      const agentB = yield* load((svc) => svc.get("agent_b"))
      expect(agentA?.description).toBe("Agent A")
      expect(agentA?.mode).toBe("subagent")
      expect(agentB?.description).toBe("Agent B")
      expect(agentB?.mode).toBe("primary")
    }),
  {
    config: {
      agent: {
        agent_a: {
          description: "Agent A",
          mode: "subagent",
        },
        agent_b: {
          description: "Agent B",
          mode: "primary",
        },
      },
    },
  },
)

it.instance(
  "Agent.list keeps the default agent first and sorts the rest by name",
  () =>
    Effect.gen(function* () {
      const names = (yield* load((svc) => svc.list())).map((a) => a.name)
      expect(names[0]).toBe("nocowboy")
      expect(names.slice(1)).toEqual(names.slice(1).toSorted((a, b) => a.localeCompare(b)))
    }),
  {
    config: {
      default_agent: "nocowboy",
      agent: {
        zebra: {
          description: "Zebra",
          mode: "subagent",
        },
        alpha: {
          description: "Alpha",
          mode: "subagent",
        },
      },
    },
  },
)

it.instance("Agent.get returns undefined for non-existent agent", () =>
  Effect.gen(function* () {
    const nonExistent = yield* load((svc) => svc.get("does_not_exist"))
    expect(nonExistent).toBeUndefined()
  }),
)

it.instance("default permission includes doom_loop and external_directory as ask", () =>
  Effect.gen(function* () {
    const worker = yield* load((svc) => svc.get("worker"))
    expect(evalPerm(worker, "doom_loop")).toBe("ask")
    expect(evalPerm(worker, "external_directory")).toBe("ask")
  }),
)

it.instance("webfetch is allowed by default", () =>
  Effect.gen(function* () {
    const worker = yield* load((svc) => svc.get("worker"))
    expect(evalPerm(worker, "webfetch")).toBe("allow")
  }),
)

it.instance(
  "legacy tools config converts to permissions",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(evalPerm(worker, "bash")).toBe("deny")
      expect(evalPerm(worker, "read")).toBe("deny")
    }),
  {
    config: {
      agent: {
        worker: {
          tools: {
            bash: false,
            read: false,
          },
        },
      },
    },
  },
)

it.instance(
  "legacy tools config maps write/edit/patch to edit permission",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(evalPerm(worker, "edit")).toBe("deny")
    }),
  {
    config: {
      agent: {
        worker: {
          tools: {
            write: false,
          },
        },
      },
    },
  },
)

it.instance(
  "Truncate.GLOB is allowed even when user denies external_directory globally",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(Permission.evaluate("external_directory", Truncate.GLOB, worker!.permission).action).toBe("allow")
      expect(Permission.evaluate("external_directory", Truncate.DIR, worker!.permission).action).toBe("deny")
      expect(Permission.evaluate("external_directory", "/some/other/path", worker!.permission).action).toBe("deny")
    }),
  {
    config: {
      permission: {
        external_directory: "deny",
      },
    },
  },
)

it.instance("global tmp directory children are allowed for external_directory", () =>
  Effect.gen(function* () {
    const worker = yield* load((svc) => svc.get("worker"))
    expect(
      Permission.evaluate("external_directory", path.join(Global.Path.tmp, "scratch"), worker!.permission).action,
    ).toBe("allow")
    expect(Permission.evaluate("external_directory", "/some/other/path", worker!.permission).action).toBe("ask")
  }),
)

it.instance(
  "Truncate.GLOB is allowed even when user denies external_directory per-agent",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(Permission.evaluate("external_directory", Truncate.GLOB, worker!.permission).action).toBe("allow")
      expect(Permission.evaluate("external_directory", Truncate.DIR, worker!.permission).action).toBe("deny")
      expect(Permission.evaluate("external_directory", "/some/other/path", worker!.permission).action).toBe("deny")
    }),
  {
    config: {
      agent: {
        worker: {
          permission: {
            external_directory: "deny",
          },
        },
      },
    },
  },
)

it.instance(
  "explicit Truncate.GLOB deny is respected",
  () =>
    Effect.gen(function* () {
      const worker = yield* load((svc) => svc.get("worker"))
      expect(Permission.evaluate("external_directory", Truncate.GLOB, worker!.permission).action).toBe("deny")
      expect(Permission.evaluate("external_directory", Truncate.DIR, worker!.permission).action).toBe("deny")
    }),
  {
    config: {
      permission: {
        external_directory: {
          "*": "deny",
          [Truncate.GLOB]: "deny",
        },
      },
    },
  },
)

it.instance(
  "skill directories are allowed for external_directory",
  () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const skillDir = path.join(test.directory, ".nocowboy", "skill", "perm-skill")
      yield* Effect.promise(() =>
        Bun.write(
          path.join(skillDir, "SKILL.md"),
          `---
name: perm-skill
description: Permission skill.
---

# Permission Skill
`,
        ),
      )

      const home = process.env.OPENCODE_TEST_HOME
      process.env.OPENCODE_TEST_HOME = test.directory
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          process.env.OPENCODE_TEST_HOME = home
        }),
      )

      const worker = yield* load((svc) => svc.get("worker"))
      const target = path.join(skillDir, "reference", "notes.md")
      expect(Permission.evaluate("external_directory", target, worker!.permission).action).toBe("allow")
    }),
  { git: true },
)

it.instance("defaultAgent returns auto when no default_agent config", () =>
  Effect.gen(function* () {
    const agent = yield* load((svc) => svc.defaultAgent())
    // auto is the dispatcher and NoCowboy's default entry point
    expect(agent).toBe("auto")
  }),
)

it.instance("defaultInfo returns resolved auto agent when no default_agent config", () =>
  Effect.gen(function* () {
    const agent = yield* load((svc) => svc.defaultInfo())
    expect(agent.name).toBe("auto")
    expect(agent.mode).toBe("primary")
  }),
)

it.instance(
  "defaultAgent respects default_agent config",
  () =>
    Effect.gen(function* () {
      const agent = yield* load((svc) => svc.defaultAgent())
      expect(agent).toBe("nocowboy")
    }),
  {
    config: {
      default_agent: "nocowboy",
    },
  },
)

it.instance(
  "defaultAgent respects default_agent config set to custom agent with mode all",
  () =>
    Effect.gen(function* () {
      const agent = yield* load((svc) => svc.defaultAgent())
      expect(agent).toBe("my_custom")
    }),
  {
    config: {
      default_agent: "my_custom",
      agent: {
        my_custom: {
          description: "My custom agent",
        },
      },
    },
  },
)

it.instance(
  "defaultAgent throws when default_agent points to non-existent agent",
  () => expectDefaultAgentError('default agent "does_not_exist" not found'),
  {
    config: {
      default_agent: "does_not_exist",
    },
  },
)

it.instance(
  "defaultAgent returns auto when worker is disabled and default_agent not set",
  () =>
    Effect.gen(function* () {
      const agent = yield* load((svc) => svc.defaultAgent())
      expect(agent).toBe("auto")
    }),
  {
    config: {
      agent: {
        worker: { disable: true },
      },
    },
  },
)

it.instance(
  "defaultAgent throws when all primary agents are disabled",
  () => expectDefaultAgentError("no primary visible agent found"),
  {
    config: {
      agent: {
        worker: { disable: true },
        planner: { disable: true },
        reviewer: { disable: true },
        nocowboy: { disable: true },
        auto: { disable: true },
      },
    },
  },
)
