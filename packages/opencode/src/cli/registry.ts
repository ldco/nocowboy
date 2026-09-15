import type { CommandModule } from "yargs"
import { InstallationBuildKind } from "@nocowboy/core/installation/version"

// Every command module is reached through a dynamic `import()` so that launching the CLI with
// `--version`, the default TUI, or a single subcommand no longer pays for the whole eager module
// graph. Before this registry the entrypoint statically imported all ~30 command modules (1403
// eager modules; `serve` and `debug` alone are ~274 each), which is why a bare `nocowboy
// --version` took seconds to print a number. Dynamic imports stay lazy inside a compiled Bun
// binary, so only the modules the invocation actually needs are parsed.
//
// The command string, description and aliases are duplicated here on purpose: `nocowboy --help`
// must be able to print the command list without importing every command. A test
// (test/nocowboy/cli/registry.test.ts) loads the real modules and asserts these fields still
// match, so the duplication cannot silently drift.
export type LazyCommand = {
  /** Full command string exactly as yargs sees it, e.g. "attach <url>". */
  command: string
  /** Aliases yargs should accept, e.g. ["providers"] for "auth". */
  aliases?: string[]
  /** Description shown in the command list. Omit it to keep the command out of `--help`. */
  describe?: string
  load: () => Promise<CommandModule<any, any>>
}

/** Wraps a module accessor so each command's concrete arg types do not leak into the registry. */
function lazy(
  command: string,
  describe: string | undefined,
  load: () => Promise<unknown>,
  aliases?: string[],
): LazyCommand {
  return { command, describe, aliases, load: async () => (await load()) as CommandModule<any, any> }
}

const always: LazyCommand[] = [
  lazy("acp", "start ACP (Agent Client Protocol) server", async () => (await import("./cmd/acp")).AcpCommand),
  lazy("agent", "manage agents", async () => (await import("./cmd/agent")).AgentCommand),
  lazy("auth", "manage AI providers and credentials", async () => (await import("./cmd/providers")).ProvidersCommand, [
    "providers",
  ]),
  lazy("attach <url>", "attach to a running nocowboy server", async () => (await import("./cmd/tui/attach")).AttachCommand),
  lazy("config", "configuration tools", async () => (await import("./cmd/config")).ConfigCommand),
  lazy("console", "open the local NoCowboy Console", async () => (await import("@/nocowboy/cli/cmd/console")).NocowboyConsoleCommand),
  lazy("daemon", "manage the local kilo daemon", async () => (await import("@/nocowboy/cli/cmd/daemon")).DaemonCommand),
  lazy("db", "database tools", async () => (await import("./cmd/db")).DbCommand),
  lazy("debug", "debugging and troubleshooting tools", async () => (await import("./cmd/debug")).DebugCommand),
  lazy("distill [hours]", "scan recent sessions and generate skill/command files for recurring workflows", async () =>
    (await import("@/nocowboy/cli/cmd/distill")).DistillCommand),
  lazy("export [sessionID]", "export session data as JSON", async () => (await import("./cmd/export")).ExportCommand),
  // `generate` has no describe upstream, so yargs keeps it out of the command list.
  lazy("generate", undefined, async () => (await import("./cmd/generate")).GenerateCommand),
  lazy("github", "manage GitHub agent", async () => (await import("./cmd/github")).GithubCommand),
  lazy("import <file>", "import session data from JSON file or URL", async () => (await import("./cmd/import")).ImportCommand),
  lazy("init", "first-run setup — configure NoCowboy globally (system-wide)", async () => (await import("./cmd/init")).InitCommand),
  lazy("mcp", "manage MCP (Model Context Protocol) servers", async () => (await import("./cmd/mcp")).McpCommand),
  lazy("models [provider]", "list all available models", async () => (await import("./cmd/models")).ModelsCommand),
  lazy("plugin <module>", "install plugin and update config", async () => (await import("./cmd/plug")).PluginCommand, [
    "plug",
  ]),
  lazy("pr <number>", "fetch and checkout a GitHub PR branch, then run kilo", async () => (await import("./cmd/pr")).PrCommand),
  lazy("profile", "show NoCowboy account profile", async () => (await import("@/nocowboy/cli/cmd/profile")).ProfileCommand),
  lazy("remote", "enable remote connection for real-time session relay", async () => (await import("./cmd/remote")).RemoteCommand),
  lazy("repomap", "generate a repository map (Aider-style)", async () => (await import("./cmd/repomap")).RepoMapCommand),
  lazy("roadmap", "manage project roadmap (docs/roadmap.json)", async () => (await import("./cmd/roadmap")).RoadmapCommand),
  lazy("roll-call <filter>", "batch-test text models matching a filter for connectivity and latency", async () =>
    (await import("@/nocowboy/cli/cmd/roll-call")).RollCallCommand),
  lazy("run [message..]", "run kilo with a message", async () => (await import("./cmd/run")).RunCommand),
  lazy("serve", "starts a headless nocowboy server", async () => (await import("./cmd/serve")).ServeCommand),
  lazy("session", "manage sessions", async () => (await import("./cmd/session")).SessionCommand),
  lazy("stats", "show token usage and cost statistics", async () => (await import("./cmd/stats")).StatsCommand),
  lazy("uninstall", "uninstall kilo and remove all related files", async () => (await import("./cmd/uninstall")).UninstallCommand),
  lazy("upgrade [target]", "upgrade NoCowboy to the latest or a specific version", async () => (await import("./cmd/upgrade")).UpgradeCommand),
  lazy("web", "start nocowboy server and open web interface", async () => (await import("./cmd/web")).WebCommand),
]

