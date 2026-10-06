import { describe, expect, test } from "bun:test"
import { isFirstPartyMcp, resolveCommand } from "@/nocowboy/mcp/launcher"

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
