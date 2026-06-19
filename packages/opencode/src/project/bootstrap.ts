import { Plugin } from "../plugin"
import { Format } from "../format"
import { LSP } from "@/lsp/lsp"
import { File } from "../file"
import { Snapshot } from "../snapshot"
import * as Project from "./project"
import * as Vcs from "./vcs"
import { Bus } from "../bus"
import { InstanceState } from "@/effect/instance-state"
import { FileWatcher } from "@/file/watcher"
// nocowboy_change start
import { NocowboyBootstrap } from "@/nocowboy/bootstrap"
// import { ShareNext } from "@/share/share-next"
// nocowboy_change end
import { Effect, Layer } from "effect"
import { Config } from "@/config/config"
import { Service } from "./bootstrap-service"
import { Reference } from "@/reference/reference"

export { Service } from "./bootstrap-service"
export type { Interface } from "./bootstrap-service"

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    // Yield each bootstrap dep at layer init so `run` itself has R = never.
    // InstanceStore imports only the lightweight tag from bootstrap-service.ts,
    // so it can depend on bootstrap without importing this implementation graph.
    const config = yield* Config.Service
    const file = yield* File.Service
    const fileWatcher = yield* FileWatcher.Service
    const format = yield* Format.Service
    const lsp = yield* LSP.Service
    const plugin = yield* Plugin.Service
    const project = yield* Project.Service
    const reference = yield* Reference.Service
    // nocowboy_change start
    const kilocode = yield* NocowboyBootstrap.Service
    // const shareNext = yield* ShareNext.Service
    // nocowboy_change end
    const snapshot = yield* Snapshot.Service
    const vcs = yield* Vcs.Service

    const run = Effect.gen(function* () {
      const ctx = yield* InstanceState.context
      yield* Effect.logDebug("bootstrapping").pipe(Effect.annotateLogs("directory", ctx.directory)) // nocowboy_change - was logInfo; downgraded to avoid printing to TUI on every startup
      // everything depends on config so eager load it for nice traces
      yield* config.get()
      // Plugin can mutate config so it has to be initialized before anything else.
      yield* plugin.init()
      yield* kilocode.init().pipe(Effect.catchCause((cause) => Effect.logWarning("kilocode init failed", { cause }))) // nocowboy_change
      // Each service self-manages its own slow work via Effect.forkScoped against
      // its per-instance state scope. We just await materialization here.
      yield* Effect.forEach(
        [reference, lsp, format, file, fileWatcher, vcs, snapshot, project], // nocowboy_change - shareNext removed, handled by NocowboyBootstrap
        (s) => s.init().pipe(Effect.catchCause((cause) => Effect.logWarning("init failed", { cause }))),
        { concurrency: "unbounded", discard: true },
      ).pipe(Effect.withSpan("InstanceBootstrap.init"))
    }).pipe(Effect.withSpan("InstanceBootstrap"))

    return Service.of({ run })
  }),
)

export const defaultLayer: Layer.Layer<Service> = layer.pipe(
  Layer.provide([
    Bus.layer,
    Config.defaultLayer,
    File.defaultLayer,
    FileWatcher.defaultLayer,
    Format.defaultLayer,
    LSP.defaultLayer,
    Plugin.defaultLayer,
    Project.defaultLayer,
    Reference.defaultLayer,
    // nocowboy_change start
    NocowboyBootstrap.defaultLayer,
    // ShareNext.defaultLayer,
    // nocowboy_change end
    Snapshot.defaultLayer,
    Vcs.defaultLayer,
  ]),
) as never

export * as InstanceBootstrap from "./bootstrap"
