import { describe, expect, test } from "bun:test"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { MODULE_SCOPE, parseCallEdgesForFile, parseDefinitionsForFile } from "../../../src/tree-sitter/ast"

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ast-extract-"))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content)
  }
  return dir
}

const TS = `export function greet(name: string) {
  return format(name)
}

export class Service {
  run() {
    greet("x")
  }
}
`

describe("parseDefinitionsForFile", () => {
  test("returns structured TS definitions at their real lines", async () => {
    const dir = await fixture({ "sample.ts": TS })
    const defs = await parseDefinitionsForFile(join(dir, "sample.ts"))

    expect(defs).toContainEqual({ name: "greet", kind: "function", line: 1 })
    expect(defs).toContainEqual({ name: "Service", kind: "class", line: 5 })
    expect(defs).toContainEqual({ name: "run", kind: "method", line: 6 })
    // Sorted by line.
    expect(defs.map((d) => d.line)).toEqual([...defs.map((d) => d.line)].sort((a, b) => a - b))
    for (const def of defs) {
      expect(typeof def.name).toBe("string")
      expect(def.name.length).toBeGreaterThan(0)
      expect(def.line).toBeGreaterThan(0)
    }
  })

  test("returns structured JS definitions", async () => {
    const dir = await fixture({ "sample.js": "export function hello() {\n  return world()\n}\n" })
    const defs = await parseDefinitionsForFile(join(dir, "sample.js"))
    expect(defs).toContainEqual({ name: "hello", kind: "function", line: 1 })
  })

  test("an unsupported extension yields [] without throwing", async () => {
    const dir = await fixture({ "notes.txt": "not source" })
    expect(await parseDefinitionsForFile(join(dir, "notes.txt"))).toEqual([])
    expect(await parseDefinitionsForFile(join(dir, "missing.ts"))).toEqual([])
  })
})

describe("parseCallEdgesForFile", () => {
  test("finds calls and attributes them to the enclosing definition", async () => {
    const dir = await fixture({ "sample.ts": TS })
    const edges = await parseCallEdgesForFile(join(dir, "sample.ts"))

    expect(edges).toContainEqual({ from: "greet", to: "format", line: 2 })
    expect(edges).toContainEqual({ from: "run", to: "greet", line: 7 })
  })

  test("attributes a top-level call to module scope", async () => {
    const dir = await fixture({ "entry.ts": "boot()\n" })
    expect(await parseCallEdgesForFile(join(dir, "entry.ts"))).toContainEqual({
      from: MODULE_SCOPE,
      to: "boot",
      line: 1,
    })
  })

  test("captures member calls and an unsupported file yields []", async () => {
    const dir = await fixture({ "m.ts": "export function a() {\n  return service.run()\n}\n", "x.md": "# hi\n" })
    expect(await parseCallEdgesForFile(join(dir, "m.ts"))).toContainEqual({ from: "a", to: "run", line: 2 })
    expect(await parseCallEdgesForFile(join(dir, "x.md"))).toEqual([])
  })
})
