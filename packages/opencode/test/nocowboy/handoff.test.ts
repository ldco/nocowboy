import { describe, expect, test } from "bun:test"
import {
  handoffFromRoute,
  hasHandoff,
  parseHandoff,
  renderHandoff,
  resolveHandoff,
  type Handoff,
} from "@/nocowboy/session/agent-handoff"

const full: Handoff = {
  target: "worker",
  reason: "implement the change",
  context: "Add the endpoint and its test.",
  artifacts: ["src/a.ts", "test/a.test.ts"],
}

describe("parseHandoff (structured directive)", () => {
  test("parses a full directive", () => {
    expect(parseHandoff(renderHandoff(full))).toEqual(full)
  })

  test("defaults optional fields and filters non-string artifacts", () => {
    const parsed = parseHandoff('#handoff: {"target":"reviewer","artifacts":["ok", 3, null]}')
    expect(parsed).toEqual({ target: "reviewer", reason: "", context: "", artifacts: ["ok"] })
  })

  test("returns null when absent, empty, malformed, or missing target", () => {
    expect(parseHandoff("just prose")).toBeNull()
    expect(parseHandoff("#handoff:")).toBeNull()
    expect(parseHandoff("#handoff: not json")).toBeNull()
    expect(parseHandoff('#handoff: {"reason":"no target"}')).toBeNull()
  })

  test("finds the directive anywhere in a multi-line answer", () => {
    expect(parseHandoff(`Some prose.\n${renderHandoff(full)}\nMore prose.`)).toEqual(full)
  })
})

describe("renderHandoff", () => {
  test("round-trips and is deterministic", () => {
    expect(renderHandoff(full)).toBe(renderHandoff(full))
    expect(parseHandoff(renderHandoff(full))).toEqual(full)
  })
})

describe("handoffFromRoute (legacy compatibility adapter)", () => {
  test("maps the #route fields onto the Handoff shape", () => {
    expect(handoffFromRoute({ agent: "worker", description: "do it", prompt: "body text" })).toEqual({
      target: "worker",
      reason: "do it",
      context: "body text",
      artifacts: [],
    })
  })

  test("falls back to a reason when the route had no description", () => {
    expect(handoffFromRoute({ agent: "worker", description: "", prompt: "body" }).reason).toBe("routed to worker")
  })
})

describe("resolveHandoff", () => {
  test("adapts a legacy #route directive", () => {
    expect(resolveHandoff("#route: worker implement\nDo the thing.")).toEqual({
      target: "worker",
      reason: "implement",
      context: "Do the thing.",
      artifacts: [],
    })
  })

  test("the structured directive wins when both are present", () => {
    const text = `#route: someone else\n${renderHandoff(full)}`
    expect(resolveHandoff(text)).toEqual(full)
  })

  test("returns null when neither form is present", () => {
    expect(resolveHandoff("nothing to route")).toBeNull()
  })
})

describe("hasHandoff", () => {
  test("detects both forms", () => {
    expect(hasHandoff(renderHandoff(full))).toBe(true)
    expect(hasHandoff("#route: worker do it")).toBe(true)
    expect(hasHandoff("plain text")).toBe(false)
  })
})
