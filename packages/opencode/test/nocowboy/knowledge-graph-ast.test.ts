import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseDefinitionsForFile } from "@nocowboy/indexing"
import { AstGraphProvider, buildAstGraph } from "@/nocowboy/knowledge-graph/ast"
import type { GraphProvider } from "@/nocowboy/knowledge-graph"

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ast-graph-"))
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path)
    mkdirSync(join(full, ".."), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

const FIXTURE = {
  "a.ts": "export function aHelper() {\n  return 1\n}\n\nexport function aCaller() {\n  return aHelper()\n}\n",
  "b.ts": "export function bCaller() {\n  return orphan()\n}\n",
  "c.ts": "export function orphan() {\n  return 42\n}\n",
  "d.ts": "export function dup() {\n  return 1\n}\n",
  "e.ts": "export function dup() {\n  return 2\n}\n",
  "f.ts": "export function f() {\n  return dup()\n}\n",
  "dep.ts": "export const dep = 1\n",
  "mid.ts": 'import { dep } from "./dep"\nexport const mid = dep\n',
  "top.ts": 'import { mid } from "./mid"\nexport const top = mid\n',
}

describe("AC1 — structured definitions from tree-sitter", () => {
  test("parseDefinitionsForFile yields {name,kind,line}[] for TS at real lines", async () => {
    const root = project({ "sample.ts": "export class Service {\n  run() {\n    return 1\n  }\n}\n\nexport function greet() {\n  return 2\n}\n" })
    const defs = await parseDefinitionsForFile(join(root, "sample.ts"))

    expect(defs).toContainEqual({ name: "Service", kind: "class", line: 1 })
    expect(defs).toContainEqual({ name: "run", kind: "method", line: 2 })
    expect(defs).toContainEqual({ name: "greet", kind: "function", line: 7 })
    for (const def of defs) {
      expect(typeof def.name).toBe("string")
      expect(typeof def.kind).toBe("string")
      expect(def.line).toBeGreaterThan(0)
    }
  })
})

describe("AC2 — call edges carry honest confidence", () => {
  test("a local call resolves exact; a lone call elsewhere resolves heuristic", async () => {
    const snapshot = await buildAstGraph(project(FIXTURE))
    const calls = snapshot.edges.filter((edge) => edge.kind === "call")

    expect(calls).toContainEqual({ from: "a.ts#aCaller", to: "a.ts#aHelper", kind: "call", confidence: "exact" })
    expect(calls).toContainEqual({ from: "b.ts#bCaller", to: "c.ts#orphan", kind: "call", confidence: "heuristic" })
    for (const edge of calls) expect(["exact", "heuristic"]).toContain(edge.confidence)
  })

  test("an ambiguous callee is dropped, not guessed", async () => {
    const snapshot = await buildAstGraph(project(FIXTURE))
    const calls = snapshot.edges.filter((edge) => edge.kind === "call")
    // `dup` is declared in d.ts and e.ts and imported nowhere → unresolved.
    expect(calls.some((edge) => edge.to.endsWith("#dup"))).toBe(false)
  })

  test("contains edges link each file to its symbols", async () => {
    const snapshot = await buildAstGraph(project(FIXTURE))
    expect(snapshot.edges).toContainEqual({ from: "a.ts", to: "a.ts#aHelper", kind: "contains", confidence: "exact" })
  })
})

describe("AC3 — AST provider satisfies GraphProvider, unchanged consumers", () => {
  test("buildAstGraph labels the snapshot as ast and attaches a timestamp", async () => {
    const snapshot = await buildAstGraph(project(FIXTURE))
    expect(snapshot.source).toBe("ast")
    expect(snapshot.generatedAt).toBeGreaterThan(0)
    expect(snapshot.nodes.some((node) => node.kind === "file" && node.id === "a.ts")).toBe(true)
    expect(snapshot.nodes.some((node) => node.kind === "symbol" && node.id === "a.ts#aHelper")).toBe(true)
  })

  test("AstGraphProvider is a GraphProvider and reports nearest-first impact", async () => {
    const snapshot = await buildAstGraph(project(FIXTURE))
    const provider: GraphProvider = new AstGraphProvider(snapshot)

    expect(provider.snapshot().source).toBe("ast")
    // Reverse import chain dep.ts <- mid.ts <- top.ts, nearest first.
    expect(provider.impacted(["dep.ts"])).toEqual([
      { file: "mid.ts", distance: 1, confidence: "exact" },
      { file: "top.ts", distance: 2, confidence: "exact" },
    ])
    // layer() reuses layers.ts rules.
    expect(provider.layer("src/api/users.ts")).toBe("API")
    // Total: unknown input never throws.
    expect(provider.impacted(["does/not/exist.ts"])).toEqual([])
    expect(provider.impacted([])).toEqual([])
  })

  test("an empty AST provider is a valid empty snapshot", () => {
    const provider = new AstGraphProvider()
    expect(provider.snapshot().nodes).toEqual([])
    expect(provider.snapshot().source).toBe("memory")
    expect(provider.impacted(["x.ts"])).toEqual([])
  })
})
