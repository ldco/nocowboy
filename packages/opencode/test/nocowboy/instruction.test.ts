// kilocode_change - new file
import { describe, expect } from "bun:test"
import path from "path"
import { Effect, FileSystem, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { NodeFileSystem } from "@effect/platform-node"
import { CrossSpawnSpawner } from "@nocowboy/core/cross-spawn-spawner"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { Reference } from "../../src/reference/reference"
import { Instruction } from "../../src/session/instruction"
import { Global } from "@nocowboy/core/global"
import { TestConfig } from "../fixture/config"
import { provideInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const reference = Layer.mock(Reference.Service)({
  init: () => Effect.void,
  list: () => Effect.succeed([]),
  get: () => Effect.succeed(undefined),
  ensure: () => Effect.void,
  contains: () => Effect.succeed(false),
})
const it = testEffect(
  Layer.mergeAll(CrossSpawnSpawner.defaultLayer, NodeFileSystem.layer, reference, RuntimeFlags.layer()),
)

const configLayer = TestConfig.layer()

const instructionLayer = (global: Partial<Global.Interface>, config = configLayer) =>
  Instruction.layer.pipe(
    Layer.provide(config),
    Layer.provide(AppFileSystem.defaultLayer),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Global.layerWith(global)),
  )

const provideInstruction =
  (global: Partial<Global.Interface>, config = configLayer) =>
  <A, E, R>(self: Effect.Effect<A, E, R>) =>
    self.pipe(Effect.provide(instructionLayer(global, config)))

const write = (filepath: string, content: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.makeDirectory(path.dirname(filepath), { recursive: true })
    yield* fs.writeFileString(filepath, content)
  })

const writeFiles = (dir: string, files: Record<string, string>) =>
  Effect.all(
    Object.entries(files).map(([file, content]) => write(path.join(dir, file), content)),
    { discard: true },
  )

const tmpWithFiles = (files: Record<string, string>) =>
  Effect.gen(function* () {
    const dir = yield* tmpdirScoped()
    yield* writeFiles(dir, files)
    return dir
  })

const withConfigDir =
  (value: string | undefined) =>
  <A, E, R>(self: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const original = process.env["NOCOWBOY_CONFIG_DIR"]
      if (value === undefined) delete process.env["NOCOWBOY_CONFIG_DIR"]
      else process.env["NOCOWBOY_CONFIG_DIR"] = value
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (original === undefined) delete process.env["NOCOWBOY_CONFIG_DIR"]
          else process.env["NOCOWBOY_CONFIG_DIR"] = original
        }),
      )
      return yield* self
    })

describe("Instruction.systemPaths NOCOWBOY_CONFIG_DIR profile fallback", () => {
  it.live("prefers NOCOWBOY_CONFIG_DIR AGENTS.md over global when both exist", () =>
    Effect.gen(function* () {
      const profileTmp = yield* tmpWithFiles({ "AGENTS.md": "# Profile Instructions" })
      const globalTmp = yield* tmpWithFiles({ "AGENTS.md": "# Global Instructions" })
      const projectTmp = yield* tmpdirScoped()

      yield* Effect.gen(function* () {
        const svc = yield* Instruction.Service
        const paths = yield* svc.systemPaths()
        expect(paths.has(path.join(profileTmp, "AGENTS.md"))).toBe(true)
        expect(paths.has(path.join(globalTmp, "AGENTS.md"))).toBe(false)
      }).pipe(
        provideInstance(projectTmp),
        provideInstruction({ home: globalTmp, config: globalTmp }),
        withConfigDir(profileTmp),
      )
    }),
  )

  it.live("falls back to global AGENTS.md when NOCOWBOY_CONFIG_DIR has no AGENTS.md", () =>
    Effect.gen(function* () {
      const profileTmp = yield* tmpdirScoped()
      const globalTmp = yield* tmpWithFiles({ "AGENTS.md": "# Global Instructions" })
      const projectTmp = yield* tmpdirScoped()

      yield* Effect.gen(function* () {
        const svc = yield* Instruction.Service
        const paths = yield* svc.systemPaths()
        expect(paths.has(path.join(profileTmp, "AGENTS.md"))).toBe(false)
        expect(paths.has(path.join(globalTmp, "AGENTS.md"))).toBe(true)
      }).pipe(
        provideInstance(projectTmp),
        provideInstruction({ home: globalTmp, config: globalTmp }),
        withConfigDir(profileTmp),
      )
    }),
  )

  it.live("uses global AGENTS.md when NOCOWBOY_CONFIG_DIR is not set", () =>
    Effect.gen(function* () {
      const globalTmp = yield* tmpWithFiles({ "AGENTS.md": "# Global Instructions" })
      const projectTmp = yield* tmpdirScoped()

      yield* Effect.gen(function* () {
        const svc = yield* Instruction.Service
        const paths = yield* svc.systemPaths()
        expect(paths.has(path.join(globalTmp, "AGENTS.md"))).toBe(true)
      }).pipe(
        provideInstance(projectTmp),
        provideInstruction({ home: globalTmp, config: globalTmp }),
        withConfigDir(undefined),
      )
    }),
  )
})

describe("Instruction agent-scoped rules", () => {
  it.live("injects soul rules for nocowboy only, shared rules for everyone", () =>
    Effect.gen(function* () {
      const projectTmp = yield* tmpWithFiles({
        ".nocowboy/rules-nocowboy/soul.md": "# Soul\nhttp://127.0.0.1:9339",
        ".nocowboy/rules/shared.md": "# Shared rules",
      })
      const isolatedHome = yield* tmpdirScoped()
      const shared = path.join(projectTmp, ".nocowboy", "rules", "shared.md")
      // Global instructions (what every agent is built from) carry the shared rule.
      const config = TestConfig.layer({ get: () => Effect.succeed({ instructions: [shared] }) })

      yield* Effect.gen(function* () {
        const svc = yield* Instruction.Service

        const nocowboy = (yield* svc.system("nocowboy")).join("\n")
        expect(nocowboy).toContain("9339")
        expect(nocowboy).toContain("# Shared rules")

        for (const agent of ["auto", "worker", "reviewer", "architect", "planner"]) {
          const other = (yield* svc.system(agent)).join("\n")
          expect(other).not.toContain("9339")
          expect(other).toContain("# Shared rules")
        }
      }).pipe(
        provideInstance(projectTmp),
        provideInstruction({ home: isolatedHome, config: isolatedHome }, config),
        withConfigDir(undefined),
      )
    }),
  )
})
