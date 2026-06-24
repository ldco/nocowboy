import { describe, expect, test } from "bun:test"
import { plain, session, supports, tui } from "../../src/nocowboy/cli/logo"

describe("nocowboy logo", () => {
  test("supports unicode on non-win32 when NOCOWBOY_LOGO is not 'no'", () => {
    expect(supports({}, "linux")).toBe(true)
    expect(supports({ NOCOWBOY_LOGO: "1" }, "linux")).toBe(true)
    expect(supports({ NOCOWBOY_LOGO: "true" }, "linux")).toBe(true)
    expect(supports({ NOCOWBOY_LOGO: "yes" }, "linux")).toBe(true)
    expect(supports({}, "darwin")).toBe(true)
  })

  test("falls back when NOCOWBOY_LOGO is 'no'", () => {
    expect(supports({ NOCOWBOY_LOGO: "no" }, "linux")).toBe(false)
  })

  test("falls back on win32 platform regardless of env", () => {
    expect(supports({}, "win32")).toBe(false)
    expect(supports({ NOCOWBOY_LOGO: "1" }, "win32")).toBe(false)
    expect(supports({ WT_SESSION: "session" }, "win32")).toBe(false)
    expect(supports({}, "win32" as any)).toBe(false)
  })

  test("tui returns logo lines array", () => {
    const supported = tui({}, "linux")
    expect(supported).toBeArray()
    expect(supported.length).toBeGreaterThan(0)

    const fallback = tui({}, "win32")
    expect(fallback).toBeArray()
    expect(fallback.length).toBeGreaterThan(0)
  })

  test("plain returns logo lines array", () => {
    const supported = plain({}, "linux")
    expect(supported).toBeArray()
    expect(supported.length).toBeGreaterThan(0)

    const fallback = plain({}, "win32")
    expect(fallback).toBeArray()
    expect(fallback.length).toBeGreaterThan(0)
  })

  test("session formats output with id, name, workspace metadata", () => {
    const out = session("Title", "ses_test", "<dim>", {}, "win32")
    expect(out).toBeArray()
    expect(out.some((line) => line.includes("session") && line.includes("Title"))).toBe(true)
    expect(out.some((line) => line.includes("ses_test"))).toBe(true)
    expect(out.some((line) => line.includes("<dim>"))).toBe(true)
    const w = out[0].length
    expect(out.every((line) => line.length === w)).toBe(true)
  })

  test("session uses supports() to select logo variant", () => {
    const supported = session("id", "name", "ws", { NOCOWBOY_LOGO: "1" }, "linux")
    const fallback = session("id", "name", "ws", { NOCOWBOY_LOGO: "no" }, "linux")
    expect(supported).toBeArray()
    expect(fallback).toBeArray()
    expect(supported.length).toBe(fallback.length)
  })
})
