import { describe, expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"
import { buildKnowledgeGraph, fileId, moduleName, neighbours, symbolId, toMermaid } from "@/nocowboy/knowledge-graph"
import { renderDashboard } from "@/nocowboy/knowledge-graph-dashboard"

async function fixture() {
  return tmpdir({
    init: async (dir: string) => {
      await Bun.write(path.join(dir, "a.ts"), 'import { bar } from "./b"\nexport function foo() {\n  return bar\n}\n')
      await Bun.write(path.join(dir, "b.ts"), "export const bar = 1\n")
    },
  })
}

describe("knowledge graph", () => {
  test("moduleName lowercases the basename without extension", () => {
    expect(moduleName("src/Foo.Bar.ts")).toBe("foo.bar")
    expect(moduleName("x/y.tsx")).toBe("y")
  })

  test("builds file/symbol nodes and import/contains edges from the repomap scan", async () => {
    await using tmp = await fixture()
    const graph = buildKnowledgeGraph(tmp.path)
    const ids = graph.nodes.map((n) => n.id)
    expect(ids).toContain(fileId("a.ts"))
    expect(ids).toContain(fileId("b.ts"))
    expect(ids).toContain(symbolId("a.ts", "foo"))
    expect(ids).toContain(symbolId("b.ts", "bar"))
    expect(graph.edges).toContainEqual({ from: fileId("a.ts"), to: fileId("b.ts"), kind: "imports" })
    expect(graph.edges).toContainEqual({ from: fileId("a.ts"), to: symbolId("a.ts", "foo"), kind: "contains" })
    expect(graph.stats).toEqual({ files: 2, symbols: 2, edges: 3 })
  })

  test("neighbours returns outgoing and incoming links", async () => {
    await using tmp = await fixture()
    const graph = buildKnowledgeGraph(tmp.path)
    expect(neighbours(graph, fileId("a.ts")).sort()).toEqual([fileId("b.ts"), symbolId("a.ts", "foo")].sort())
    expect(neighbours(graph, fileId("b.ts"))).toEqual([fileId("a.ts"), symbolId("b.ts", "bar")])
  })

  test("edges are de-duplicated", async () => {
    await using tmp = await fixture()
    const graph = buildKnowledgeGraph(tmp.path)
    const keys = graph.edges.map((e) => `${e.kind}:${e.from}->${e.to}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("knowledge graph consumers", () => {
  test("toMermaid renders nodes and import edges", async () => {
    await using tmp = await fixture()
    const graph = buildKnowledgeGraph(tmp.path)
    const mermaid = toMermaid(graph)
    expect(mermaid).toContain("graph LR")
    expect(mermaid).toContain("-->")
    expect(mermaid).toContain('nfile_a_ts["a.ts"]')
    expect(mermaid).toContain("nfile_a_ts --> nfile_b_ts")
    expect(mermaid).toContain("-.->")
  })

  test("renderDashboard emits a self-contained interactive page", async () => {
    await using tmp = await fixture()
    const graph = buildKnowledgeGraph(tmp.path)
    const html = renderDashboard(graph)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain('id="q"') // search box
    expect(html).toContain('"wheel"') // zoom
    expect(html).toContain("nodeAt(") // click selection
    expect(html).toContain("a.ts") // embedded graph data
    expect(html).toContain("file:a.ts")
    // No raw closing script tag can leak from embedded JSON.
    expect(html.split("</script>").length - 1).toBe(1)
  })

  test("renderDashboard escapes angle brackets in embedded data", async () => {
    const graph = {
      root: "</script><script>alert(1)</script>",
      nodes: [{ id: "file:x", kind: "file" as const, label: "</script>", path: "x" }],
      edges: [],
      stats: { files: 1, symbols: 0, edges: 0 },
    }
    const html = renderDashboard(graph)
    expect(html.split("</script>").length - 1).toBe(1)
    expect(html).not.toContain("<script>alert")
  })
})
