import { describe, expect, it } from "bun:test"
import { mcpServerPort, MCP_BASE_PORT } from "@/nocowboy/mcp/ports"

// nocowboy_change: `mcp start [name]` must (re)start a server on its configured
// port. It used `9200 + results.length`, so a single named start bound the
// server to 9200 regardless of its name while clients dialled the configured
// url — nutausik landed on plugin-registry's port.
describe("mcpServerPort", () => {
  const allNames = ["plugin-registry", "context7", "sqlite", "puppeteer", "nutausik", "git"]

  it("prefers the server's configured url port (authoritative)", () => {
    expect(mcpServerPort("nutausik", { type: "remote", url: "http://127.0.0.1:9210/mcp" }, allNames)).toBe(9210)
  })

  it("falls back to config index for a local (stdio) server without a url", () => {
    // index 0 -> 9200, index 4 -> 9204
    expect(mcpServerPort("plugin-registry", { type: "local", command: ["bun", "x"] }, allNames)).toBe(MCP_BASE_PORT)
    expect(mcpServerPort("nutausik", { type: "local", command: ["bun", "x"] }, allNames)).toBe(MCP_BASE_PORT + 4)
  })

  it("does not collapse every single-server start onto 9200", () => {
    // The regression: starting just `nutausik` returned 9200. It must be its own port.
    expect(mcpServerPort("nutausik", { type: "local", command: ["bun", "x"] }, allNames)).not.toBe(MCP_BASE_PORT)
  })

  it("falls back when the url has no explicit port", () => {
    expect(mcpServerPort("git", { type: "remote", url: "http://127.0.0.1/mcp" }, allNames)).toBe(MCP_BASE_PORT + 5)
  })

  it("appends past the configured list for an unknown name", () => {
    expect(mcpServerPort("brand-new", undefined, allNames)).toBe(MCP_BASE_PORT + allNames.length)
  })
})
