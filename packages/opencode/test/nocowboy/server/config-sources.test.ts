import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { Flag } from "@opencode-ai/core/flag/flag"
import * as Log from "@opencode-ai/core/util/log"
import { Server } from "../../../src/server/server"
import { resetDatabase } from "../../fixture/db"
import { disposeAllInstances, tmpdir } from "../../fixture/fixture"

void Log.init({ print: false })

type Source = {
  order: number
  kind: string
  scope: string
  label: string
  source: string
  path?: string
  exists: boolean
  editable: boolean
  reason?: string
}

type Body = {
  sources: Source[]
}

const env = {
  NOCOWBOY_CONFIG: process.env.NOCOWBOY_CONFIG,
  NOCOWBOY_CONFIG_CONTENT: process.env.NOCOWBOY_CONFIG_CONTENT,
  NOCOWBOY_CONFIG_DIR: process.env.NOCOWBOY_CONFIG_DIR,
  KILO_DISABLE_PROJECT_CONFIG: process.env.KILO_DISABLE_PROJECT_CONFIG,
  NOCOWBOY_TEST_MANAGED_CONFIG_DIR: process.env.NOCOWBOY_TEST_MANAGED_CONFIG_DIR,
  flagConfig: Flag.NOCOWBOY_CONFIG,
}

afterEach(async () => {
  restore()
  await disposeAllInstances()
  await resetDatabase()
})

function restore() {
  set("NOCOWBOY_CONFIG", env.NOCOWBOY_CONFIG)
  set("NOCOWBOY_CONFIG_CONTENT", env.NOCOWBOY_CONFIG_CONTENT)
  set("NOCOWBOY_CONFIG_DIR", env.NOCOWBOY_CONFIG_DIR)
  set("KILO_DISABLE_PROJECT_CONFIG", env.KILO_DISABLE_PROJECT_CONFIG)
  set("NOCOWBOY_TEST_MANAGED_CONFIG_DIR", env.NOCOWBOY_TEST_MANAGED_CONFIG_DIR)
  Flag.NOCOWBOY_CONFIG = env.flagConfig
}

function set(key: keyof typeof process.env, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

async function sources(dir: string) {
  const response = await Server.Default().app.request("/config/sources", {
    headers: { "x-nocowboy-directory": dir },
  })
  expect(response.status).toBe(200)
  return (await response.json()) as Body
}

function order(body: Body, file: string) {
  const hit = body.sources.find((source) => source.path === file)
  expect(hit).toBeDefined()
  return hit!.order
}

describe("config source routes", () => {
  test("lists source metadata in load order without config contents", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "env.json"), "{}")
        await Bun.write(path.join(dir, "nocowboy.json"), "{}")

        const local = path.join(dir, ".nocowboy")
        await fs.mkdir(local, { recursive: true })
        await Bun.write(path.join(local, "nocowboy.jsonc"), "{}")

        const extra = path.join(dir, "extra")
        await fs.mkdir(extra, { recursive: true })
        await Bun.write(path.join(extra, "nocowboy.json"), "{}")

        const managed = path.join(dir, "managed")
        await fs.mkdir(managed, { recursive: true })
        await Bun.write(path.join(managed, "nocowboy.json"), "{}")
      },
    })

    const envFile = path.join(tmp.path, "env.json")
    const projectFile = path.join(tmp.path, "nocowboy.json")
    const configFile = path.join(tmp.path, ".nocowboy", "nocowboy.jsonc")
    const extraFile = path.join(tmp.path, "extra", "nocowboy.json")
    const managedFile = path.join(tmp.path, "managed", "nocowboy.json")

    process.env.NOCOWBOY_CONFIG = envFile
    Flag.NOCOWBOY_CONFIG = envFile
    process.env.NOCOWBOY_CONFIG_CONTENT = '{"username":"secret-inline-value"}'
    process.env.NOCOWBOY_CONFIG_DIR = path.join(tmp.path, "extra")
    process.env.NOCOWBOY_TEST_MANAGED_CONFIG_DIR = path.join(tmp.path, "managed")

    const body = await sources(tmp.path)
    const inline = body.sources.find((source) => source.source === "NOCOWBOY_CONFIG_CONTENT")

    expect(order(body, envFile)).toBeLessThan(order(body, projectFile))
    expect(order(body, projectFile)).toBeLessThan(order(body, configFile))
    expect(order(body, configFile)).toBeLessThan(order(body, extraFile))
    expect(inline?.order).toBeGreaterThan(order(body, extraFile))
    expect(inline?.order).toBeLessThan(order(body, managedFile))

    expect(body.sources.find((source) => source.path === configFile)).toMatchObject({
      kind: "config-dir-file",
      scope: "project",
      exists: true,
      editable: true,
    })
    expect(body.sources.find((source) => source.path === managedFile)).toMatchObject({
      kind: "managed-file",
      scope: "managed",
      exists: true,
      editable: false,
    })
    expect(JSON.stringify(body)).not.toContain("secret-inline-value")
  })

  test("shows project config disabled by environment", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "nocowboy.json"), "{}")
        await fs.mkdir(path.join(dir, ".nocowboy"), { recursive: true })
        await Bun.write(path.join(dir, ".nocowboy", "nocowboy.json"), "{}")
      },
    })

    process.env.KILO_DISABLE_PROJECT_CONFIG = "1"

    const body = await sources(tmp.path)

    expect(body.sources.some((source) => source.path === path.join(tmp.path, "nocowboy.json"))).toBe(false)
    expect(body.sources.some((source) => source.path === path.join(tmp.path, ".nocowboy", "nocowboy.json"))).toBe(false)
    expect(body.sources.find((source) => source.source === "KILO_DISABLE_PROJECT_CONFIG")).toMatchObject({
      kind: "runtime-env",
      scope: "env",
      exists: true,
      editable: false,
    })
  })
})
