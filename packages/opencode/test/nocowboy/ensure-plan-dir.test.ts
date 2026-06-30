import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { NoCowboySessionPrompt } from "../../src/nocowboy/session/prompt"
import { tmpdir } from "../fixture/fixture"

describe("NoCowboySessionPrompt.ensurePlanDir", () => {
  test("creates a missing plan directory", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, ".kilo", "plans")
    await NoCowboySessionPrompt.ensurePlanDir(dir)
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })

  test("is idempotent when the directory already exists", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, ".kilo", "plans")
    await fs.mkdir(dir, { recursive: true })
    await expect(NoCowboySessionPrompt.ensurePlanDir(dir)).resolves.toBeUndefined()
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })

  test("creates intermediate parent directories", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, "deep", "nested", ".kilo", "plans")
    await NoCowboySessionPrompt.ensurePlanDir(dir)
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })
})
