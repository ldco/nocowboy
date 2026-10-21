import { describe, expect, test } from "bun:test"
import { commandExists, commandPaths, isFirstPartyMcp, resolveCommand } from "@/nocowboy/mcp/launcher"

describe("resolveCommand — first-party MCP launch precedence", () => {
  test("launch.json wins over installed package and defaults", () => {
    expect(
      resolveCommand("git", {
        launchJson: () => "custom-git-cmd",
        installedPackage: () => "node /pkg/git",
        defaults: { git: { command: "uvx mcp-server-git" } },
      }),
    ).toBe("custom-git-cmd")
  })

  test("an installed @nocowboy/mcp-<name> beats a third-party default", () => {
    expect(
      resolveCommand("git", {
        launchJson: () => undefined,
        installedPackage: () => "node /pkg/git",
        defaults: { git: { command: "uvx mcp-server-git" } },
      }),
    ).toBe("node /pkg/git")
  })

  test("a third-party npx default is the last resort", () => {
    expect(
      resolveCommand("context7", {
        launchJson: () => undefined,
        installedPackage: () => null,
        defaults: { context7: { command: "npx -y @upstash/context7-mcp" } },
      }),
    ).toBe("npx -y @upstash/context7-mcp")
  })

  test("an empty launch.json command falls through to the next tier", () => {
    expect(
      resolveCommand("sqlite", {
        launchJson: () => "",
        installedPackage: () => null,
        defaults: { sqlite: { command: "npx mcp-sqlite-server" } },
      }),
    ).toBe("npx mcp-sqlite-server")
  })

  test("nothing to launch is null", () => {
    expect(resolveCommand("unknown", { launchJson: () => undefined, installedPackage: () => null, defaults: {} })).toBeNull()
    expect(resolveCommand("unknown", {})).toBeNull()
  })
})

describe("resolveCommand — onResolve reports the winning source deterministically", () => {
  const track = () => {
    const seen: { name: string; source: string; command: string | null }[] = []
    return { seen, onResolve: (info: { name: string; source: string; command: string | null }) => seen.push(info) }
  }

  test("launch-json tier is reported", () => {
    const t = track()
    const cmd = resolveCommand("git", {
      launchJson: () => "custom-git-cmd",
      installedPackage: () => null,
      defaults: {},
      onResolve: t.onResolve,
    })
    expect(cmd).toBe("custom-git-cmd")
    expect(t.seen).toEqual([{ name: "git", source: "launch-json", command: "custom-git-cmd" }])
  })

  test("installed tier is reported", () => {
    const t = track()
    const cmd = resolveCommand("git", {
      launchJson: () => undefined,
      installedPackage: () => "node /pkg/git",
      defaults: {},
      onResolve: t.onResolve,
    })
    expect(cmd).toBe("node /pkg/git")
    expect(t.seen).toEqual([{ name: "git", source: "installed", command: "node /pkg/git" }])
  })

  test("default tier is reported", () => {
    const t = track()
    const cmd = resolveCommand("context7", {
      launchJson: () => undefined,
      installedPackage: () => null,
      defaults: { context7: { command: "npx -y @upstash/context7-mcp" } },
      onResolve: t.onResolve,
    })
    expect(cmd).toBe("npx -y @upstash/context7-mcp")
    expect(t.seen).toEqual([{ name: "context7", source: "default", command: "npx -y @upstash/context7-mcp" }])
  })

  test("no tier is reported as none with a null command", () => {
    const t = track()
    const cmd = resolveCommand("unknown", {
      launchJson: () => undefined,
      installedPackage: () => null,
      defaults: {},
      onResolve: t.onResolve,
    })
    expect(cmd).toBeNull()
    expect(t.seen).toEqual([{ name: "unknown", source: "none", command: null }])
  })

  test("an empty launch.json falls through, so the winning source is not launch-json", () => {
    const t = track()
    resolveCommand("sqlite", {
      launchJson: () => "",
      installedPackage: () => null,
      defaults: { sqlite: { command: "npx mcp-sqlite-server" } },
      onResolve: t.onResolve,
    })
    expect(t.seen).toEqual([{ name: "sqlite", source: "default", command: "npx mcp-sqlite-server" }])
  })
})

describe("resolveCommand — name conflicts resolve deterministically to the highest tier", () => {
  test("a name present in all three tiers resolves to launch.json and is reported exactly once", () => {
    const seen: { name: string; source: string; command: string | null }[] = []
    const cmd = resolveCommand("git", {
      launchJson: () => "json-cmd",
      installedPackage: () => "node /pkg/git",
      defaults: { git: { command: "uvx mcp-server-git" } },
      onResolve: (info) => seen.push(info),
    })
    expect(cmd).toBe("json-cmd")
    expect(seen).toEqual([{ name: "git", source: "launch-json", command: "json-cmd" }])
    expect(seen).toHaveLength(1)
  })

  test("a name conflicting between an installed package and a default resolves to installed", () => {
    const seen: { name: string; source: string; command: string | null }[] = []
    const cmd = resolveCommand("git", {
      launchJson: () => undefined,
      installedPackage: () => "node /pkg/git",
      defaults: { git: { command: "uvx mcp-server-git" } },
      onResolve: (info) => seen.push(info),
    })
    expect(cmd).toBe("node /pkg/git")
    expect(seen).toEqual([{ name: "git", source: "installed", command: "node /pkg/git" }])
    expect(seen).toHaveLength(1)
  })
})

describe("isFirstPartyMcp", () => {
  test("names without a third-party default are first-party", () => {
    expect(isFirstPartyMcp("constitution")).toBe(true)
    expect(isFirstPartyMcp("nutausik")).toBe(true)
    expect(isFirstPartyMcp("contract-guard")).toBe(true)
  })

  test("names with a built-in third-party default are not first-party", () => {
    expect(isFirstPartyMcp("context7")).toBe(false)
    expect(isFirstPartyMcp("sqlite")).toBe(false)
    expect(isFirstPartyMcp("git")).toBe(false)
  })

  test("an empty name is not first-party", () => {
    expect(isFirstPartyMcp("  ")).toBe(false)
  })
})

describe("commandExists — stale launch.json paths", () => {
  test("extracts absolute path arguments", () => {
    expect(commandPaths("node /pkg/a.js --serve")).toEqual(["/pkg/a.js"])
    expect(commandPaths('node "/pkg with space/a.js"')).toEqual(["/pkg with space/a.js"])
    expect(commandPaths("npx -y @upstash/context7-mcp")).toEqual([])
  })

  test("a command whose absolute path exists is launchable", () => {
    expect(commandExists(`node ${import.meta.path}`)).toBe(true)
  })

  test("a command pointing at a moved repository is not launchable", () => {
    expect(commandExists("node /definitely/not/here/dist/index.js --serve")).toBe(false)
  })

  test("commands without absolute paths are assumed launchable", () => {
    expect(commandExists("npx -y @upstash/context7-mcp")).toBe(true)
  })
})
