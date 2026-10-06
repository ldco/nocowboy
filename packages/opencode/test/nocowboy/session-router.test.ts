import { describe, expect, test } from "bun:test"
import { hasRouteDirective, parseRoute, stripRouteDirective } from "@/session/router"
import { handoffFromRoute } from "@/nocowboy/session/agent-handoff"

// Regression guard for the legacy `#route:` directive: the structured handoff
// keeps it working as a compatibility adapter, so the textual parser must stay
// behaviourally identical.
describe("legacy #route parser (compatibility)", () => {
  test("parses agent, description and body", () => {
    expect(parseRoute("#route: worker implement the feature\nDo the thing carefully.")).toEqual({
      agent: "worker",
      description: "implement the feature",
      prompt: "Do the thing carefully.",
    })
  })

  test("a single-line directive uses a generated prompt", () => {
    expect(parseRoute("#route: reviewer")).toEqual({
      agent: "reviewer",
      description: "",
      prompt: "Route to reviewer.",
    })
  })

  test("a directive without a body uses the description as the prompt", () => {
    expect(parseRoute("#route: worker just this")).toEqual({
      agent: "worker",
      description: "just this",
      prompt: "just this",
    })
  })

  test("returns null without a directive", () => {
    expect(parseRoute("no route here")).toBeNull()
  })

  test("hasRouteDirective only matches a directive at the start of a line", () => {
    expect(hasRouteDirective("#route: worker x")).toBe(true)
    expect(hasRouteDirective("prose\n#route: worker x")).toBe(true)
    expect(hasRouteDirective("#route:")).toBe(false)
    expect(hasRouteDirective("see #route: in prose")).toBe(false)
  })

  test("stripRouteDirective removes the directive line", () => {
    expect(stripRouteDirective("#route: worker do it\nvisible answer")).toBe("visible answer")
  })

  test("the adapter preserves the legacy directive's meaning", () => {
    const route = parseRoute("#route: worker implement\nBody.")!
    expect(handoffFromRoute(route)).toEqual({
      target: "worker",
      reason: "implement",
      context: "Body.",
      artifacts: [],
    })
  })
})
