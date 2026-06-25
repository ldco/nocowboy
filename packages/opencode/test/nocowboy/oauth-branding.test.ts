import { describe, expect, test } from "bun:test"
import path from "path"

const root = path.join(__dirname, "..", "..")

describe("OAuth branding", () => {
  test("Codex OAuth flow uses Kilo originator but NoCowboy user-agent and branding", async () => {
    const src = await Bun.file(path.join(root, "src", "plugin", "codex.ts")).text()

    expect(src).toContain('originator: "kilo"')
    expect(src).toContain('"User-Agent": `nocowboy/${InstallationVersion}`')
    expect(src).toContain("return to NoCowboy")
    expect(src).not.toContain('originator: "opencode"')
    expect(src).not.toContain("return to OpenCode")
  })

  test("MCP OAuth callback page uses NoCowboy branding", async () => {
    const src = await Bun.file(path.join(root, "src", "mcp", "oauth-callback.ts")).text()

    expect(src).toContain("return to NoCowboy")
    expect(src).not.toContain("return to OpenCode")
  })
})
