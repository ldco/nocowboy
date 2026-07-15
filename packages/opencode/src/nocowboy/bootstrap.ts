import { Cause, Context, Effect, Layer } from "effect"
import { EffectBridge } from "@/effect/bridge"
import { Sessions } from "@/nocowboy-sessions/sessions"
import * as Log from "@nocowboy/core/util/log"
import { Global } from "@nocowboy/core/global"
import { InstallationVersion } from "@nocowboy/core/installation/version"
import path from "node:path"
import { Bus } from "@/bus"
import { SessionExport } from "@/nocowboy/session-export"
import { createWorkspaceProvider } from "@/nocowboy/session-export/workspace-provider"
import { Instance } from "@/nocowboy/instance"
import { Identity } from "@nocowboy/telemetry"

const log = Log.create({ service: "kilocode-bootstrap" })

export namespace NocowboyBootstrap {
  export interface Interface {
    readonly init: () => Effect.Effect<void, unknown>
  }

  export class Service extends Context.Service<Service, Interface>()("@nocowboy/Bootstrap") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const sessions = yield* Sessions.Service

      const init = Effect.fn("NocowboyBootstrap.init")(function* () {
        yield* sessions.init()
        yield* Effect.gen(function* () {
          const anon = yield* EffectBridge.fromPromise(() =>
            Identity.getMachineId().catch((err) => {
              log.warn("session export identity failed", { err })
              return undefined
            }),
          )
          SessionExport.init({
            agentVersion: InstallationVersion,
            anonId: anon,
            dbPath: path.join(Global.Path.data, "session-export.db"),
            workspaceKey: Instance.directory,
            subscribeAll: (cb) => Bus.subscribeAll(cb),
            snapshotProvider: createWorkspaceProvider({
              root: Instance.directory,
              statePath: path.join(Global.Path.data, "session-export-workspace.json"),
            }),
          })
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn("session export bootstrap failed", { err: Cause.squash(cause) })),
          ),
        )
        yield* EffectBridge.fromPromise(() =>
          import("@/nocowboy/indexing").then((mod) => mod.KiloIndexing.init()),
        ).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn("indexing bootstrap failed", { err: Cause.squash(cause) })),
          ),
          Effect.forkDetach,
        )
      })

      return Service.of({ init })
    }),
  )

  export const defaultLayer = layer.pipe(Layer.provide(Sessions.defaultLayer))
}
