import { Effect } from "effect"
import { Server } from "../../server/server"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { InstanceRuntime } from "../../project/instance-runtime" // nocowboy_change

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless nocowboy server",
  // Server loads instances per-request via x-nocowboy-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false, // nocowboy_change
  handler: Effect.fn("Cli.serve")(function* (args) {
    if (!Flag.NOCOWBOY_SERVER_PASSWORD) {
      console.log("Warning: NOCOWBOY_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`nocowboy server listening on http://${server.hostname}:${server.port}`) // nocowboy_change

    // nocowboy_change start - graceful signal shutdown
    // yield* Effect.never
    yield* Effect.promise(
      () =>
        new Promise<void>((resolve) => {
          const shutdown = async () => {
            try {
              await InstanceRuntime.disposeAllInstances()
              await server.stop(true)
            } finally {
              resolve()
            }
          }
          process.once("SIGTERM", shutdown)
          process.once("SIGINT", shutdown)
          process.once("SIGHUP", shutdown)
        }),
    )
    // nocowboy_change end
  }),
})
