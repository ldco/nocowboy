import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  EMPTY_GRAPH_SNAPSHOT,
  InMemoryGraphProvider,
  type GraphProvider,
  type ImpactedFile,
} from "@/nocowboy/knowledge-graph"
import { buildImportGraph } from "@/nocowboy/knowledge-graph/importer"
import { selectDeepContext } from "@/nocowboy/session/deep-context-selection"

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "deep-context-"))
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

/** A real import graph (a → b → c) wrapped in the in-memory provider. */
function graphProvider(): InMemoryGraphProvider {
  return new InMemoryGraphProvider({ snapshot: buildImportGraph(project(CHAIN)) })
}

/** A provider that returns whatever it is given — used to feed untrusted data. */
function stubImpacted(entries: unknown): GraphProvider {
  return {
    snapshot: () => ({ ...EMPTY_GRAPH_SNAPSHOT }),
    impacted: () => entries as ImpactedFile[],
    layer: () => null,
  }
}

/** Feed a value that is *not* a valid changelist, bypassing the compile-time type. */
function untrusted(files: unknown): readonly string[] {
  return files as readonly string[]
}

describe("selectDeepContext — with a graph", () => {
  test("adds nearest importers after the changed files", () => {
    const result = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider() })
    expect(result.changed).toEqual(["c.ts"])
    expect(result.impacted).toEqual([
      { file: "b.ts", distance: 1, confidence: "exact" },
      { file: "a.ts", distance: 2, confidence: "exact" },
    ])
    expect(result.files).toEqual(["c.ts", "b.ts", "a.ts"])
    expect(result.usedGraph).toBe(true)
    expect(result.truncated).toBe(false)
  })

  test("changed files stay first and are never duplicated as impacters", () => {
    const result = selectDeepContext({ changedFiles: ["c.ts", "b.ts"], provider: graphProvider() })
    expect(result.files).toEqual(["c.ts", "b.ts", "a.ts"])
    expect(new Set(result.files).size).toBe(result.files.length)
  })

  test("skips an importer that is already in the changed set (defensive)", () => {
    const provider = stubImpacted([
      { file: "b.ts", distance: 1, confidence: "exact" },
      { file: "a.ts", distance: 1, confidence: "exact" },
    ])
    const result = selectDeepContext({ changedFiles: ["b.ts"], provider })
    expect(result.files).toEqual(["b.ts", "a.ts"])
  })

  test("depth bounds the traversal", () => {
    const result = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider(), depth: 1 })
    expect(result.files).toEqual(["c.ts", "b.ts"])
    expect(result.impacted.map((i) => i.file)).toEqual(["b.ts"])
  })

  test("orders impacters by distance, then confidence, then path", () => {
    const provider = stubImpacted([
      { file: "far.ts", distance: 2, confidence: "exact" },
      { file: "near-heuristic.ts", distance: 1, confidence: "heuristic" },
      { file: "near-exact.ts", distance: 1, confidence: "exact" },
      { file: "z.ts", distance: 3, confidence: "exact" },
      { file: "a.ts", distance: 3, confidence: "exact" },
    ])
    const result = selectDeepContext({ changedFiles: ["changed.ts"], provider })
    expect(result.impacted.map((i) => i.file)).toEqual([
      "near-exact.ts",
      "near-heuristic.ts",
      "far.ts",
      "a.ts",
      "z.ts",
    ])
  })

  test("dedupes duplicate impacters, keeping the nearest", () => {
    const provider = stubImpacted([
      { file: "a.ts", distance: 2, confidence: "heuristic" },
      { file: "a.ts", distance: 1, confidence: "exact" },
    ])
    const result = selectDeepContext({ changedFiles: ["c.ts"], provider })
    expect(result.impacted).toEqual([{ file: "a.ts", distance: 1, confidence: "exact" }])
    expect(result.files).toEqual(["c.ts", "a.ts"])
  })
})

