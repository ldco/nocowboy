import { describe, test, expect } from "bun:test"
import path from "path"
import { generateHelp, generateCommandTable } from "../../src/nocowboy/help"
import { AcpCommand } from "../../src/cli/cmd/acp"
import { McpCommand } from "../../src/cli/cmd/mcp"
import { RunCommand } from "../../src/cli/cmd/run"
import { GenerateCommand } from "../../src/cli/cmd/generate"
import { DebugCommand } from "../../src/cli/cmd/debug"
import { ProvidersCommand } from "../../src/cli/cmd/providers" // kilocode_change — upstream renamed auth → providers
import { AgentCommand } from "../../src/cli/cmd/agent"
import { UpgradeCommand } from "../../src/cli/cmd/upgrade"
import { UninstallCommand } from "../../src/cli/cmd/uninstall"
import { ServeCommand } from "../../src/cli/cmd/serve"
import { WebCommand } from "../../src/cli/cmd/web"
import { ModelsCommand } from "../../src/cli/cmd/models"
import { StatsCommand } from "../../src/cli/cmd/stats"
import { ExportCommand } from "../../src/cli/cmd/export"
import { ImportCommand } from "../../src/cli/cmd/import"
import { PrCommand } from "../../src/cli/cmd/pr"
import { SessionCommand } from "../../src/cli/cmd/session"
import { RemoteCommand } from "../../src/cli/cmd/remote"
import { ConfigCommand as ConfigCLICommand } from "../../src/cli/cmd/config"
import { PluginCommand } from "../../src/cli/cmd/plug"
import { DbCommand } from "../../src/cli/cmd/db"
import { HelpCommand } from "../../src/nocowboy/help-command"
import { ProfileCommand } from "../../src/nocowboy/cli/cmd/profile"

// Stand-in for TuiThreadCommand — the real one imports @opentui/solid which
// doesn't resolve in the test environment. Only command/describe matter here.
const TuiStub = {
  command: "$0 [project]",
  describe: "start nocowboy tui",
  handler() {},
}

// Stand-in for AttachCommand — same reason as TuiStub above.
const AttachStub = {
  command: "attach <url>",
  describe: "attach to a running nocowboy server",
  handler() {},
}

// Synthetic entry for the yargs built-in .completion() command
const CompletionStub = {
  command: "completion",
  describe: "generate shell completion script",
  handler() {},
}

const commands = [
  AcpCommand,
  McpCommand,
  TuiStub,
  AttachStub,
  RunCommand,
  GenerateCommand,
  DebugCommand,
  ProvidersCommand,
  AgentCommand,
  UpgradeCommand,
  UninstallCommand,
  ServeCommand,
  WebCommand,
  ModelsCommand,
  StatsCommand,
  ExportCommand,
  ImportCommand,
  PrCommand,
  SessionCommand,
  RemoteCommand,
  DbCommand,
  ConfigCLICommand,
  PluginCommand,
  ProfileCommand,
  HelpCommand,
  CompletionStub,
] as any[]

describe("nocowboy help --all (markdown)", () => {
  test("contains ## heading for each known top-level command", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    for (const cmd of ["run", "auth", "debug", "mcp", "session", "agent", "profile"]) {
      expect(output).toContain(`## nocowboy ${cmd}`)
    }
  })

  test("contains headings for nested subcommands", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(output).toContain("nocowboy auth login")
    expect(output).toContain("nocowboy auth logout")
    expect(output).toContain("nocowboy debug config")
  })
})

describe("nocowboy help --all (text)", () => {
  test("does NOT contain Markdown ## headings or triple-backtick fences", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    expect(output).not.toMatch(/^##\s/m)
    expect(output).not.toContain("```")
  })

  test("still contains each command name", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    for (const cmd of ["run", "auth", "debug", "mcp", "session", "agent", "profile"]) {
      expect(output).toContain(`nocowboy ${cmd}`)
    }
  })
})

