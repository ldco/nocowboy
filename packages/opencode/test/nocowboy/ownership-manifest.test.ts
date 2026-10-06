import { describe, expect, it } from "bun:test"
import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { buildManifest } from "../../../../scripts/ownership-manifest"

const root = path.resolve(import.meta.dir, "../../../..")
const manifest = JSON.parse(readFileSync(path.join(root, "ownership-manifest.json"), "utf-8"))

describe("ownership-manifest", () => {
  it("classifies owned / adapted / generated / inherited", () => {
    expect(manifest.rules.owned_prefixes).toContain("packages/opencode/src/nocowboy/")
    expect(manifest.rules.generated).toContain("engine-manifest.json")
    expect(typeof manifest.rules.adapted).toBe("string")
    expect(typeof manifest.rules.inherited).toBe("string")
    expect(Array.isArray(manifest.adapted)).toBe(true)
  })

  it("includes shared-core call sites — ownership is not just src/nocowboy", () => {
    expect(manifest.adapted).toContain("packages/opencode/src/session/prompt.ts")
    expect(manifest.adapted).toContain("packages/opencode/src/tool/task.ts")
    expect(manifest.adapted.some((f: string) => f.startsWith("packages/opencode/src/permission/"))).toBe(true)
    expect(manifest.rules.owned_prefixes).not.toContain("packages/opencode/src/session/")
  })

  it("does not classify NoCowboy-maintained packages as inherited", () => {
    expect(manifest.rules.owned_prefixes).toContain("packages/nocowboy-")
    expect(manifest.rules.owned_prefixes).toContain("script/nocowboy/")
  })

  it("--check passes against the committed file", () => {
    const result = Bun.spawnSync(["bun", "run", "scripts/ownership-manifest.ts", "--check"], { cwd: root })
    expect(result.exitCode).toBe(0)
  })

  // Regression for the isCode-gate defect: real adaptations live in .mjs/.json/
  // .css/extensionless scripts, not only .ts — the scan must see every text file.
  it("scans every text file, not just .ts", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ownership-"))
    try {
      execFileSync("git", ["init", "-q"], { cwd: dir })
      mkdirSync(path.join(dir, "scripts"), { recursive: true })
      cpSync(path.join(root, "scripts", "ownership-manifest.ts"), path.join(dir, "scripts", "ownership-manifest.ts"))
      writeFileSync(path.join(dir, "style.css"), "/* kilocode_change */\n.x { color: red }\n")
      writeFileSync(path.join(dir, "thing.mjs"), "// nocowboy_change\nexport {}\n")
      writeFileSync(path.join(dir, "install"), "#!/bin/sh\n# nocowboy_change\necho hi\n")
      writeFileSync(path.join(dir, "tsconfig.json"), '// kilocode_change\n{}\n')

      const temp = buildManifest(dir)
      expect(temp.adapted).toContain("style.css")
      expect(temp.adapted).toContain("thing.mjs")
      expect(temp.adapted).toContain("install")
      expect(temp.adapted).toContain("tsconfig.json")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
