import { writeFileSync } from "node:fs"
import { cmd } from "./cmd"
import { buildKnowledgeGraph, toMermaid } from "@/nocowboy/knowledge-graph"
import { renderDashboard } from "@/nocowboy/knowledge-graph-dashboard"

export const KnowledgeGraphCommand = cmd({
  command: "graph",
  describe: "build a knowledge graph of the codebase (json | mermaid | html)",
  builder: (yargs: any) =>
    yargs
      .option("dir", { type: "string" })
      .option("format", { type: "string", choices: ["json", "mermaid", "html"], default: "json" })
      .option("out", { type: "string", describe: "write the HTML dashboard here (format=html)" }),
  handler(args: any) {
    const root = args.dir || process.cwd()
    const graph = buildKnowledgeGraph(root)
    if (args.format === "html") {
      const html = renderDashboard(graph)
      if (args.out) {
        writeFileSync(args.out, html)
        process.stdout.write(`wrote ${args.out} (${graph.stats.files} files, ${graph.stats.edges} edges)\n`)
      } else {
        process.stdout.write(html)
      }
      return
    }
    if (args.format === "mermaid") {
      process.stdout.write(toMermaid(graph) + "\n")
      return
    }
    process.stdout.write(JSON.stringify(graph, null, 2) + "\n")
  },
})
