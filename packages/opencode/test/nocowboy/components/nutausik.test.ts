import { describe, it, expect } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const PROJECT_DIR = "/run/media/ldco/3734114f-7123-41f5-8f63-7f43c94879eb/NEW_ORDER/FABRICA22/NoCowboy/app"

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

describe("nocowboy.json NUTAUSIK config", () => {
  it("points nutausik to correct port (9204)", () => {
    const configPath = resolve(PROJECT_DIR, "nocowboy.json")
    expect(existsSync(configPath)).toBe(true)
    const config = JSON.parse(readFileSync(configPath, "utf-8"))
    const nutausikMcp = config.mcp?.nutausik
    expect(nutausikMcp).toBeDefined()
    expect(nutausikMcp.url).toContain(":9204/")
    expect(nutausikMcp.enabled).toBe(true)
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
