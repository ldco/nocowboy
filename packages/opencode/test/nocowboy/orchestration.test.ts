import { describe, expect, test } from "bun:test"
import {
  BASE_BRANCH_CONFIG_KEY,
  isSandboxBranch,
  makeSandboxBranch,
  parseMergeOutput,
  planAbort,
  planMergeBack,
  planStart,
  readBaseBranch,
  runIterations,
} from "@/nocowboy/orchestration"

describe("sandbox branch identity", () => {
  test("isSandboxBranch recognises the prefix", () => {
    expect(isSandboxBranch("nocowboy-sandbox/abc-1")).toBe(true)
    expect(isSandboxBranch("main")).toBe(false)
  })

  test("makeSandboxBranch sanitizes a hostile session id", () => {
    expect(makeSandboxBranch("a b/../c", 42)).toBe("nocowboy-sandbox/a-b-..-c-42")
    expect(makeSandboxBranch("   ", 1)).toBe("nocowboy-sandbox/session-1")
  })
})

describe("planStart", () => {
  test("branches and records the base branch", () => {
    const steps = planStart({ baseBranch: "main", sandboxBranch: "nocowboy-sandbox/s-1" })
    expect(steps[0].args).toEqual(["checkout", "-b", "nocowboy-sandbox/s-1", "main"])
    expect(steps[1].args).toEqual(["config", `branch.nocowboy-sandbox/s-1.${BASE_BRANCH_CONFIG_KEY}`, "main"])
  })

  test("no base or branch yields no steps", () => {
    expect(planStart({ baseBranch: "", sandboxBranch: "x" })).toEqual([])
  })
})

describe("planMergeBack", () => {
  const input = { baseBranch: "main", sandboxBranch: "nocowboy-sandbox/s-1" }

  test("head and branch are no-ops at the git level", () => {
    expect(planMergeBack({ ...input, strategy: "head" })).toEqual([])
    expect(planMergeBack({ ...input, strategy: "branch" })).toEqual([])
  })

  test("merge-to-head checks out base, merges --no-ff, deletes the sandbox", () => {
    const steps = planMergeBack({ ...input, strategy: "merge-to-head" })
    expect(steps.map((s) => s.args)).toEqual([
      ["checkout", "main"],
      ["merge", "--no-ff", "--no-edit", "nocowboy-sandbox/s-1"],
      ["branch", "-D", "nocowboy-sandbox/s-1"],
    ])
  })

  test("merging into itself is refused", () => {
    expect(planMergeBack({ strategy: "merge-to-head", baseBranch: "x", sandboxBranch: "x" })).toEqual([])
  })
})

describe("planAbort", () => {
  test("returns to base and deletes the sandbox", () => {
    expect(planAbort({ baseBranch: "main", sandboxBranch: "nocowboy-sandbox/s-1" }).map((s) => s.args)).toEqual([
      ["checkout", "main"],
      ["branch", "-D", "nocowboy-sandbox/s-1"],
    ])
  })
})

describe("readBaseBranch", () => {
  test("prefers the recorded nocowboyBase key", () => {
    const cfg: Record<string, string> = {
      [`branch.s.${BASE_BRANCH_CONFIG_KEY}`]: "develop",
      "branch.s.merge": "refs/heads/main",
    }
    expect(readBaseBranch({ branch: "s", getConfig: (k) => cfg[k] })).toBe("develop")
  })

  test("falls back to git's tracking config, stripping refs/heads/", () => {
    const cfg: Record<string, string> = { "branch.s.merge": "refs/heads/main" }
    expect(readBaseBranch({ branch: "s", getConfig: (k) => cfg[k] })).toBe("main")
  })

  test("no config means an unknown base", () => {
    expect(readBaseBranch({ branch: "s", getConfig: () => undefined })).toBeUndefined()
  })
})

describe("parseMergeOutput", () => {
  test("exit 0 with 'Already up to date' is up-to-date", () => {
    expect(parseMergeOutput({ exitCode: 0, stdout: "Already up to date." })).toEqual({ status: "up-to-date", conflicts: [] })
  })

  test("exit 0 is a clean merge", () => {
    expect(parseMergeOutput({ exitCode: 0, stdout: "Merge made by the 'ort' strategy." })).toEqual({ status: "merged", conflicts: [] })
  })

  test("content conflicts are reported by file, deduped", () => {
    const stderr = [
      "Auto-merging a.ts",
      "CONFLICT (content): Merge conflict in a.ts",
      "CONFLICT (content): Merge conflict in a.ts",
      "CONFLICT (modify/delete): b.ts deleted in HEAD and modified in other. Version other of b.ts left in tree.",
      "Automatic merge failed; fix conflicts and then commit the result.",
    ].join("\n")
    expect(parseMergeOutput({ exitCode: 1, stderr })).toEqual({ status: "conflict", conflicts: ["a.ts", "b.ts"] })
  })

  test("a non-zero exit with no conflict markers is a failure", () => {
    expect(parseMergeOutput({ exitCode: 128, stderr: "fatal: not a git repository" })).toEqual({ status: "failed", conflicts: [] })
  })
})

describe("runIterations", () => {
  test("runs to the cap and reports max-iterations", async () => {
    const seen: number[] = []
    const outcome = await runIterations({ maxIterations: 3, work: async (i) => (seen.push(i), i) })
    expect(outcome.iterations).toBe(3)
    expect(outcome.results).toEqual([0, 1, 2])
    expect(outcome.stoppedBy).toBe("max-iterations")
  })

  test("stops early when done accepts a result", async () => {
    const outcome = await runIterations({ maxIterations: 10, work: async (i) => i, done: (r) => r === 2 })
    expect(outcome.iterations).toBe(3)
    expect(outcome.stoppedBy).toBe("done")
  })

  test("a non-positive cap runs nothing", async () => {
    const outcome = await runIterations({ maxIterations: 0, work: async () => "x" })
    expect(outcome).toEqual({ iterations: 0, results: [], stoppedBy: "max-iterations" })
  })
})
