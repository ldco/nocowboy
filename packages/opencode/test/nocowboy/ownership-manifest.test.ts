import { describe, expect, test } from "bun:test"
import {
  DEFAULT_OWNERSHIP_MANIFEST,
  classifyPath,
  normalizeOwnershipPath,
  unclassifiedPaths,
  validateOwnershipManifest,
} from "@/nocowboy/ownership/manifest"

describe("classifyPath", () => {
  test("NoCowboy-authored paths are owned", () => {
    expect(classifyPath("packages/opencode/src/nocowboy/spec/contract.ts")).toBe("owned")
    expect(classifyPath("packages/opencode/test/nocowboy/contracts/01.test.ts")).toBe("owned")
    expect(classifyPath("packages/nocowboy-runtime/src/index.ts")).toBe("owned")
    expect(classifyPath("scripts/engine-manifest.ts")).toBe("owned")
    expect(classifyPath("packaging/publish.sh")).toBe("owned")
  })

  test("shared-core call sites are adapted — ownership is NOT only src/nocowboy", () => {
    expect(classifyPath("packages/opencode/src/session/prompt.ts")).toBe("adapted")
    expect(classifyPath("packages/opencode/src/tool/task.ts")).toBe("adapted")
    expect(classifyPath("packages/opencode/src/permission/index.ts")).toBe("adapted")
    expect(classifyPath("packages/opencode/src/tool/registry.ts")).toBe("adapted")
    expect(classifyPath("README.md")).toBe("adapted")
  })

  test("generated outputs win over their owned directory", () => {
    expect(classifyPath("docs/ROADMAP.md")).toBe("generated")
    expect(classifyPath("docs/features/engine-manifest.md")).toBe("generated")
    expect(classifyPath("engine-manifest.json")).toBe("generated")
    // Non-generated docs are owned.
    expect(classifyPath("docs/reference/engine-manifest.md")).toBe("owned")
  })

  test("an unknown path is unclassified", () => {
    expect(classifyPath("some/unknown/file.txt")).toBe("unclassified")
  })

  test("carriage returns and leading ./ are normalized", () => {
    expect(normalizeOwnershipPath(".\\docs\\ROADMAP.md")).toBe("docs/ROADMAP.md")
    expect(classifyPath("./docs/ROADMAP.md")).toBe("generated")
  })

  test("a single star does not cross path separators", () => {
    // `packages/nocowboy-*/**` matches one package segment, not nested dirs.
    expect(classifyPath("packages/nocowboy-runtime/src/deep/file.ts")).toBe("owned")
    expect(classifyPath("packages/nocowboy-runtime/deep/nested/file.ts")).toBe("owned")
  })
})

describe("validateOwnershipManifest", () => {
  test("the default manifest is valid", () => {
    expect(validateOwnershipManifest(DEFAULT_OWNERSHIP_MANIFEST)).toEqual([])
  })

  test("every call site classifies as adapted", () => {
    for (const site of DEFAULT_OWNERSHIP_MANIFEST.callSites) {
      expect(classifyPath(site)).toBe("adapted")
    }
  })

  test("rejects an empty class", () => {
    const broken = structuredClone(DEFAULT_OWNERSHIP_MANIFEST)
    broken.classes.owned = []
    expect(validateOwnershipManifest(broken).some((e) => e.includes("classes.owned"))).toBe(true)
  })

  test("rejects a call site that is not adapted", () => {
    const broken = structuredClone(DEFAULT_OWNERSHIP_MANIFEST)
    broken.callSites = ["some/unknown/file.ts"]
    expect(validateOwnershipManifest(broken).some((e) => e.includes("must classify as adapted"))).toBe(true)
  })
})

describe("unclassifiedPaths (the gate)", () => {
  test("lists only paths no class covers", () => {
    expect(
      unclassifiedPaths([
        "packages/opencode/src/session/prompt.ts",
        "docs/ROADMAP.md",
        "some/unknown/file.txt",
        "another/unknown.ts",
      ]),
    ).toEqual(["some/unknown/file.txt", "another/unknown.ts"])
  })

  test("a fully classified set passes", () => {
    expect(unclassifiedPaths(["packages/nocowboy-runtime/src/index.ts", "package.json", "README.md"])).toEqual([])
  })
})
