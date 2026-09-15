import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import * as Log from "@nocowboy/core/util/log"
import { InstallationVersion } from "@nocowboy/core/installation/version"
import { NamedError } from "@nocowboy/core/util/error"
import { FormatError } from "./cli/error"
import { UI } from "./cli/ui"
import { errorMessage } from "./util/error"
import { isRecord } from "./util/record"
import { ensureProcessMetadata } from "@nocowboy/core/util/opencode-process"
import { EOL } from "os"
import * as Commands from "./cli/registry"

const processMetadata = ensureProcessMetadata("main")

process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: errorMessage(e),
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: errorMessage(e),
  })
})

const args = hideBin(process.argv)

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("nocowboy ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text)
    return
  }
  process.stderr.write(out)
}

// Set by the middleware once the heavy bootstrap (telemetry, auth, database) has run, so a
// short-lived `--version`/`--help` never pays for shutdown work that has nothing to tear down.
let bootstrapped = false

// nocowboy_change start - read the invocation before building the parser. `--help` is answered
// from the registry stubs and the middleware bails out, so asking for help never boots telemetry,
// auth or the database; `--version` never reaches the middleware at all.
const requested = Commands.detect(args)
const wantsHelp = args.includes("-h") || args.includes("--help")
const wantsVersion = !wantsHelp && (args.includes("-v") || args.includes("--version"))
// nocowboy_change end

let cli = yargs(args)
  .parserConfiguration({ "populate--": true })
  .scriptName("nocowboy")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    // yargs runs the middleware before printing help, but there is nothing to bootstrap in order
    // to print a command list — and booting telemetry/auth/database costs ~1 s.
    if (wantsHelp) return

    if (opts.pure) {
      process.env.NOCOWBOY_PURE = "1"
    }

    // nocowboy_change - the bootstrap dependencies are imported lazily so that commands that
    // never reach this middleware (--version, --help) do not load the config/database graph.
    const { Installation } = await import("./installation")
    await Log.init({
      print: process.argv.includes("--print-logs"),
      dev: Installation.isLocal(),
      level: (() => {
        if (opts.logLevel) return opts.logLevel as Log.Level
        if (Installation.isLocal()) return "DEBUG"
        return "INFO"
      })(),
    })

    const { Heap } = await import("./cli/heap")
    Heap.start()

    process.env.AGENT = "1"
    process.env.OPENCODE = "1"
    process.env.NOCOWBOY_PID = String(process.pid)

    Log.Default.info("nocowboy", {
      version: InstallationVersion,
      args: process.argv.slice(2),
      process_role: processMetadata.processRole,
      run_id: processMetadata.runID,
    })

    const { NocowboyCli } = await import("./nocowboy/cli/setup")
    await NocowboyCli.bootstrap()
    bootstrapped = true

    const { Database } = await import("./storage/db")
    const { Filesystem } = await import("./util/filesystem")
    // nocowboy_change - the marker must be the channel-aware database path. The old
    // hardcoded "nocowboy.db" only matches prod/latest channels; dev/local use
    // "nocowboy-<channel>.db", so the one-time JSON migration never found its marker and
    // re-ran on every startup.
    const marker = Database.getPath()
    if (!(await Filesystem.exists(marker))) {
      const { JsonMigration } = await import("./storage/json-migration")
      const { drizzle } = await import("drizzle-orm/bun-sqlite")
      const tty = process.stderr.isTTY
      process.stderr.write("Performing one time database migration, may take a few minutes..." + EOL)
      const width = 36
      const orange = "\x1b[38;5;214m"
      const muted = "\x1b[0;2m"
      const reset = "\x1b[0m"
      let last = -1
      if (tty) process.stderr.write("\x1b[?25l")
      try {
        await JsonMigration.run(drizzle({ client: Database.Client().$client }), {
          progress: (event) => {
            const percent = Math.floor((event.current / event.total) * 100)
            if (percent === last && event.current !== event.total) return
            last = percent
            if (tty) {
              const fill = Math.round((percent / 100) * width)
              const bar = `${"■".repeat(fill)}${"･".repeat(width - fill)}`
              process.stderr.write(
                `\r${orange}${bar} ${percent.toString().padStart(3)}%${reset} ${muted}${event.label.padEnd(12)} ${event.current}/${event.total}${reset}`,
              )
              if (event.current === event.total) process.stderr.write("\n")
            } else {
              process.stderr.write(`sqlite-migration:${percent}${EOL}`)
            }
          },
        })
      } finally {
        if (tty) process.stderr.write("\x1b[?25h")
        else {
          process.stderr.write(`sqlite-migration:done${EOL}`)
        }
      }
      process.stderr.write("Database migration complete." + EOL)
    }
  })
  .usage("")
  .completion("completion", "generate shell completion script")

// nocowboy_change start - register only the command this invocation actually runs. The
// previous entrypoint statically imported every command module, so `nocowboy --version` and the
// default TUI both paid for the whole ~1400-module eager graph (serve, debug, github, mcp...).
// detect() reads the command name straight from argv, which keeps yargs out of the decision.
//
// The command list for `--help` comes from the registry's stubs, so printing it does not import
// every command module; the default TUI command is real because its options belong in the help.
async function registerCommandList() {
  for (const module of Commands.stubs()) cli = cli.command(module)
  cli = cli.command(await Commands.loadDefault())
}

if (requested === "help") {
  const { createHelpCommand } = await import("./nocowboy/help-command")
  await registerCommandList()
  cli = cli.command(createHelpCommand(() => cli))
} else if (requested && Commands.isBuiltin(requested)) {
  // yargs owns this command (`.completion(...)`); there is no module to load.
} else if (requested) {
  const module = await Commands.load(requested)
  if (module) cli = cli.command(module)
  else await registerCommandList()
} else if (wantsHelp) {
  await registerCommandList()
} else if (!wantsVersion) {
  cli = cli.command(await Commands.loadDefault())
}
// nocowboy_change end

cli = cli
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp(show)
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  if (wantsHelp) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  let data: Record<string, any> = {}
  if (e instanceof Error) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      cause: e.cause?.toString(),
      stack: e.stack,
    })
  }

  if (e instanceof NamedError) {
    const obj = e.toObject()
    if (isRecord(obj.data)) {
      for (const [key, value] of Object.entries(obj.data)) {
        if (key === "name" || key === "stack" || key === "cause") continue
        data[key] = value
      }
    }
  }

  if (e instanceof ResolveMessage) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      code: e.code,
      specifier: e.specifier,
      referrer: e.referrer,
      position: e.position,
      importKind: e.importKind,
    })
  }
  Log.Default.error("fatal", data)
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    process.stderr.write(errorMessage(e) + EOL)
  }
  process.exitCode = 1
} finally {
  if (bootstrapped) {
    const { NocowboyCli } = await import("./nocowboy/cli/setup")
    await NocowboyCli.shutdown()
  }

  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}
