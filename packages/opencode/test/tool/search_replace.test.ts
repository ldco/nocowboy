import { describe, expect } from "bun:test"
import path from "path"
import iconv from "iconv-lite"
import * as fs from "fs/promises"
import { Cause, Effect, Exit, Layer } from "effect"
import { SearchReplaceTool, parseSearchReplaceBlocks } from "../../src/tool/search_replace"
import { LSP } from "@/lsp/lsp"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { Format } from "../../src/format"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Truncate } from "@/tool/truncate"
import { TestInstance } from "../fixture/fixture"
import { SessionID, MessageID } from "../../src/session/schema"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    LSP.defaultLayer,
    AppFileSystem.defaultLayer,
    Format.defaultLayer,
    Bus.layer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
  ),
)

const baseCtx = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make("msg_test"),
  callID: "",
  agent: "code",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
}

type ToolCtx = typeof baseCtx & {
  ask: (input: any) => Effect.Effect<void>
}

const execute = Effect.fn("SearchReplaceToolTest.execute")(function* (params: { blocks: string }, ctx: ToolCtx) {
  const info = yield* SearchReplaceTool
  const tool = yield* info.init()
  return yield* tool.execute(params, ctx)
})

const makeCtx = () => {
  const calls: any[] = []
  const ctx: ToolCtx = {
    ...baseCtx,
    ask: (input) =>
      Effect.sync(() => {
        calls.push(input)
      }),
  }
  return { ctx, calls }
}

const readText = (filepath: string) => Effect.promise(() => fs.readFile(filepath, "utf-8"))
const writeText = (filepath: string, content: string) => Effect.promise(() => fs.writeFile(filepath, content, "utf-8"))

const expectFailure = <A, E, R>(effect: Effect.Effect<A, E, R>, message?: string) =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(effect)
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && message) expect(Cause.pretty(exit.cause)).toContain(message)
  })

describe("tool.search_replace parser", () => {
  it.live("parses a single SEARCH/REPLACE block", () =>
    Effect.gen(function* () {
      const blocks = parseSearchReplaceBlocks(`src/file.ts
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE`)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].filePath).toBe("src/file.ts")
      expect(blocks[0].search).toBe("old content")
      expect(blocks[0].replace).toBe("new content")
    }),
  )

  it.live("parses multiple SEARCH/REPLACE blocks", () =>
    Effect.gen(function* () {
      const blocks = parseSearchReplaceBlocks(`a.ts
<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE
b.ts
<<<<<<< SEARCH
baz
=======
qux
>>>>>>> REPLACE`)
      expect(blocks).toHaveLength(2)
      expect(blocks[0].filePath).toBe("a.ts")
      expect(blocks[0].search).toBe("foo")
      expect(blocks[0].replace).toBe("bar")
      expect(blocks[1].filePath).toBe("b.ts")
      expect(blocks[1].search).toBe("baz")
      expect(blocks[1].replace).toBe("qux")
    }),
  )

  it.live("parses multi-line SEARCH/REPLACE blocks", () =>
    Effect.gen(function* () {
      const blocks = parseSearchReplaceBlocks(`src/greet.ts
<<<<<<< SEARCH
function greet(name: string) {
  return \`Hello, \${name}!\`
}
=======
function greetUser(name: string) {
  return \`Hello, \${name}!\`
}
>>>>>>> REPLACE`)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].filePath).toBe("src/greet.ts")
      expect(blocks[0].search).toContain("function greet(")
      expect(blocks[0].search).toContain("return `Hello, ${name}!`")
      expect(blocks[0].replace).toContain("function greetUser(")
    }),
  )

  it.live("throws on missing file path", () =>
    Effect.gen(function* () {
      expect(() =>
        parseSearchReplaceBlocks(`<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE`),
      ).toThrow("missing file path")
    }),
  )

  it.live("throws on missing SEPARATOR", () =>
    Effect.gen(function* () {
      expect(() =>
        parseSearchReplaceBlocks(`f.ts
<<<<<<< SEARCH
foo
>>>>>>> REPLACE`),
      ).toThrow("missing =======")
    }),
  )

  it.live("throws on empty input", () =>
    Effect.gen(function* () {
      expect(() => parseSearchReplaceBlocks("")).toThrow("No valid")
    }),
  )
})

