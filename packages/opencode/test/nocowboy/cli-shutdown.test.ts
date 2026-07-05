import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

// Test the NocowboyCli.shutdown lifecycle order WITHOUT using mock.module().
// Instead, spy on the specific methods of already-loaded modules.
// This avoids poisoning the module cache for other test files.

const calls: string[] = []
const timeouts: Array<number | undefined> = []
let err: unknown
let exit: string | number | null | undefined

describe("NoCowboyCli.shutdown", () => {
  beforeEach(() => {
    calls.length = 0
    timeouts.length = 0
    err = undefined
    exit = process.exitCode
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = exit
  })

  test("keeps telemetry shutdown timeout best-effort and still disposes instances", async () => {
    const { NocowboyCli } = await import("../../src/nocowboy/cli/setup")

    // Spy on the modules AFTER import so the real modules are used
    const { Telemetry } = await import("@nocowboy/telemetry")
    const { SessionExport } = await import("@/nocowboy/session-export")
    const { InstanceRuntime } = await import("@/project/instance-runtime")

    spyOn(Telemetry, "trackCliExit").mockImplementation((code?: number) => {
      calls.push(`track:${code ?? "undefined"}`)
    })
    spyOn(SessionExport, "shutdown").mockImplementation(async () => {
      calls.push("session")
    })
    spyOn(Telemetry, "shutdown").mockImplementation(async (timeout?: number) => {
      calls.push("telemetry")
      timeouts.push(timeout)
      throw "Timeout while shutting down PostHog. Some events may not have been sent."
    })
    spyOn(InstanceRuntime, "disposeAllInstances").mockImplementation(async () => {
      calls.push("dispose")
    })

    process.exitCode = 0
    await expect(NocowboyCli.shutdown()).resolves.toBeUndefined()
    expect(timeouts).toEqual([2000])
    expect(calls).toEqual(["track:0", "session", "telemetry", "dispose"])
    expect(process.exitCode).toBe(0)
  })

  test("preserves failing command exit status", async () => {
    const { NocowboyCli } = await import("../../src/nocowboy/cli/setup")

    const { Telemetry } = await import("@nocowboy/telemetry")
    const { SessionExport } = await import("@/nocowboy/session-export")
    const { InstanceRuntime } = await import("@/project/instance-runtime")

    spyOn(Telemetry, "trackCliExit").mockImplementation((code?: number) => {
      calls.push(`track:${code ?? "undefined"}`)
    })
    spyOn(SessionExport, "shutdown").mockImplementation(async () => {
      calls.push("session")
    })
    spyOn(Telemetry, "shutdown").mockImplementation(async (timeout?: number) => {
      calls.push("telemetry")
      timeouts.push(timeout)
    })
    spyOn(InstanceRuntime, "disposeAllInstances").mockImplementation(async () => {
      calls.push("dispose")
    })

    process.exitCode = 1
    await NocowboyCli.shutdown()
    expect(timeouts).toEqual([2000])
    expect(calls).toEqual(["track:1", "session", "telemetry", "dispose"])
    expect(process.exitCode).toBe(1)
  })
})
