import { describe, it, expect } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

// Derived from the test file location, not an absolute machine path: the repo
// must keep working after being moved or cloned anywhere.
const PROJECT_DIR = resolve(import.meta.dir, "../../../../..")

describe("NUTAUSIK initialization", () => {
  it("has .nutausik directory with database", () => {
    const dbPath = resolve(PROJECT_DIR, ".nutausik", "nutausik.db")
    expect(existsSync(dbPath)).toBe(true)
  })

  it("has config.json in .nutausik", () => {
    const configPath = resolve(PROJECT_DIR, ".nutausik", "config.json")
    expect(existsSync(configPath)).toBe(true)
    const config = JSON.parse(readFileSync(configPath, "utf-8"))
    expect(config.project).toBe("NoCowboy")
    expect(config.version).toBe(1)
  })
})

describe("nocowboy.json project config", () => {
  it("parses without legacy tui keys that rejected the whole file", () => {
    const configPath = resolve(PROJECT_DIR, "nocowboy.json")
    expect(existsSync(configPath)).toBe(true)
    const config = JSON.parse(readFileSync(configPath, "utf-8"))
    // `settings`/`shortcuts` are not part of the v0.11 config schema; topLevelExtraKeys
    // rejected the file with ConfigInvalidError so NOTHING in it applied (incl. remote MCP).
    expect(config.settings).toBeUndefined()
    expect(config.shortcuts).toBeUndefined()
  })

  it("does not shadow globally-managed MCP servers with dead remote entries", () => {
    const configPath = resolve(PROJECT_DIR, "nocowboy.json")
    const config = JSON.parse(readFileSync(configPath, "utf-8"))
    // MCP servers (incl. nutausik on 9210) are managed in the global config
    // (~/.config/nocowboy/nocowboy.jsonc). Project-level remote entries conflicted with
    // lifecycle port assignments and were never applied while the file was rejected —
    // keep the project config free of an mcp section.
    expect(config.mcp).toBeUndefined()
  })
})

describe("NutausikDot component check", () => {
  it("NUTAUSIK init check logic works", () => {
    // Simulate what NutausikDot does: check .nutausik/nutausik.db
    const dbPath = resolve(PROJECT_DIR, ".nutausik", "nutausik.db")
    const initialized = existsSync(dbPath)
    expect(initialized).toBe(true)
  })
})
