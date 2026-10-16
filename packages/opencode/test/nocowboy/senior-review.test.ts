import { describe, expect, test } from "bun:test"
import {
  extractShortcuts,
  formatDebtLedger,
  parseSeniorFindings,
  priorityForCategory,
  rankSeniorFindings,
  reviewAsSenior,
  reviewScope,
} from "@/nocowboy/review/senior-review"
import type { GraphProvider, GraphSnapshot } from "@/nocowboy/knowledge-graph"

describe("parseSeniorFindings — priority:category", () => {
  test("an explicit priority:category tag is split", () => {
    const [f] = parseSeniorFindings("- [must-fix:security] src/auth.ts — hash the password with a slow KDF")
    expect(f.category).toBe("security")
    expect(f.priority).toBe("must-fix")
    expect(f.target).toBe("src/auth.ts")
  })

  test("a bare category infers its priority", () => {
    expect(parseSeniorFindings("- [bug] src/x.ts — off-by-one")[0].priority).toBe("must-fix")
    expect(parseSeniorFindings("- [performance] src/x.ts — O(n^2)")[0].priority).toBe("should-fix")
    expect(parseSeniorFindings("- [dead-code] src/x.ts — delete")[0].priority).toBe("nit")
  })

  test("an unknown priority token falls back to the category default", () => {
    const [f] = parseSeniorFindings("- [urgent:security] src/x.ts — fix")
    expect(f.category).toBe("security")
    expect(f.priority).toBe("must-fix")
  })

  test("non-canonical lines are ignored (same parser as over-engineering)", () => {
    expect(parseSeniorFindings("## Review\n\nprose only\n")).toEqual([])
  })
})

describe("priorityForCategory", () => {
  test("maps the senior dimensions", () => {
    expect(priorityForCategory("correctness")).toBe("must-fix")
    expect(priorityForCategory("slow-path")).toBe("should-fix")
    expect(priorityForCategory("missing-test")).toBe("should-fix")
    expect(priorityForCategory("something-new")).toBe("should-fix")
  })
})

describe("rankSeniorFindings", () => {
  test("orders must-fix before should-fix before nit, stable within a rank", () => {
    const text = [
      "- [nit] a.ts — tidy",
      "- [bug] b.ts — crash",
      "- [performance] c.ts — slow",
      "- [dead-code] d.ts — unused",
    ].join("\n")
    expect(reviewAsSenior(text).map((f) => f.target)).toEqual(["b.ts", "c.ts", "a.ts", "d.ts"])
  })

  test("two findings of the same priority keep reviewer order", () => {
    const ranked = rankSeniorFindings(parseSeniorFindings("- [bug] first.ts — x\n- [security] second.ts — y"))
    expect(ranked.map((f) => f.target)).toEqual(["first.ts", "second.ts"])
  })
})

describe("reviewScope — the change's touched files", () => {
  const provider = (impacted: Array<{ file: string; distance: number; confidence: "exact" | "heuristic" }>): GraphProvider => ({
    snapshot: (): GraphSnapshot => ({ nodes: [], edges: [], source: "memory", generatedAt: 0 }),
    impacted: () => impacted,
    layer: () => null,
  })

  test("with no provider the scope is diff-only", () => {
    const scope = reviewScope({ changedFiles: ["a.ts"] })
    expect(scope.files).toEqual(["a.ts"])
    expect(scope.usedGraph).toBe(false)
  })

  test("with a provider the scope adds nearest importers", () => {
    const scope = reviewScope({
      changedFiles: ["a.ts"],
      provider: provider([{ file: "b.ts", distance: 1, confidence: "exact" }]),
    })
    expect(scope.files).toEqual(["a.ts", "b.ts"])
    expect(scope.usedGraph).toBe(true)
  })

  test("a provider that throws degrades to diff-only", () => {
    const bad: GraphProvider = {
      snapshot: () => ({ nodes: [], edges: [], source: "memory", generatedAt: 0 }),
      impacted: () => {
        throw new Error("boom")
      },
      layer: () => null,
    }
    expect(reviewScope({ changedFiles: ["a.ts"], provider: bad }).files).toEqual(["a.ts"])
  })
})

describe("shortcut: ledger", () => {
  test("extracts a // shortcut: marker with its 1-based line", () => {
    const content = ["const a = 1", "const b = 2 // shortcut: replace with the native API", "const c = 3"].join("\n")
    expect(extractShortcuts("src/a.ts", content)).toEqual([
      { file: "src/a.ts", line: 2, note: "replace with the native API" },
    ])
  })

  test("supports # and block-comment markers, trimming the terminator", () => {
    const content = ["# shortcut: vendor this for now", "x = 1", "/* shortcut: fine for now */"].join("\n")
    expect(extractShortcuts("s.py", content).map((e) => e.note)).toEqual(["vendor this for now", "fine for now"])
  })

  test("a prose mention without a comment marker is not a finding", () => {
    expect(extractShortcuts("rules.md", "we use a `shortcut:` marker convention")).toEqual([])
  })

  test("formatDebtLedger groups by file and is stable", () => {
    const entries = [
      { file: "b.ts", line: 9, note: "later" },
      { file: "a.ts", line: 3, note: "todo" },
      { file: "a.ts", line: 7, note: "hack" },
    ]
    const ledger = formatDebtLedger(entries)
    expect(ledger).toContain("# Shortcut debt — 3 marker(s)")
    expect(ledger.indexOf("## a.ts")).toBeLessThan(ledger.indexOf("## b.ts"))
    expect(ledger).toContain("- L3: todo")
    expect(ledger).toContain("- L7: hack")
  })

  test("an empty ledger says so", () => {
    expect(formatDebtLedger([])).toBe("No `shortcut:` markers found — the ledger is empty.")
  })
})
