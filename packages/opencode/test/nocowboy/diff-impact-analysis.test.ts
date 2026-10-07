import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { InMemoryGraphProvider } from "@/nocowboy/knowledge-graph"
import { buildImportGraph, listSourceFiles } from "@/nocowboy/knowledge-graph/importer"
import {
  formatImpact,
  parseKnowledgeGraphArgs,
  runImpact,
} from "@/cli/cmd/knowledge-graph"

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "impact-"))
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path)
    mkdirSync(join(full, ".."), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

const CHAIN = {
  "c.ts": "export const c = 1\n",
  "b.ts": 'import { c } from "./c"\nexport const b = c\n',
  "a.ts": 'import { b } from "./b"\nexport const a = b\n',
}

describe("buildImportGraph", () => {
  test("creates one import edge per resolved relative specifier", () => {
    const root = project({ ...CHAIN, "external.ts": 'import x from "left-pad"\nimport y from "./c"\n' })
    const snapshot = buildImportGraph(root)
    const edges = snapshot.edges.map((e) => `${e.from}->${e.to}:${e.confidence}`).sort()
    expect(edges).toContain("a.ts->b.ts:exact")
    expect(edges).toContain("b.ts->c.ts:exact")
    expect(edges).toContain("external.ts->c.ts:exact")
    // bare/package specifiers are external and dropped
    expect(edges.some((e) => e.includes("left-pad"))).toBe(false)
  })

  test("marks an ambiguous specifier heuristic, and picks no wrong file", () => {
    const root = project({ "x.ts": "export const x = 1\n", "x.tsx": "export const x = 2\n", "y.ts": 'import { x } from "./x"\n' })
    const snapshot = buildImportGraph(root)
    const edge = snapshot.edges.find((e) => e.from === "y.ts")!
    expect(edge.confidence).toBe("heuristic")
  })

  test("listSourceFiles ignores node_modules and non-source files", () => {
    const root = project({ "a.ts": "", "note.md": "", "node_modules/dep/index.js": "" })
    expect(listSourceFiles(root)).toEqual(["a.ts"])
  })
})

describe("impacted (importers, distance, confidence)", () => {
  const provider = () => new InMemoryGraphProvider({ snapshot: buildImportGraph(project(CHAIN)) })

  test("returns importers nearest first with distance and confidence", () => {
    const impacted = provider().impacted(["c.ts"])
    expect(impacted).toEqual([
      { file: "b.ts", distance: 1, confidence: "exact" },
      { file: "a.ts", distance: 2, confidence: "exact" },
    ])
  })

  test("unknown input returns [] without throwing", () => {
    expect(provider().impacted(["does/not/exist.ts"])).toEqual([])
    expect(provider().impacted([])).toEqual([])
  })

  test("respects depth", () => {
    expect(provider().impacted(["c.ts"], 1)).toEqual([{ file: "b.ts", distance: 1, confidence: "exact" }])
  })
})

describe("knowledge-graph impact CLI", () => {
  test("parses command, changed files, root and depth", () => {
    expect(parseKnowledgeGraphArgs(["impact", "--changed", "a.ts", "b.ts", "--depth", "1"])).toEqual({
      command: "impact",
      changed: ["a.ts", "b.ts"],
      root: process.cwd(),
      depth: 1,
    })
    expect(parseKnowledgeGraphArgs(["impact", "--changed", "a.ts,b.ts"])?.changed).toEqual(["a.ts", "b.ts"])
  })

  test("an empty graph prints 'no impact' and does not crash", () => {
    const empty = mkdtempSync(join(tmpdir(), "impact-empty-"))
    expect(runImpact({ command: "impact", changed: ["c.ts"], root: empty }).text).toBe("no impact")
    expect(runImpact({ command: "impact", changed: [], root: empty }).text).toContain("no impact")
  })

  test("reports the real impact over a project", () => {
    const root = project(CHAIN)
    const { impacted, text } = runImpact({ command: "impact", changed: ["c.ts"], root })
    expect(impacted.map((i) => i.file)).toEqual(["b.ts", "a.ts"])
    expect(text).toContain("b.ts")
    expect(text).toContain("confidence=exact")
  })

  test("formatImpact is stable", () => {
    expect(formatImpact([], [])).toContain("no impact")
    expect(formatImpact(["x"], [])).toBe("no impact")
  })
})
