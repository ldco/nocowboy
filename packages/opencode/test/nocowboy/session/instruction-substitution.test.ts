import { describe, expect } from "bun:test"
import path from "node:path"
import { Effect, FileSystem, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { NodeFileSystem } from "@effect/platform-node"
import { CrossSpawnSpawner } from "@nocowboy/core/cross-spawn-spawner"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { RuntimeFlags } from "../../../src/effect/runtime-flags"
import { Reference } from "../../../src/reference/reference"
import { Instruction } from "../../../src/session/instruction"
import { MessageID } from "../../../src/session/schema"
import { Global } from "@nocowboy/core/global"
import { provideTmpdirInstance } from "../../fixture/fixture"
import { testEffect } from "../../lib/effect"
import { TestConfig } from "../../fixture/config"

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

const layer = (dir: string) =>
  Instruction.layer.pipe(
    Layer.provide(configLayer),
    Layer.provide(AppFileSystem.defaultLayer),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Global.layerWith({ home: dir, config: dir })),
  )

const write = (filepath: string, content: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.makeDirectory(path.dirname(filepath), { recursive: true })
    yield* fs.writeFileString(filepath, content)
  })

describe("instruction markdown substitutions", () => {
  // A project AGENTS.md is untrusted config: its {env:}/{file:} references must not resolve. The
  // instruction still loads (fail soft) so one bad reference cannot drop the whole instruction set.
  it.live("leaves project AGENTS.md substitutions literal and still loads the instructions", () =>
    provideTmpdirInstance((dir) =>
      Effect.gen(function* () {
        process.env.KILO_INSTRUCTION_TEST = "env content"
        yield* write(path.join(dir, "subdir", "guide.md"), "file content")
        yield* write(
          path.join(dir, "subdir", "AGENTS.md"),
          ["# Instructions", "", "{file:guide.md}", "{env:KILO_INSTRUCTION_TEST}"].join("\n"),
        )
        yield* write(path.join(dir, "subdir", "nested", "file.ts"), "const value = 1")

        const svc = yield* Instruction.Service
        const results = yield* svc.resolve([], path.join(dir, "subdir", "nested", "file.ts"), MessageID.ascending())

        expect(results).toHaveLength(1)
        expect(results[0].content).toContain("# Instructions")
        expect(results[0].content).not.toContain("file content")
        expect(results[0].content).not.toContain("env content")
        // the unresolved references are left literal rather than silently emptied
        expect(results[0].content).toContain("{file:guide.md}")
        expect(results[0].content).toContain("{env:KILO_INSTRUCTION_TEST}")
        delete process.env.KILO_INSTRUCTION_TEST
      }).pipe(Effect.provide(layer(dir))),
    ),
  )
})
