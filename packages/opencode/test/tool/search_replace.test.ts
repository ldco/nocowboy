import { describe, expect, test } from "bun:test"
import path from "path"
import * as fs from "fs/promises"
import { Cause, Effect, Exit, Layer } from "effect"
import { SearchReplaceTool, parseSearchReplaceBlocks, findUniqueIndex } from "../../src/tool/search_replace"
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

describe("findUniqueIndex", () => {
  test("returns the offset of a unique match", () => {
    expect(findUniqueIndex("abc", "b", "f")).toBe(1)
  })
  test("throws when the search text is not present", () => {
    expect(() => findUniqueIndex("abc", "z", "f")).toThrow("Could not find SEARCH block content")
  })
  test("throws when the search text is ambiguous", () => {
    expect(() => findUniqueIndex("foo\nfoo\n", "foo", "f")).toThrow("ambiguous")
  })
  test("flags overlapping occurrences as ambiguous", () => {
    expect(() => findUniqueIndex("aaa", "aa", "f")).toThrow("ambiguous")
  })
  test("accepts an overlapping-adjacent single occurrence", () => {
    expect(findUniqueIndex("xax", "a", "f")).toBe(1)
  })
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

  it.instance(
    "rejects an ambiguous (duplicate) match",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "dup.txt")
        yield* writeText(filePath, "foo\nfoo\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "ambiguous")
        expect(yield* readText(filePath)).toBe("foo\nfoo\n")
      }),
    { git: true },
  )

  it.instance(
    "applies multiple blocks of one file sequentially",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "multi.txt")
        yield* writeText(filePath, "a\nb\nc\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
a
=======
A
>>>>>>> REPLACE
${filePath}
<<<<<<< SEARCH
c
=======
C
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("A\nb\nC\n")
      }),
    { git: true },
  )

  it.instance(
    "a later block sees the earlier block's output (no stale read)",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "chain.txt")
        yield* writeText(filePath, "X\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
X
=======
Y
>>>>>>> REPLACE
${filePath}
<<<<<<< SEARCH
Y
=======
Z
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("Z\n")
      }),
    { git: true },
  )

  it.instance(
    "leaves no partial state when a later block fails",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "partial.txt")
        yield* writeText(filePath, "one\ntwo\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
one
=======
ONE
>>>>>>> REPLACE
${filePath}
<<<<<<< SEARCH
this is not present
=======
whatever
>>>>>>> REPLACE`

        yield* expectFailure(execute({ blocks }, ctx), "Could not find SEARCH block content")
        // The first block was resolved but never written: no half-applied file.
        expect(yield* readText(filePath)).toBe("one\ntwo\n")
      }),
    { git: true },
  )

  it.instance(
    "preserves CRLF line endings (single block)",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "crlf.txt")
        yield* writeText(filePath, "line1\r\nline2\r\nline3\r\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
line2
=======
LINE2
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("line1\r\nLINE2\r\nline3\r\n")
      }),
    { git: true },
  )

  it.instance(
    "preserves CRLF line endings across a multi-block batch",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "crlf-batch.txt")
        yield* writeText(filePath, "a\r\nb\r\nc\r\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
a
=======
A
>>>>>>> REPLACE
${filePath}
<<<<<<< SEARCH
c
=======
C
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("A\r\nb\r\nC\r\n")
      }),
    { git: true },
  )

  it.instance(
    "groups two spellings of the same path (no stale double write)",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const { ctx } = makeCtx()
        const filePath = path.join(test.directory, "same.txt")
        const dotted = `${test.directory}/./same.txt`
        yield* writeText(filePath, "x\ny\n")

        const blocks = `${filePath}
<<<<<<< SEARCH
x
=======
X
>>>>>>> REPLACE
${dotted}
<<<<<<< SEARCH
y
=======
Y
>>>>>>> REPLACE`

        yield* execute({ blocks }, ctx)
        expect(yield* readText(filePath)).toBe("X\nY\n")
      }),
    { git: true },
  )
})