describe("nocowboy help <command>", () => {
  test("nocowboy help auth contains auth subcommand headings", async () => {
    const output = await generateHelp({ command: "auth", format: "md", commands })
    expect(output).toContain("nocowboy auth login")
    expect(output).toContain("nocowboy auth logout")
    expect(output).toContain("nocowboy auth list")
  })

  test("nocowboy help auth does NOT contain run or debug headings", async () => {
    const output = await generateHelp({ command: "auth", format: "md", commands })
    expect(output).not.toContain("## nocowboy run")
    expect(output).not.toContain("## nocowboy debug")
  })
})

describe("edge cases", () => {
  test("output contains no ANSI escape sequences", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })

  test("nocowboy help nonexistent throws unknown command error", async () => {
    await expect(generateHelp({ command: "nonexistent", commands })).rejects.toThrow("unknown command")
  })
})

describe("generateCommandTable", () => {
  test("returns a string containing a markdown table header", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("| Command | Description |")
  })

  test("contains rows for known commands", async () => {
    const output = await generateCommandTable({ commands })
    for (const name of ["run", "auth", "debug", "mcp"]) {
      expect(output).toContain(`nocowboy ${name}`)
    }
  })

  test("default command appears as nocowboy [project], not $0", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`nocowboy [project]`")
    expect(output).not.toContain("$0")
  })

  test("contains no ANSI escape sequences", async () => {
    const output = await generateCommandTable({ commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })

  test("skips commands with no describe", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).not.toContain("`nocowboy generate`")
  })

  test("contains nocowboy completion row", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`nocowboy completion`")
  })

  test("contains nocowboy help row", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`nocowboy help")
  })
})

describe("NoCowboy CLI customizations are wired into index.ts", () => {
  const file = (rel: string) => Bun.file(path.resolve(import.meta.dir, rel)).text()
  const INDEX = "../../src/index.ts"
  const SETUP = "../../src/nocowboy/cli/setup.ts"
  const BARREL = "../../src/nocowboy/commands.ts"

  test("CLI is branded `nocowboy`, not `opencode`", async () => {
    const index = await file(INDEX)
    expect(index).toContain('.scriptName("nocowboy")')
    expect(index).not.toContain('.scriptName("opencode")')
  })

  test("index.ts invokes the NoCowboyCli integration points", async () => {
    // These thin call-sites are the only wiring between upstream index.ts and the NoCowboy
    // customizations in setup.ts. If a future upstream merge drops them, the telemetry/lifecycle
    // hooks silently disappear, exactly the regression this guards.
    const index = await file(INDEX)
    expect(index).toContain("NocowboyCli.bootstrap(")
    expect(index).toContain("NocowboyCli.shutdown(")
  })

  test("index.ts registers commands through the lazy registry", async () => {
    // Commands used to be imported statically and registered with `.command(XxxCommand)`. That
    // eager graph was the reason `nocowboy --version` took seconds, so registration now goes
    // through src/cli/registry.ts and must stay that way.
    const index = await file(INDEX)
    expect(index).toContain("Commands.detect(")
    expect(index).toContain("Commands.load(")
    expect(index).not.toMatch(/^\s*\.command\((\w+Command)\)/m)
  })

  test("registers the local NoCowboy Console instead of the upstream account console", async () => {
    const index = await file(INDEX)
    const setup = await file(SETUP)
    expect(setup).not.toContain(".command(ConsoleCommand)")
    expect(index).not.toContain(".command(ConsoleCommand)")
  })

  test("lazy registry resolves every barrel command", async () => {
    // The barrel (src/nocowboy/commands.ts) is the source of truth for help/docs; the registry is
    // what actually runs. Drift between them means a documented command that cannot be invoked.
    const { commands } = await import("../../src/nocowboy/commands")
    const registry = await import("../../src/cli/registry")

    // login  - upstream account console, intentionally not registered
    // completion - yargs built-in via `.completion(...)`
    // help   - handled inline in index.ts because it closes over the yargs root
    const except = new Set(["login", "completion", "help"])
    const missing: string[] = []

    for (const command of commands as { command?: string }[]) {
      const name = String(command.command ?? "").split(" ")[0]
      if (!name || except.has(name)) continue
      if (name === "$0") {
        expect(await registry.loadDefault()).toBeTruthy()
        continue
      }
      if (!(await registry.load(name))) missing.push(name)
    }

    expect(missing).toEqual([])
  })
})
