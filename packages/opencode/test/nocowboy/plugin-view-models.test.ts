import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { createTuiViewModels, type TuiViewModelDeps } from "../../src/nocowboy/plugin-view-models"

const HERE = import.meta.dir
const SIDEBAR_USAGE = path.resolve(HERE, "../../src/nocowboy/plugins/sidebar-usage.tsx")

function deps(over: Partial<TuiViewModelDeps> = {}): TuiViewModelDeps {
  return {
    messages: () => [],
    model: () => undefined,
    agent: () => undefined,
    vcsBranch: () => undefined,
    terminalBench: () => undefined,
    memoryStatus: () => "unavailable",
    ...over,
  }
}

describe("tui façade view models", () => {
  test("usage formats input/output/cached from session messages", () => {
    const vm = createTuiViewModels(
      deps({
        messages: () => [
          { role: "assistant", tokens: { input: 1000, output: 500, cache: { read: 200, write: 0 } } } as never,
          { role: "user" } as never,
        ],
      }),
    )
    expect(vm.usage("s1")).toEqual({ input: "1,000", output: "500", cached: "200" })
  })

  test("usage attaches terminalBench only when the current model advertises it", () => {
    const bench = { overallScore: 0.875, avgAttemptCostUsd: 1.5 }
    const withBench = createTuiViewModels(
      deps({
        model: () => ({ providerID: "p", modelID: "m" }),
        terminalBench: (pid, mid) => (pid === "p" && mid === "m" ? bench : undefined),
      }),
    )
    expect(withBench.usage("s1").terminalBench).toEqual({ score: "87.5%", costPerAttempt: "$1.50" })

    const noModel = createTuiViewModels(deps({ terminalBench: () => bench }))
    expect(noModel.usage("s1").terminalBench).toBeUndefined()
  })

  test("model/agent/git/memory view models reflect their sources", () => {
    const vm = createTuiViewModels(
      deps({
        model: () => ({ providerID: "deepseek", modelID: "deepseek-v4" }),
        agent: () => ({ name: "worker", mode: "primary" }),
        vcsBranch: () => "main",
        memoryStatus: () => "degraded",
      }),
    )
    expect(vm.model()).toEqual({ providerID: "deepseek", modelID: "deepseek-v4" })
    expect(vm.agent()).toEqual({ name: "worker", mode: "primary" })
    expect(vm.git()).toEqual({ branch: "main" })
    expect(vm.memory()).toEqual({ status: "degraded" })
  })

  test("the façade exposes all five view models required by the contract", () => {
    const vm = createTuiViewModels(deps())
    for (const key of ["usage", "model", "agent", "git", "memory"] as const) {
      expect(typeof vm[key]).toBe("function")
    }
    expect(vm.model()).toBeUndefined()
    expect(vm.agent()).toBeUndefined()
    expect(vm.git()).toBeUndefined()
  })

  test("sidebar-usage widget uses the façade, not internal useLocal/getUsage", async () => {
    const source = await fs.readFile(SIDEBAR_USAGE, "utf-8")
    // Positive control: the façade call is actually present.
    expect(source).toContain("viewModels.usage")
    // Non-vacuous guards: the internal couplings the AC forbids are gone.
    expect(source).not.toMatch(/\buseLocal\b/)
    expect(source).not.toMatch(/\bgetUsage\b/)
    expect(source).not.toContain("@tui/context/local")
    expect(source).not.toContain("routes/session/usage")
  })
})
