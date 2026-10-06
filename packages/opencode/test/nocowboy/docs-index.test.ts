import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

// The docs index must not rot: every relative link in docs/README.md must
// resolve. This is what "release docs are complete" means mechanically.
const root = path.resolve(import.meta.dir, "../../../..")
const docsDir = path.join(root, "docs")
const index = path.join(docsDir, "README.md")

function relativeLinks(markdown: string): string[] {
  const out: string[] = []
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(markdown)) !== null) out.push(match[1]!)
  return out.filter((target) => !/^(https?:|mailto:|#)/.test(target))
}

describe("docs/README.md index", () => {
  const content = readFileSync(index, "utf-8")

  test("every relative link resolves", () => {
    const missing: string[] = []
    for (const raw of relativeLinks(content)) {
      const target = raw.split("#")[0]!.trim()
      if (!target) continue
      if (!existsSync(path.join(docsDir, target))) missing.push(raw)
    }
    expect(missing).toEqual([])
  })

  test("links the system docs", () => {
    expect(content).toContain("BACKLOG.md")
    expect(content).toContain("ROADMAP.md")
    expect(content).toContain("CHANGELOG.md")
    expect(content).toContain("known-issues.md")
  })

  test("surfaces the current docs tree", () => {
    for (const dir of ["features/", "reference/", "guides/", "adr/", "plans/", "attestations/", "releases/", "archive/"]) {
      expect(content, `index is missing ${dir}`).toContain(dir)
    }
  })
})