describe("selectDeepContext — degradation", () => {
  test("without a provider it degrades to diff-only", () => {
    const result = selectDeepContext({ changedFiles: ["a.ts", "b.ts"] })
    expect(result).toEqual({
      files: ["a.ts", "b.ts"],
      changed: ["a.ts", "b.ts"],
      impacted: [],
      usedGraph: false,
      truncated: false,
    })
  })

  test("a null provider is diff-only", () => {
    const result = selectDeepContext({ changedFiles: ["a.ts"], provider: null })
    expect(result.files).toEqual(["a.ts"])
    expect(result.usedGraph).toBe(false)
  })

  test("a throwing provider degrades to diff-only and never throws", () => {
    const provider: GraphProvider = {
      snapshot: () => ({ ...EMPTY_GRAPH_SNAPSHOT }),
      impacted: () => {
        throw new Error("graph unavailable")
      },
      layer: () => null,
    }
    const result = selectDeepContext({ changedFiles: ["a.ts"], provider })
    expect(result.files).toEqual(["a.ts"])
    expect(result.impacted).toEqual([])
    expect(result.usedGraph).toBe(false)
  })

  test("an empty changelist is diff-only, even with a provider", () => {
    const result = selectDeepContext({ changedFiles: [], provider: graphProvider() })
    expect(result.files).toEqual([])
    expect(result.usedGraph).toBe(false)
  })

  test("a malformed provider result is filtered, not trusted", () => {
    const provider = stubImpacted([null, 7, { file: 42 }, { file: "z.ts", distance: 1, confidence: "exact" }])
    const result = selectDeepContext({ changedFiles: ["a.ts"], provider })
    expect(result.impacted).toEqual([{ file: "z.ts", distance: 1, confidence: "exact" }])
    expect(result.files).toEqual(["a.ts", "z.ts"])
    expect(result.usedGraph).toBe(true)
  })

  test("a provider returning a non-array yields no impacters", () => {
    const result = selectDeepContext({ changedFiles: ["a.ts"], provider: stubImpacted("nope") })
    expect(result.impacted).toEqual([])
    expect(result.files).toEqual(["a.ts"])
    expect(result.usedGraph).toBe(true)
  })
})

describe("selectDeepContext — input hardening", () => {
  test("garbage input is sanitized, deduped and safe", () => {
    const result = selectDeepContext({
      changedFiles: untrusted(["", " ", "a.ts", " a.ts ", 7, {}, null, undefined, ["x"]]),
    })
    expect(result.changed).toEqual(["a.ts"])
    expect(result.files).toEqual(["a.ts"])
    expect(result.usedGraph).toBe(false)
  })
})

describe("selectDeepContext — maxFiles", () => {
  test("caps impacters but keeps every changed file", () => {
    const capped = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider(), maxFiles: 2 })
    expect(capped.files).toEqual(["c.ts", "b.ts"])
    expect(capped.impacted.map((i) => i.file)).toEqual(["b.ts"])
    expect(capped.truncated).toBe(true)

    const fits = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider(), maxFiles: 3 })
    expect(fits.files).toEqual(["c.ts", "b.ts", "a.ts"])
    expect(fits.truncated).toBe(false)
  })

  test("below the changelist it keeps all changed and adds none", () => {
    const result = selectDeepContext({ changedFiles: ["c.ts", "b.ts"], provider: graphProvider(), maxFiles: 1 })
    expect(result.files).toEqual(["c.ts", "b.ts"])
    expect(result.impacted).toEqual([])
    expect(result.truncated).toBe(true)
  })

  test("no truncation when there is nothing to add", () => {
    const result = selectDeepContext({ changedFiles: ["unknown/only.ts"], provider: graphProvider(), maxFiles: 1 })
    expect(result.files).toEqual(["unknown/only.ts"])
    expect(result.truncated).toBe(false)
    expect(result.usedGraph).toBe(true)
  })
})

describe("selectDeepContext — determinism", () => {
  test("same inputs produce an equal result regardless of provider identity", () => {
    const first = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider() })
    const second = selectDeepContext({ changedFiles: ["c.ts"], provider: graphProvider() })
    expect(second).toEqual(first)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })
})
