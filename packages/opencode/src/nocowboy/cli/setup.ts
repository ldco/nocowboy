import * as Log from "@nocowboy/core/util/log"
import { InstallationVersion } from "@nocowboy/core/installation/version"
import { Telemetry } from "@nocowboy/telemetry"
import { migrateLegacyNoCowboyAuth as migrateLegacyAuth, ENV_FEATURE, ENV_VERSION } from "@nocowboy/gateway"
import { AppRuntime } from "@/effect/app-runtime"
import { Auth } from "@/auth"
import { InstanceRuntime } from "@/project/instance-runtime"
import { SessionExport } from "@/nocowboy/session-export"

const log = Log.create({ service: "nocowboy.cli" })

// All Kilo-specific CLI customization lives here so the shared upstream entrypoint
// (src/index.ts) only needs a handful of thin call-sites behind nocowboy_change markers.
// This keeps index.ts close to upstream and reduces merge conflicts on every sync.
//
// Command registration moved to src/cli/registry.ts: the entrypoint now loads exactly one
// command module per invocation instead of importing every command statically, so this file
// must not re-import them or the lazy graph collapses back into the eager one.
export namespace NocowboyCli {
  // Runs from the upstream `.middleware`, before any command handler. Env tagging is additive so
  // it never has to modify upstream's own env assignments.
  export async function bootstrap(): Promise<void> {
    if (!process.env[ENV_FEATURE]) process.env[ENV_FEATURE] = process.argv.includes("serve") ? "unknown" : "cli"
    if (!process.env[ENV_VERSION]) process.env[ENV_VERSION] = InstallationVersion
    process.env.NOCOWBOY = "1"

    await Telemetry.init()

    // Migrate legacy auth (~/.nocowboy/cli/config.json) into auth.json if present.
    await migrateLegacyAuth()

    const auth = await AppRuntime.runPromise(Auth.Service.use((s) => s.get("kilo")))
    if (auth) {
      const token = auth.type === "oauth" ? auth.access : auth.key
      const account = auth.type === "oauth" ? auth.accountId : undefined
      await Telemetry.updateIdentity()
    }

    Telemetry.trackCliStart()
  }

  // Runs from the `finally` block on every exit path.
  export async function shutdown(): Promise<void> {
    Telemetry.trackCliExit(process.exitCode != null ? Number(process.exitCode) : 0)
    try {
      await SessionExport.shutdown()
      // Bound telemetry shutdown so an unreachable endpoint (offline, firewall,
      // DNS adblock resolving the host to 0.0.0.0) cannot block process exit on
      // short-lived commands like `kilo --help` / `kilo --version` (#9788).
      try {
        await Telemetry.shutdown(2000)
      } catch (err) {
        log.warn("telemetry shutdown failed", { err })
      }
    } finally {
      await InstanceRuntime.disposeAllInstances() // safety net (no-op if already disposed)
    }
  }
}
