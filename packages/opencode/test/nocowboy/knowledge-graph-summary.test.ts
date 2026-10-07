import { describe, expect, test } from "bun:test"
import { graphHash, graphOutline, renderOutline, summarizeArchitecture } from "@/nocowboy/knowledge-graph/summary"
import type { GraphSnapshot } from "@/nocowboy/knowledge-graph/provider"

function snapshot(): GraphSnapshot {
  return {
    source: "ast",
    generatedAt: 1,
    nodes: [
      { id: "src/api/users.ts", kind: "file", path: "src/api/users.ts" },
      { id: "src/db/users.ts", kind: "file", path: "src/db/users.ts" },
      { id: "src/util/misc.ts", kind: "file", path: "src/util/misc.ts" },
      { id: "src/api/users.ts#handler", kind: "symbol", path: "src/api/users.ts", name: "handler" },
      { id: "src/db/users.ts#repo", kind: "symbol", path: "src/db/users.ts", name: "repo" },
    ],
    edges: [
      { from: "src/api/users.ts", to: "src/db/users.ts", kind: "import", confidence: "exact" },
      { from: "src/api/users.ts", to: "src/api/users.ts#handler", kind: "contains", confidence: "exact" },
      { from: "src/api/users.ts#handler", to: "src/db/users.ts#repo", kind: "call", confidence: "exact" },
    ],
  }
}

describe("graphOutline", () => {
  test("counts files, symbols and edges by kind", () => {
    const outline = graphOutline(snapshot())
    expect(outline.files).toBe(3)
    expect(outline.symbols).toBe(2)
    expect(outline.edges).toEqual({ import: 1, call: 1, contains: 1 })
  })

  test("buckets files by architectural layer (unknown included)", () => {
    const outline = graphOutline(snapshot())
    expect(outline.layers).toEqual({ API: 1, Data: 1, Unknown: 1 })
  })

  test("ranks hubs by inbound edges, tie-broken by id", () => {
    const outline = graphOutline(snapshot())
    expect(outline.hubs.map((hub) => hub.id)).toEqual([
      "src/api/users.ts#handler",
      "src/db/users.ts",
      "src/db/users.ts#repo",
    ])
    expect(outline.hubs.every((hub) => hub.inbound === 1)).toBe(true)
  })

  test("honours topHubs and ignores inbound to unknown nodes", () => {
    const snap = snapshot()
    snap.edges.push({ from: "src/util/misc.ts", to: "ghost", kind: "import", confidence: "heuristic" })
    const outline = graphOutline(snap, { topHubs: 1 })
    expect(outline.hubs).toHaveLength(1)
    expect(outline.hubs.some((hub) => hub.id === "ghost")).toBe(false)
  })

  test("an empty graph is all zeros with no hubs", () => {
    const outline = graphOutline({ nodes: [], edges: [], source: "memory", generatedAt: 0 })
    expect(outline).toEqual({ files: 0, symbols: 0, edges: { import: 0, call: 0, contains: 0 }, layers: {}, hubs: [] })
  })
})

describe("renderOutline", () => {
  test("renders a stable, readable block", () => {
    const text = renderOutline(graphOutline(snapshot()))
    expect(text).toContain("Files: 3; symbols: 2")
    expect(text).toContain("import: 1, call: 1, contains: 1")
    expect(text).toContain("- API: 1")
    expect(text).toContain("- src/api/users.ts#handler (1 inbound)")
    expect(renderOutline(graphOutline(snapshot()))).toBe(text)
  })

  test("an empty graph renders explicit (none) markers", () => {
    const text = renderOutline(graphOutline({ nodes: [], edges: [], source: "memory", generatedAt: 0 }))
    expect(text).toContain("(none)")
  })
})

describe("graphHash", () => {
  test("is deterministic and order-independent", () => {
    expect(graphHash(snapshot())).toBe(graphHash(snapshot()))
    const reordered = snapshot()
    reordered.nodes.reverse()
    reordered.edges.reverse()
    expect(graphHash(reordered)).toBe(graphHash(snapshot()))
  })

  test("changes when the structure changes", () => {
    const changed = snapshot()
    changed.edges.push({ from: "src/util/misc.ts", to: "src/db/users.ts", kind: "import", confidence: "heuristic" })
    expect(graphHash(changed)).not.toBe(graphHash(snapshot()))
  })
})

describe("summarizeArchitecture", () => {
  test("uses the injected summarizer once and caches by graph structure", async () => {
    const seen: string[] = []
    let calls = 0
    const llm = async (prompt: string) => {
      calls++
      seen.push(prompt)
      return `narrative #${calls}`
    }
    const cache = new Map<string, string>()

    const first = await summarizeArchitecture(snapshot(), { llm, cache })
    expect(first.cached).toBe(false)
    expect(first.summary).toBe("narrative #1")
    expect(first.outline.files).toBe(3)
    expect(calls).toBe(1)
    expect(seen[0]).toBe(renderOutline(first.outline))

    const second = await summarizeArchitecture(snapshot(), { llm, cache })
    expect(second.cached).toBe(true)
    expect(second.summary).toBe("narrative #1")
    expect(calls).toBe(1)

    const changed = snapshot()
    changed.nodes.push({ id: "src/api/extra.ts", kind: "file", path: "src/api/extra.ts" })
    const third = await summarizeArchitecture(changed, { llm, cache })
    expect(third.cached).toBe(false)
    expect(third.summary).toBe("narrative #2")
    expect(calls).toBe(2)
  })

  test("works without a cache and on an empty graph", async () => {
    let calls = 0
    const llm = async () => {
      calls++
      return "empty"
    }
    const result = await summarizeArchitecture(
      { nodes: [], edges: [], source: "memory", generatedAt: 0 },
      { llm },
    )
    expect(result.cached).toBe(false)
    expect(result.summary).toBe("empty")
    expect(result.outline.files).toBe(0)
    expect(calls).toBe(1)
  })
})
