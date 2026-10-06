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
import { ensureNutausikRunning } from "@/nocowboy/nutausik-auto-wire"
import { GlobalBus } from "@/bus/global"

const log = Log.create({ service: "kilocode-bootstrap" })

// Directories whose config-updated listener was already registered, so a
// repeated bootstrap does not stack listeners on the process-wide bus.
const configListeners = new Set<string>()

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
        // Start the NUTAUSIK proxy before MCP state is built. MCP connects to
        // http://127.0.0.1:9210 at instance start; if the proxy is not listening
        // yet the client fails once and never retries, leaving the session
        // without nutausik_* tools ("Unable to connect. Is the computer able to
        // access the url?"). Awaited so the port answers before bootstrap ends.
        yield* EffectBridge.fromPromise(() => ensureNutausikRunning()).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn("nutausik bootstrap failed", { err: Cause.squash(cause) })),
          ),
        )
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
        // Rebuild indexing when its config changes. The entry is cached by
        // directory and previously never re-read the config, so a vector-store
        // switch did nothing until restart. Registered once per directory and
        // bound to this instance so the reload runs with the right context.
        yield* Effect.sync(() => {
          const dir = Instance.directory
          if (configListeners.has(dir)) return
          configListeners.add(dir)
          const onConfigUpdated = Instance.bind(() => {
            void import("@/nocowboy/indexing")
              .then((mod) => mod.KiloIndexing.onConfigUpdated())
              .catch((err) => log.warn("indexing config reload failed", { err }))
          })
          GlobalBus.on("event", (event) => {
            if (event.payload?.type !== "global.config.updated") return
            onConfigUpdated()
          })
        })
      })

      return Service.of({ init })
    }),
  )

  export const defaultLayer = layer.pipe(Layer.provide(Sessions.defaultLayer))
}
