import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { Effect, Layer, Schema } from "effect"
import * as Log from "@nocowboy/core/util/log"
import { Agent } from "../../src/agent/agent"
import { KiloIndexing } from "../../src/nocowboy/indexing"
import { NocowboyBootstrap } from "../../src/nocowboy/bootstrap"
import { Sessions } from "../../src/nocowboy-sessions/sessions"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ToolRegistry } from "../../src/tool/registry"
import { NocowboyToolRegistry } from "../../src/nocowboy/tool/registry"
import type * as Tool from "../../src/tool/tool"
import { Instance } from "../../src/nocowboy/instance"
import { disposeAllInstances, provideTmpdirInstance } from "../fixture/fixture"
import * as CrossSpawnSpawner from "@nocowboy/core/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const node = CrossSpawnSpawner.defaultLayer
const it = testEffect(Layer.mergeAll(Agent.defaultLayer, ToolRegistry.defaultLayer, node))
const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}

afterEach(async () => {
  await disposeAllInstances()
})

describe("NoCowboy tool registry indexing", () => {
  const logger = Log.create({ service: "kilocode-tool-registry" })

  it.live("omits semantic_search without waiting for slow indexing startup", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const avail = spyOn(KiloIndexing, "available").mockImplementation(() => new Promise<boolean>(() => {}))

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).not.toContain("codesearch")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(avail).not.toHaveBeenCalled()
          } finally {
            avail.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("registers semantic search from config even when readiness throws", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready failed")
          const ready = spyOn(KiloIndexing, "ready").mockImplementation(() => {
            throw err
          })
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic search from config even when readiness rejects", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready rejected")
          const ready = spyOn(KiloIndexing, "ready").mockImplementation(
            () => Promise.reject(err) as unknown as boolean,
          )
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic_search when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(KiloIndexing, "ready").mockReturnValue(true)

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("omits semantic_search hint from glob and grep descriptions when indexing is not ready", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(KiloIndexing, "ready").mockReturnValue(false)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(glob).not.toContain("semantic_search")
            expect(grep).not.toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("includes semantic_search hint in glob and grep descriptions when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(KiloIndexing, "ready").mockReturnValue(true)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const ids = tools.map((tool) => tool.id)
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(ids).toContain("semantic_search")
            expect(glob).toContain("semantic_search")
            expect(grep).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  test("enables semantic search from indexing configuration before the index is ready", () => {
    expect(
      NocowboyToolRegistry.indexing({
        indexing: { enabled: true },
      }),
    ).toBe(true)
    expect(
      NocowboyToolRegistry.indexing({
        indexing: { enabled: false },
      }),
    ).toBe(false)
    expect(NocowboyToolRegistry.indexing({}, { indexing: { enabled: true } })).toBe(true)
  })

  test("conditionally includes NoCowboy registry extras", () => {
    const prev = process.env["NOCOWBOY_CLIENT"]
    const prevNcn = process.env["NOCOWBOY_CLIENT"]
    const def = (id: string): Tool.Def => ({
      id,
      description: id,
      parameters: Schema.String,
      execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
    })
    const tools = {
      codebase: def("codebase_search"),
      semantic: def("semantic_search"),
      recall: def("recall"),
      manager: def("agent_manager"),
      process: def("background_process"),
      goalSet: def("goal_set"),
      goalClear: def("goal_clear"),
    }

    try {
      process.env["NOCOWBOY_CLIENT"] = "cli"
      process.env["NOCOWBOY_CLIENT"] = "cli"
      expect(NocowboyToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "recall",
        "goal_set",
        "goal_clear",
        "background_process",
      ])
      expect(NocowboyToolRegistry.extra(tools, { experimental: { codebase_search: true } }).map((tool) => tool.id)).toEqual(
        ["codebase_search", "semantic_search", "recall", "goal_set", "goal_clear", "background_process"],
      )

      process.env["NOCOWBOY_CLIENT"] = "vscode"
      process.env["NOCOWBOY_CLIENT"] = "vscode"
      expect(NocowboyToolRegistry.extra(tools, { experimental: { codebase_search: true } }).map((tool) => tool.id)).toEqual(
        ["codebase_search", "semantic_search", "recall", "goal_set", "goal_clear", "background_process", "agent_manager"],
      )
      expect(NocowboyToolRegistry.extra({ ...tools, semantic: undefined }, {}).map((tool) => tool.id)).toEqual([
        "recall",
        "goal_set",
        "goal_clear",
        "background_process",
        "agent_manager",
      ])

      process.env["NOCOWBOY_CLIENT"] = "desktop"
      process.env["NOCOWBOY_CLIENT"] = "desktop"
      expect(NocowboyToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "recall",
        "goal_set",
        "goal_clear",
      ])
    } finally {
      if (prev === undefined) delete process.env["NOCOWBOY_CLIENT"]
      if (prev !== undefined) process.env["NOCOWBOY_CLIENT"] = prev
      if (prevNcn === undefined) delete process.env["NOCOWBOY_CLIENT"]
      if (prevNcn !== undefined) process.env["NOCOWBOY_CLIENT"] = prevNcn
    }
  })

  test("logs indexing bootstrap failures without blocking session bootstrap", async () => {
    const logger = Log.create({ service: "kilocode-bootstrap" })
    const err = new Error("indexing init failed")
    const calls: string[] = []
    const sessions = Layer.succeed(
      Sessions.Service,
      Sessions.Service.of({ init: () => Effect.sync(() => calls.push("sessions")) }),
    )
    const indexing = spyOn(KiloIndexing, "init").mockRejectedValue(err)
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    try {
      await Effect.runPromise(
        NocowboyBootstrap.Service.use((svc) => svc.init()).pipe(
          Effect.provide(NocowboyBootstrap.layer.pipe(Layer.provide(sessions))),
          Effect.scoped,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(calls).toEqual(["sessions"])
      expect(indexing).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith("indexing bootstrap failed", { err })
    } finally {
      indexing.mockRestore()
      warn.mockRestore()
    }
  })
})
