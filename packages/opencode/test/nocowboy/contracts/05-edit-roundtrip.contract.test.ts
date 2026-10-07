/**
 * Migration contract — edit round-trip and match safety.
 *
 * duplicate/batch/stale/partial are enforced by the pure EditPort; the encoding
 * primitives preserve a UTF-8 BOM, CRLF and a legacy (windows-1251) encoding.
 */
import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import iconv from "iconv-lite"
import { EditPort } from "@/nocowboy/tool/edit-port"
import * as Encoding from "@/nocowboy/encoding"
import * as Bom from "@/util/bom"

class FakeIO implements EditPort.BatchIO {
  files = new Map<string, string>()
  fail = new Set<string>()
  async readText(p: string) {
    const v = this.files.get(p)
    if (v === undefined) throw new Error("ENOENT")
    return v
  }
  async writeText(p: string, text: string) {
    if (this.fail.has(p)) throw new Error("EACCES")
    this.files.set(p, text)
  }
}
const plan = (filePath: string, oldContent: string, newContent: string): EditPort.EditPlan => ({
  filePath,
  oldContent,
  newContent,
  encoding: "utf-8",
  bom: false,
})
const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
    return "ok"
  } catch (e) {
    return e instanceof EditPort.EditError ? e.code : "unexpected"
  }
}

describe("edit match/batch/stale/partial", () => {
  test("duplicate match is rejected", () => {
    try {
      EditPort.findMatch("a a", "a", "f")
      throw new Error("no throw")
    } catch (e) {
      expect((e as EditPort.EditError).code).toBe("duplicate-match")
    }
  })
  test("blocks for one file apply in order", () => {
    const out = EditPort.applyBlocks("x", [{ search: "x", replace: "y" }, { search: "y", replace: "z" }], "f")
    expect(out.content).toBe("z")
  })
  test("stale read writes nothing; partial write rolls back", async () => {
    const io = new FakeIO()
    io.files.set("a", "a")
    io.files.set("b", "b")
    io.files.set("b", "b-CHANGED")
    expect(await codeOf(() => EditPort.commitBatch([plan("a", "a", "A")], io))).toBe("ok")
    expect(await codeOf(() => EditPort.commitBatch([plan("a", "A", "AA"), plan("b", "b", "B")], io))).toBe("stale-read")
    expect(io.files.get("a")).toBe("A")

    const io2 = new FakeIO()
    io2.files.set("a", "a")
    io2.files.set("b", "b")
    io2.fail.add("b")
    expect(await codeOf(() => EditPort.commitBatch([plan("a", "a", "A"), plan("b", "b", "B")], io2))).toBe("write-failed")
    expect(io2.files.get("a")).toBe("a")
  })
})

describe("encoding round-trip", () => {
  const dir = mkdtempSync(join(tmpdir(), "contract-enc-"))

  test("UTF-8 BOM and CRLF survive a read/write cycle", async () => {
    const file = join(dir, "bom.txt")
    writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("a\r\nb\r\n", "utf-8")]))
    const read = await Encoding.read(file)
    expect(Bom.split(read.text).text).toBe("a\r\nb\r\n")
    await Encoding.write(file, read.text, read.encoding)
    const raw = readFileSync(file)
    expect(raw.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(true)
    expect(raw.subarray(3).toString("utf-8")).toBe("a\r\nb\r\n")
  })

  test("a legacy windows-1251 encoding round-trips", async () => {
    const file = join(dir, "legacy.txt")
    const original = "Привет, мир! Это тест кириллицы.\r\n"
    writeFileSync(file, iconv.encode(original, "windows-1251"))
    const read = await Encoding.read(file)
    expect(read.encoding).toBe("windows-1251")
    await Encoding.write(file, read.text, read.encoding)
    expect(iconv.decode(readFileSync(file), "windows-1251")).toBe(original)
  })
})
