/**
 * Regression: `hasNutausik()` used to cache a negative probe for 30s. During
 * startup the MCP proxy is not listening yet, so the first probe failed and
 * every probe for the next 30s kept reporting "dead" even after the proxy came
 * up — which is what left sessions without an active NUTAUSIK MCP connection.
 * A positive result is still cached.
 */
import { expect, test } from "bun:test"

let mode: "fail" | "ok" = "fail"
let fetchCalls = 0

globalThis.fetch = (async () => {
  fetchCalls++
  if (mode === "fail") throw new Error("Unable to connect. Is the computer able to access the url?")
  return { ok: true } as Response
}) as unknown as typeof fetch

const { hasNutausik } = await import("@/nocowboy/nutausik-client")

test("a failed probe is not cached, so the next probe can succeed", async () => {
  mode = "fail"
  expect(await hasNutausik()).toBe(false)

  mode = "ok"
  expect(await hasNutausik()).toBe(true)
})

test("a successful probe is cached", async () => {
  mode = "ok"
  const before = fetchCalls
  expect(await hasNutausik()).toBe(true)
  expect(fetchCalls).toBe(before)
})
