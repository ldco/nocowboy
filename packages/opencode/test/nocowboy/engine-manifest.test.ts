import { describe, expect, it } from "bun:test"
import { readFileSync } from "fs"
import path from "path"

const root = path.resolve(import.meta.dir, "../../../..")
const manifest = JSON.parse(readFileSync(path.join(root, "engine-manifest.json"), "utf-8"))

describe("engine-manifest", () => {
  it("records the engine SHA, the declared Kilo fork and provenance confidence", () => {
    expect(manifest.engine.nocowboy_sha).toMatch(/^[0-9a-f]{40}$/)
    expect(manifest.engine.root_commit).toMatch(/^[0-9a-f]{40}$/)
    expect(manifest.fork_of.name).toBe("Kilo Code")
    expect(manifest.fork_of.tag).toBe("v7.3.46")
    expect(manifest.fork_of.sha).toMatch(/^[0-9a-f]{40}$/)
    expect(["chain", "snapshot", "unknown"]).toContain(manifest.provenance.confidence)
    expect(typeof manifest.provenance.basis).toBe("string")
  })

  it("records the engine-defining dependency versions", () => {
    expect(manifest.dependencies.opentui_core).toBeTruthy()
    expect(manifest.dependencies.opentui_solid).toBeTruthy()
    expect(manifest.dependencies.ai_sdk).toBeTruthy()
    expect(manifest.dependencies.mcp_sdk).toBeTruthy()
  })

  it("lists the tracked upstream backports", () => {
    expect(Array.isArray(manifest.upstream_backports)).toBe(true)
    expect(manifest.upstream_backports.length).toBeGreaterThan(0)
    expect(manifest.upstream_backports.every((b: { id?: unknown }) => typeof b.id === "string")).toBe(true)
  })

  it("--check passes against the committed file", () => {
    const result = Bun.spawnSync(["bun", "run", "scripts/engine-manifest.ts", "--check"], { cwd: root })
    expect(result.exitCode).toBe(0)
  })
})
