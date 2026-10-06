import { describe, expect, it } from "bun:test"
import { EditPort } from "@/nocowboy/tool/edit-port"

class FakeIO implements EditPort.BatchIO {
  files = new Map<string, string>()
  failWrites = new Set<string>()
  writes: string[] = []
  constructor(initial: Record<string, string>) {
    for (const [k, v] of Object.entries(initial)) this.files.set(k, v)
  }
  async readText(filePath: string): Promise<string> {
    const value = this.files.get(filePath)
    if (value === undefined) throw new Error(`ENOENT: ${filePath}`)
    return value
  }
  async writeText(filePath: string, text: string): Promise<void> {
    if (this.failWrites.has(filePath)) throw new Error(`EACCES: ${filePath}`)
    this.files.set(filePath, text)
    this.writes.push(filePath)
  }
}

function plan(filePath: string, oldContent: string, newContent: string): EditPort.EditPlan {
  return { filePath, oldContent, newContent, encoding: "utf-8", bom: false }
}

async function code(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    return "no-error"
  } catch (error) {
    return error instanceof EditPort.EditError ? error.code : `unexpected:${(error as Error).message}`
  }
}

describe("EditPort.findMatch", () => {
  it("returns the offset of a unique match", () => {
    expect(EditPort.findMatch("hello world", "world", "f.txt")).toBe(6)
  })

  it("rejects a duplicate match as ambiguous", () => {
    try {
      EditPort.findMatch("hi there hi", "hi", "f.txt")
      throw new Error("should have thrown")
    } catch (error) {
      expect((error as EditPort.EditError).code).toBe("duplicate-match")
    }
  })

  it("rejects a missing match", () => {
    try {
      EditPort.findMatch("hello", "absent", "f.txt")
      throw new Error("should have thrown")
    } catch (error) {
      expect((error as EditPort.EditError).code).toBe("match-not-found")
    }
  })

  it("rejects an empty search", () => {
    try {
      EditPort.findMatch("hello", "", "f.txt")
      throw new Error("should have thrown")
    } catch (error) {
      expect((error as EditPort.EditError).code).toBe("empty-search")
    }
  })
})

describe("EditPort.applyBlocks", () => {
  it("applies blocks for one file in order, each against the previous result", () => {
    const out = EditPort.applyBlocks("x\n", [{ search: "x", replace: "y" }, { search: "y", replace: "z" }], "f.txt")
    expect(out.content).toBe("z\n")
    expect(out.replaced).toBe(2)
  })

  it("rejects when a later block becomes ambiguous after an earlier one", () => {
    try {
      EditPort.applyBlocks("A", [{ search: "A", replace: "B B" }, { search: "B", replace: "C" }], "f.txt")
      throw new Error("should have thrown")
    } catch (error) {
      expect((error as EditPort.EditError).code).toBe("duplicate-match")
    }
  })
})

describe("EditPort.commitBatch", () => {
  it("writes every plan when nothing is stale", async () => {
    const io = new FakeIO({ "a.txt": "a", "b.txt": "b" })
    await EditPort.commitBatch([plan("a.txt", "a", "A"), plan("b.txt", "b", "B")], io)
    expect(io.files.get("a.txt")).toBe("A")
    expect(io.files.get("b.txt")).toBe("B")
  })

  it("aborts on a stale read without writing anything", async () => {
    const io = new FakeIO({ "a.txt": "a", "b.txt": "b" })
    io.files.set("b.txt", "b-CHANGED")
    const c = await code(() => EditPort.commitBatch([plan("a.txt", "a", "A"), plan("b.txt", "b", "B")], io))
    expect(c).toBe("stale-read")
    expect(io.files.get("a.txt")).toBe("a")
    expect(io.files.get("b.txt")).toBe("b-CHANGED")
    expect(io.writes).toEqual([])
  })

  it("rolls back already-written files when a later write fails", async () => {
    const io = new FakeIO({ "a.txt": "a", "b.txt": "b" })
    io.failWrites.add("b.txt")
    const c = await code(() => EditPort.commitBatch([plan("a.txt", "a", "A"), plan("b.txt", "b", "B")], io))
    expect(c).toBe("write-failed")
    expect(io.files.get("a.txt")).toBe("a")
    expect(io.files.get("b.txt")).toBe("b")
    expect(io.writes).toEqual(["a.txt", "a.txt"])
  })
})
