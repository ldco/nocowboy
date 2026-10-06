import { describe, expect, test } from "bun:test"
import { InMemoryGraphProvider } from "../../src/nocowboy/knowledge-graph/memory"
import { EMPTY_GRAPH_SNAPSHOT, type GraphEdge, type GraphNode, type LayerRule } from "../../src/nocowboy/knowledge-graph/provider"

function node(id: string, path = id): GraphNode {
  return { id, kind: "file", path }
}

function edge(from: string, to: string, confidence: "exact" | "heuristic" = "exact"): GraphEdge {
  return { from, to, kind: "import", confidence }
}

describe("InMemoryGraphProvider", () => {
  test("an unbuilt graph is a valid empty snapshot, not an error", () => {
    const provider = new InMemoryGraphProvider()
    const snapshot = provider.snapshot()
    expect(snapshot.nodes).toEqual([])
    expect(snapshot.edges).toEqual([])
    expect(snapshot.source).toBe("memory")
    expect(snapshot.generatedAt).toBe(0)

    expect(provider.impacted(["src/a.ts"])).toEqual([])
    expect(provider.layer("src/a.ts")).toBeNull()
  })

  test("never throws on malformed or missing input", () => {
    const provider = new InMemoryGraphProvider()
    expect(() => provider.impacted(undefined as unknown as string[])).not.toThrow()
    expect(provider.impacted(undefined as unknown as string[])).toEqual([])
    expect(provider.impacted([null as unknown as string, 42 as unknown as string])).toEqual([])
    expect(provider.layer(undefined as unknown as string)).toBeNull()

    const dirty = new InMemoryGraphProvider({
      snapshot: {
        nodes: [{ id: "ok", kind: "file", path: "ok.ts" }, { id: "" } as unknown as GraphNode],
        edges: [{ from: "ok", to: "ok", kind: "import" } as unknown as GraphEdge],
        generatedAt: 123,
      },
    })
    expect(dirty.snapshot().nodes.map((n) => n.id)).toEqual(["ok"])
    expect(dirty.snapshot().edges).toEqual([])
  })

  test("walks reverse import edges to the requested depth", () => {
    const provider = new InMemoryGraphProvider({
      snapshot: {
        nodes: [node("a.ts"), node("b.ts"), node("c.ts"), node("d.ts")],
        edges: [edge("a.ts", "b.ts"), edge("a.ts", "c.ts"), edge("d.ts", "a.ts")],
        generatedAt: 1,
      },
    })

    expect(provider.impacted(["b.ts"], 1)).toEqual([{ file: "a.ts", distance: 1, confidence: "exact" }])
    expect(provider.impacted(["b.ts", "c.ts"], 1)).toEqual([
      { file: "a.ts", distance: 1, confidence: "exact" },
    ])
    expect(provider.impacted(["b.ts"], 2)).toEqual([
      { file: "a.ts", distance: 1, confidence: "exact" },
      { file: "d.ts", distance: 2, confidence: "exact" },
    ])
    // A changed file is never reported as impacting itself.
    expect(provider.impacted(["a.ts"], 2)).toEqual([
      { file: "d.ts", distance: 1, confidence: "exact" },
    ])
  })

  test("propagates heuristic confidence across a path", () => {
    const provider = new InMemoryGraphProvider({
      snapshot: {
        nodes: [node("a.ts"), node("b.ts"), node("c.ts")],
        edges: [edge("a.ts", "b.ts", "heuristic"), edge("b.ts", "c.ts", "exact")],
        generatedAt: 1,
      },
    })
    expect(provider.impacted(["b.ts"], 1)).toEqual([{ file: "a.ts", distance: 1, confidence: "heuristic" }])
    expect(provider.impacted(["c.ts"], 2)).toEqual([
      { file: "b.ts", distance: 1, confidence: "exact" },
      { file: "a.ts", distance: 2, confidence: "heuristic" },
    ])
  })

  test("does not guess when a basename is ambiguous", () => {
    const provider = new InMemoryGraphProvider({
      snapshot: {
        nodes: [node("pkg/a/index.ts"), node("pkg/b/index.ts"), node("pkg/c/main.ts"), node("pkg/z/top.ts")],
        edges: [
          edge("pkg/a/index.ts", "pkg/c/main.ts"),
          edge("pkg/b/index.ts", "pkg/c/main.ts"),
          edge("pkg/z/top.ts", "pkg/a/index.ts"),
        ],
        generatedAt: 1,
      },
    })
    // "index.ts" matches two nodes → unresolved, no silent single choice.
    expect(provider.impacted(["index.ts"])).toEqual([])
    // A full path is unambiguous and resolves to its importer.
    expect(provider.impacted(["pkg/a/index.ts"])).toEqual([
      { file: "pkg/z/top.ts", distance: 1, confidence: "exact" },
    ])
  })

  test("classifies layers by configurable path rules, first match wins", () => {
    const rules: LayerRule[] = [
      { pattern: /(^|\/)ui(\/|$)/, layer: "ui" },
      { pattern: /(^|\/)(server|api)(\/|$)/, layer: "api" },
      { pattern: /\/ui\//, layer: "must-not-win" },
    ]
    const provider = new InMemoryGraphProvider({ layerRules: rules })
    expect(provider.layer("packages/opencode/src/nocowboy/ui/i18n.ts")).toBe("ui")
    expect(provider.layer("packages/opencode/src/server/http.ts")).toBe("api")
    expect(provider.layer("packages/opencode/src/tool/task.ts")).toBeNull()
  })

  test("snapshot() returns a copy and does not leak mutable state", () => {
    const provider = new InMemoryGraphProvider({
      snapshot: { nodes: [node("a.ts")], edges: [], generatedAt: 5 },
    })
    const first = provider.snapshot()
    first.nodes.push(node("injected.ts"))
    expect(provider.snapshot().nodes.map((n) => n.id)).toEqual(["a.ts"])
    expect(EMPTY_GRAPH_SNAPSHOT.nodes).toEqual([])
  })

  test("bounds traversal with maxDepth", () => {
    const provider = new InMemoryGraphProvider({
      snapshot: {
        nodes: [node("a.ts"), node("b.ts"), node("c.ts")],
        edges: [edge("a.ts", "b.ts"), edge("b.ts", "c.ts")],
        generatedAt: 1,
      },
      maxDepth: 1,
    })
    // Even a request for depth 5 is clamped to the provider ceiling.
    expect(provider.impacted(["c.ts"], 5)).toEqual([{ file: "b.ts", distance: 1, confidence: "exact" }])
  })
})
