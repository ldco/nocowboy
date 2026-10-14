// nocowboy_change - new file
//
// Regression guard: a build is always stamped with packages/opencode/package.json's
// version. It must never take the version from NOCOWBOY_VERSION in the environment,
// which is inherited by shell tools from a running TUI and used to leak the parent
// binary's version into a freshly compiled binary (a 1.3.0 tree emitted 1.0.9-alpha).

import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { resolveBuildVersion } from "../../script/nocowboy/build-version"

const buildScript = path.resolve(import.meta.dir, "../../script/build.ts")

describe("build version is the real package version", () => {
  test("stamps the version declared in package.json", () => {
    expect(resolveBuildVersion("1.3.0")).toBe("1.3.0")
  })

  test("ignores a NOCOWBOY_VERSION inherited from the environment", () => {
    const saved = process.env.NOCOWBOY_VERSION
    process.env.NOCOWBOY_VERSION = "1.0.9-alpha"
    try {
      expect(resolveBuildVersion("1.3.0")).toBe("1.3.0")
    } finally {
      if (saved === undefined) delete process.env.NOCOWBOY_VERSION
      else process.env.NOCOWBOY_VERSION = saved
    }
  })

  test("fails loudly when package.json has no version", () => {
    expect(() => resolveBuildVersion(undefined)).toThrow(/missing a version/)
    expect(() => resolveBuildVersion("   ")).toThrow(/missing a version/)
  })

  test("build.ts derives the version from package.json, never from the environment", () => {
    const source = fs.readFileSync(buildScript, "utf-8")
    expect(source).toContain("resolveBuildVersion(pkg.version)")
    expect(source).not.toContain("process.env.NOCOWBOY_VERSION")
  })
})
