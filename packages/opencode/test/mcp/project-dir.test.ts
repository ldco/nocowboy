import { describe, expect, test } from "bun:test"
import { withProjectDir } from "../../src/mcp/index"

// One NUTAUSIK MCP server is shared by every instance, so each call must carry
// the project it belongs to; otherwise a session working on project A reads and
// writes project B's database.
describe("withProjectDir", () => {
  test("attaches the directory for a project-scoped server", () => {
    expect(withProjectDir("nutausik", undefined, "/repo/a")).toEqual({ projectDir: "/repo/a" })
    expect(withProjectDir("nutausik", { last: 10 }, "/repo/a")).toEqual({ last: 10, projectDir: "/repo/a" })
  })

  test("leaves other servers untouched", () => {
    expect(withProjectDir("puppetmaster", { x: 1 }, "/repo/a")).toEqual({ x: 1 })
  })

  test("a caller-supplied projectDir wins", () => {
    expect(withProjectDir("nutausik", { projectDir: "/repo/b" }, "/repo/a")).toEqual({ projectDir: "/repo/b" })
  })

  test("no directory means no injection", () => {
    expect(withProjectDir("nutausik", { last: 1 }, undefined)).toEqual({ last: 1 })
  })

  test("does not mutate the input arguments", () => {
    const args = { last: 1 }
    withProjectDir("nutausik", args, "/repo/a")
    expect(args).toEqual({ last: 1 })
  })
})
