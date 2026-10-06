import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// The runtime core must not depend on the engine's session/TUI/provider
// internals — only on the ports' contracts. We inspect real import/export
// specifiers (not prose), so doc-comments mentioning them are fine.
const FORBIDDEN = [
  /^@\/session\b/,
  /^@tui\//,
  /^@\/provider\b/,
  /^@\/agent\/agent\b/,
  /^@\/permission\b/,
  /^\.\.\/session\b/,
  /^\.\.\/provider\b/,
]

const SPECIFIER = /\b(?:import|export)\b[^"'`]*?from\s*["']([^"']+)["']/g

const srcDir = join(import.meta.dir, "..", "..", "..", "..", "nocowboy-runtime", "src")

function specifiers(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((m) => m[1]!)
}

describe("@nocowboy/runtime imports no engine internals", () => {
  const files = readdirSync(srcDir).filter((f) => f.endsWith(".ts"))

  test("the package has sources to scan", () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  for (const file of files) {
    test(`${file} has no forbidden import specifier`, () => {
      const found = specifiers(readFileSync(join(srcDir, file), "utf-8"))
      for (const spec of found) {
        for (const pattern of FORBIDDEN) {
          expect(spec).not.toMatch(pattern)
        }
      }
    })
  }
})