// dev-setup / dev-alias are only registered for non-release builds, mirroring the old
// NocowboyCli.register so a release binary never advertises them.
const devOnly: LazyCommand[] = [
  lazy("dev-setup", "install a `kilodev` shell alias for this checkout", async () => (await import("@/nocowboy/cli/dev-setup")).DevSetupCommand),
  lazy("dev-alias [shell]", undefined, async () => (await import("@/nocowboy/cli/dev-setup")).DevAliasCommand),
]

const DEFAULT: LazyCommand = lazy("$0 [project]", "start nocowboy tui", async () =>
  (await import("./cmd/tui/thread")).TuiThreadCommand)

function all(): LazyCommand[] {
  return InstallationBuildKind === "release" ? always : [...always, ...devOnly]
}

/** First token of a command string, i.e. the name a user types. */
function nameOf(entry: LazyCommand): string {
  return entry.command.split(" ")[0]!
}

const byName = new Map<string, LazyCommand>()
for (const entry of all()) {
  byName.set(nameOf(entry), entry)
  for (const alias of entry.aliases ?? []) byName.set(alias, entry)
}

/** The registry entries, exposed for tests that verify they match the real modules. */
export function entries(): LazyCommand[] {
  return all()
}

/** Loads the module for `name` (or one of its aliases), or `undefined` when unknown. */
export async function load(name: string): Promise<CommandModule<any, any> | undefined> {
  const entry = byName.get(name)
  return entry ? entry.load() : undefined
}

/** Loads the default (`$0`) command — the TUI thread. */
export async function loadDefault(): Promise<CommandModule<any, any>> {
  return DEFAULT.load()
}

/**
 * Lightweight stand-ins for the command list. `--help` only needs the command string, aliases
 * and description, so registering these avoids importing all ~30 modules just to print help.
 * Commands without a description are omitted, matching what yargs displays for them.
 */
export function stubs(): CommandModule<any, any>[] {
  return all()
    .filter((entry) => entry.describe !== undefined)
    .map((entry) => ({
      command: entry.command,
      describe: entry.describe,
      aliases: entry.aliases,
      handler: () => {},
    }))
}

/** Loads every command. Used by the `help` command, which needs real builders for `--all`. */
async function loadAll(): Promise<CommandModule<any, any>[]> {
  const loaded = await Promise.all(all().map((entry) => entry.load()))
  return [...loaded, await loadDefault()]
}

/**
 * Commands yargs registers itself (via `.completion(...)` in the entrypoint), so there is no
 * module to load and no reason to fall back to loading every command.
 */
const builtins = new Set(["completion"])

export function isBuiltin(name: string): boolean {
  return builtins.has(name)
}

/**
 * Options that consume the following token. Only options that can legally appear *before* the
 * command name matter here: the global flags declared in the entrypoint plus the TUI options,
 * because the TUI is the `$0` command and `nocowboy --prompt run` must not be read as `run`.
 */
const valueFlags = new Set([
  "--log-level",
  "-m",
  "--model",
  "-s",
  "--session",
  "--prompt",
  "--agent",
  "--hostname",
  "--port",
])

/**
 * Returns the top-level command name from raw argv without invoking yargs, so that the parser
 * only has to know about the command that will actually run.
 */
export function detect(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]
    if (token === "--") return argv[index + 1]
    if (token.startsWith("-")) {
      const flag = token.includes("=") ? token.slice(0, token.indexOf("=")) : token
      if (!token.includes("=") && valueFlags.has(flag)) index++
      continue
    }
    return token
  }
  return undefined
}
