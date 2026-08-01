import { CodebaseSearchTool } from "../../tool/warpgrep"
import { RecallTool } from "../../tool/recall"
import { AgentManagerTool } from "./agent-manager"
import { BackgroundProcessTool } from "./background-process"
import { GoalSetTool, GoalClearTool } from "./goal"
import { TeamSpawnTool } from "./team"
import * as Tool from "../../tool/tool"
import { Flag } from "@nocowboy/core/flag/flag"
import { Effect } from "effect"
import * as Log from "@nocowboy/core/util/log"
import { Agent } from "@/agent/agent"
import * as Truncate from "@/tool/truncate"
import type { Config } from "@/config/config"

const log = Log.create({ service: "kilocode-tool-registry" })
type Deps = { agent: Agent.Interface; truncate: Truncate.Interface; indexing?: boolean }
type Loaders = {
  indexing?: () => Promise<{ KiloIndexing: { ready: () => boolean } }>
  semantic?: () => Promise<Pick<typeof import("@/nocowboy/tool/semantic-search"), "SemanticSearchTool">>
}

export namespace NocowboyToolRegistry {
  const hint =
    "- When you are doing an open-ended search where you do not know the exact symbol name, use the `semantic_search` tool first to narrow down the search scope, then follow up with `Grep` and/or `Read`"

  export function indexing(
    config: Pick<Config.Info, "indexing">,
    global?: Pick<Config.Info, "indexing">,
  ): boolean | undefined {
    return config.indexing?.enabled ?? global?.indexing?.enabled
  }

  /** Resolve Kilo-specific tool Infos outside any InstanceState, so their Truncate/Agent deps are
   * satisfied at the outer registry scope instead of leaking into InstanceState's Effect. */
  export function infos() {
    return Effect.gen(function* () {
      const codebase = yield* CodebaseSearchTool
      const recall = yield* RecallTool
      const manager = yield* AgentManagerTool
      const process = yield* BackgroundProcessTool
      const goalSet = yield* GoalSetTool
      const goalClear = yield* GoalClearTool
      const teamSpawn = yield* TeamSpawnTool
      return { codebase, recall, manager, process, goalSet, goalClear, teamSpawn }
    })
  }

  /** Finalize Kilo-specific tools into Tool.Defs. Call this inside the InstanceState state Effect —
   * it has no Service deps beyond what Tool.init itself needs. */
  export function build(
    tools: {
      codebase: Tool.Info
      recall: Tool.Info
      manager: Tool.Info
      process: Tool.Info
      goalSet: Tool.Info
      goalClear: Tool.Info
      teamSpawn: Tool.Info
    },
    deps: Deps,
    loaders: Loaders = {},
  ) {
    return Effect.gen(function* () {
      const base = yield* Effect.all({
        codebase: Tool.init(tools.codebase),
        recall: Tool.init(tools.recall),
        manager: Tool.init(tools.manager),
        process: Tool.init(tools.process),
        goalSet: Tool.init(tools.goalSet),
        goalClear: Tool.init(tools.goalClear),
        teamSpawn: Tool.init(tools.teamSpawn),
      })
      const semantic = yield* semanticTool(deps, loaders)
      return { ...base, semantic }
    })
  }

  function semanticTool(deps: Deps, loaders: Loaders) {
    return Effect.gen(function* () {
      const ready = yield* (deps.indexing === undefined
        ? (() => {
            const indexing = loaders.indexing ?? (() => import("@/nocowboy/indexing"))
            return Effect.tryPromise(() => indexing().then((mod) => mod.KiloIndexing.ready())).pipe(
              Effect.catch((err) =>
                Effect.sync(() => {
                  log.warn("semantic search unavailable", { err })
                  return false
                }),
              ),
            )
          })()
        : Effect.succeed(deps.indexing))
      if (!ready) return undefined

      const semantic = loaders.semantic ?? (() => import("@/nocowboy/tool/semantic-search"))
      const mod = yield* Effect.tryPromise(() => semantic()).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            log.warn("semantic search tool unavailable", { err })
            return undefined
          }),
        ),
      )
      if (!mod) return undefined

      const info = yield* mod.SemanticSearchTool.pipe(
        Effect.provideService(Agent.Service, deps.agent),
        Effect.provideService(Truncate.Service, deps.truncate),
      )
      if (!info) return undefined
      return yield* Tool.init(info)
    })
  }

  /** Kilo-specific tools to append to the builtin list */
  export function extra(
    tools: {
      codebase: Tool.Def
      semantic?: Tool.Def
      recall: Tool.Def
      manager: Tool.Def
      process: Tool.Def
      goalSet: Tool.Def
      goalClear: Tool.Def
      teamSpawn: Tool.Def
    },
    cfg: { experimental?: { codebase_search?: boolean } },
  ): Tool.Def[] {
    return [
      ...(cfg.experimental?.codebase_search === true ? [tools.codebase] : []),
      ...(tools.semantic ? [tools.semantic] : []),
      tools.recall,
      tools.goalSet,
      tools.goalClear,
      tools.teamSpawn,
      ...(Flag.NOCOWBOY_CLIENT === "cli" || Flag.NOCOWBOY_CLIENT === "vscode" ? [tools.process] : []),
      // The extension is the only client that can consume the Agent Manager start event.
      ...(Flag.NOCOWBOY_CLIENT === "vscode" ? [tools.manager] : []),
    ]
  }

  export function describe(tools: Tool.Def[], extra: { semantic?: Tool.Def }): Tool.Def[] {
    if (!extra.semantic) return tools
    return tools.map((tool) => {
      if (tool.id !== "glob" && tool.id !== "grep") return tool
      return { ...tool, description: `${tool.description}\n${hint}` }
    })
  }
}