describe("tool.search_replace execution", () => {
  it.live("requires blocks", () =>
    Effect.gen(function* () {
      const { ctx } = makeCtx()
      yield* expectFailure(execute({ blocks: "" }, ctx), "blocks is required")
    }),
  )

  it.live("rejects invalid block format", () =>
    Effect.gen(function* () {
      const { ctx } = makeCtx()
      yield* expectFailure(execute({ blocks: "not a valid block" }, ctx), "search_replace verification failed")
    }),
  )

  it.instance(
    "applies single file edit",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx, calls } = makeCtx()
        const filePath = path.join(test.directory, "hello.txt")
        yield* writeText(filePath, "Hello, World!\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
Hello, World!
=======
Hello, NoCowboy!
>>>>>>> REPLACE`

        const result = yield* execute({ blocks }, ctx)

        expect(result.output).toContain("Success. Updated")
        expect(calls.length).toBe(1)
        expect(yield* readText(filePath)).toBe("Hello, NoCowboy!\n")
      }),
    { git: true },
  )

  it.instance(
    "applies multi-file edit",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx, calls } = makeCtx()
        const file1 = path.join(test.directory, "a.txt")
        const file2 = path.join(test.directory, "b.txt")
        yield* writeText(file1, "foo\n")
        yield* writeText(file2, "bar\n")

        const blocks = `${file1}
<<<<<<< SEARCH
foo
=======
FOO
>>>>>>> REPLACE
${file2}
<<<<<<< SEARCH
bar
=======
BAR
>>>>>>> REPLACE`

        const result = yield* execute({ blocks }, ctx)

        expect(result.output).toContain("Success. Updated")
        expect(calls.length).toBe(1)
        expect(yield* readText(file1)).toBe("FOO\n")
        expect(yield* readText(file2)).toBe("BAR\n")
      }),
    { git: true },
  )

  it.instance(
    "rejects edit to non-existent file",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "nonexistent.txt")

        const blocks = `${filePath}
<<<<<<< SEARCH
anything
=======
nothing
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "File not found")
      }),
    { git: true },
  )

  it.instance(
    "rejects edit when SEARCH content not found",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "existing.txt")
        yield* writeText(filePath, "This is the file content.\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
this content does not exist in the file
=======
replacement
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "Could not find SEARCH block content")
      }),
    { git: true },
  )

  it.instance(
    "edit preserves file rest",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "preserve.txt")
        yield* writeText(filePath, "line1\nline2\nline3\nline4\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
line2
=======
modified
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("line1\nmodified\nline3\nline4\n")
      }),
    { git: true },
  )
})

describe("tool.search_replace contract", () => {
  it.instance(
    "rejects an ambiguous (duplicate) SEARCH match and writes nothing",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "dupe.txt")
        yield* writeText(filePath, "foo bar\nfoo baz\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
foo
=======
qux
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "multiple matches")
        expect(yield* readText(filePath)).toBe("foo bar\nfoo baz\n")
      }),
    { git: true },
  )

  it.instance(
    "applies multiple blocks for the same file in order (each sees the previous result)",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "chain.txt")
        yield* writeText(filePath, "alpha\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
alpha
=======
beta
>>>>>>> REPLACE
${filePath}
<<<<<<< SEARCH
beta
=======
gamma
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("gamma\n")
      }),
    { git: true },
  )

  it.instance(
    "round-trips a UTF-8 BOM and CRLF line endings",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "bom-crlf.txt")
        const bom = Buffer.from([0xef, 0xbb, 0xbf])
        yield* Effect.promise(() =>
          fs.writeFile(filePath, Buffer.concat([bom, Buffer.from("line1\r\nline2\r\n", "utf-8")])),
        )

        const blocks = `${filePath}
<<<<<<< SEARCH
line1
line2
=======
LINE1
LINE2
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)

        const raw = yield* Effect.promise(() => fs.readFile(filePath))
        expect(raw.subarray(0, 3).equals(bom)).toBe(true)
        expect(raw.subarray(3).toString("utf-8")).toBe("LINE1\r\nLINE2\r\n")
      }),
    { git: true },
  )

  it.instance(
    "round-trips a legacy windows-1251 encoding",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "legacy.txt")
        const original = "Привет, мир! Это тест кириллицы.\r\n"
        yield* Effect.promise(() => fs.writeFile(filePath, iconv.encode(original, "windows-1251")))

        const blocks = `${filePath}
<<<<<<< SEARCH
Привет
=======
Пока
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)

        const raw = yield* Effect.promise(() => fs.readFile(filePath))
        expect(raw.toString("utf-8").startsWith("\uFEFF")).toBe(false)
        expect(iconv.decode(raw, "windows-1251")).toBe("Пока, мир! Это тест кириллицы.\r\n")
      }),
    { git: true },
  )

  it.instance(
    "aborts on a stale read without writing a half batch",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const fileA = path.join(test.directory, "a.txt")
        const fileB = path.join(test.directory, "b.txt")
        yield* writeText(fileA, "aaa\n")
        yield* writeText(fileB, "bbb\n")

        // The permission prompt is the window between read and write: mutate B
        // there to simulate a concurrent change (stale read).
        const ctx: ToolCtx = {
          ...baseCtx,
          ask: () => Effect.promise(() => fs.writeFile(fileB, "bbb-CHANGED\n", "utf-8")),
        }

        const blocks = `${fileA}
<<<<<<< SEARCH
aaa
=======
AAA
>>>>>>> REPLACE
${fileB}
<<<<<<< SEARCH
bbb
=======
BBB
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "stale read")
        expect(yield* readText(fileA)).toBe("aaa\n")
        expect(yield* readText(fileB)).toBe("bbb-CHANGED\n")
      }),
    { git: true },
  )
})
