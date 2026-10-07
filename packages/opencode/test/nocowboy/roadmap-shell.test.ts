import { describe, expect, test } from "bun:test"
import { runShellCommand, pipefailShell } from "@/nocowboy/roadmap/shell"

const cwd = process.cwd()
const hasPipefail = pipefailShell() !== null

describe("runShellCommand", () => {
  test("reports success and captures stdout", () => {
    const r = runShellCommand("printf hello", cwd)
    expect(r.ok).toBe(true)
    expect(r.out).toBe("hello")
  })

  test("reports failure on a non-zero exit", () => {
    expect(runShellCommand("exit 3", cwd).ok).toBe(false)
  })

  test("a passing pipeline is still ok and output is captured", () => {
    const r = runShellCommand("printf 'a\\nb\\n' | tail -1", cwd)
    expect(r.ok).toBe(true)
    expect(r.out).toBe("b")
  })

  test("a failing non-final pipeline stage is NOT masked (pipefail)", () => {
    if (!hasPipefail) return // platform shell without pipefail — nothing to assert
    // `false | tail -1` exits 0 without pipefail, so this guards the regression
    // that produced a false-green verify before the fix.
    expect(runShellCommand("false | tail -1", cwd).ok).toBe(false)
    expect(runShellCommand("exit 7 | cat", cwd).ok).toBe(false)
  })
})
