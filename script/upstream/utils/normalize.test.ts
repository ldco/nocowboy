import { describe, expect, test } from "bun:test"
import {
  NOCOWBOY_NORMALIZATION,
  compareTrees,
  normalizePackageNames,
  normalizeTreePath,
} from "./normalize"

describe("normalizeTreePath", () => {
  test("collapses slashes, drops leading ./ and trailing /", () => {
    expect(normalizeTreePath("./a//b/c/")).toBe("a/b/c")
    expect(normalizeTreePath("a\\b\\c")).toBe("a/b/c")
    expect(normalizeTreePath(".")).toBe("")
  })
})

describe("normalizePackageNames", () => {
  test("maps Kilo names to the NoCowboy namespace", () => {
    expect(normalizePackageNames('"@kilocode/cli"')).toBe('"@nocowboy/cli"')
    expect(normalizePackageNames("@kilocode/sdk/v2")).toBe("@nocowboy/sdk/v2")
    expect(normalizePackageNames("opencode-ai")).toBe("@nocowboy/cli")
  })

  test("leaves NoCowboy names untouched", () => {
    expect(normalizePackageNames("@nocowboy/cli")).toBe("@nocowboy/cli")
    expect(normalizePackageNames("@nocowboy/plugin/v1")).toBe("@nocowboy/plugin/v1")
  })

  test("does not edit a longer sibling package", () => {
    expect(normalizePackageNames("@kilocode/cli-extra")).toBe("@kilocode/cli-extra")
  })
})

describe("compareTrees", () => {
  test("trees that differ only by package namespace compare equal", () => {
    const diff = compareTrees(
      [{ path: "./packages/a/index.ts", content: 'import x from "@kilocode/sdk"' }],
      [{ path: "packages/a/index.ts", content: 'import x from "@nocowboy/sdk"' }],
    )
    expect(diff.same).toEqual(["packages/a/index.ts"])
    expect(diff.differing).toEqual([])
  })

  test("real content drift is reported as differing", () => {
    const diff = compareTrees(
      [{ path: "a.ts", content: "one" }],
      [{ path: "a.ts", content: "two" }],
    )
    expect(diff.differing).toEqual(["a.ts"])
  })

  test("reports one-sided entries", () => {
    const diff = compareTrees([{ path: "a.ts", content: "x" }], [{ path: "b.ts", content: "x" }])
    expect(diff.onlyLeft).toEqual(["a.ts"])
    expect(diff.onlyRight).toEqual(["b.ts"])
  })

  test("NoCowboy normalization does not contain a NoCowboy -> Kilo mapping", () => {
    const renamesOwn = NOCOWBOY_NORMALIZATION.filter((m) => m.from.startsWith("@nocowboy") && m.to.startsWith("@kilocode"))
    expect(renamesOwn).toEqual([])
  })
})
