import { describe, expect, test } from "bun:test"
import {
  hasRouteDirective,
  normalizeHandoff,
  parseHandoff,
  parseHandoffAny,
  parseRoute,
  renderHandoff,
  routeToHandoff,
  stripRouteDirective,
} from "@/session/router"

const handoff = {
  target: "worker",
  reason: "design is done",
  context: "implement the widget in src/widget.ts",
  artifacts: ["docs/design.md"],
}

describe("structured Handoff", () => {
  test("parses a fenced handoff block", () => {
    const text = `prose\n\`\`\`handoff\n${JSON.stringify(handoff)}\n\`\`\`\ntrailing`
    expect(parseHandoff(text)).toEqual(handoff)
  })

  test("parses an inline #handoff JSON", () => {
    expect(parseHandoff(`#handoff: ${JSON.stringify(handoff)}`)).toEqual(handoff)
  })

  test("returns null on malformed JSON, missing target, or absence", () => {
    expect(parseHandoff("```handoff\n{not json}\n```")).toBeNull()
    expect(parseHandoff('```handoff\n{"reason":"x"}\n```')).toBeNull()
    expect(parseHandoff("no handoff here")).toBeNull()
  })

  test("normalizeHandoff defaults reason/context and filters non-string artifacts", () => {
    expect(normalizeHandoff({ target: " worker ", artifacts: ["a.md", 7, "", "b.md"] })).toEqual({
      target: "worker",
      reason: "",
      context: "",
      artifacts: ["a.md", "b.md"],
    })
    expect(normalizeHandoff({})).toBeNull()
    expect(normalizeHandoff("nope")).toBeNull()
  })

  test("renderHandoff round-trips through parseHandoff", () => {
    expect(parseHandoff(renderHandoff(handoff))).toEqual(handoff)
  })
})

describe("legacy #route: as a compatibility adapter", () => {
  const text = "#route: reviewer check the diff\nLook for regressions."

  test("the legacy parser still works", () => {
    expect(hasRouteDirective(text)).toBe(true)
    expect(parseRoute(text)).toEqual({
      agent: "reviewer",
      description: "check the diff",
      prompt: "Look for regressions.",
    })
  })

  test("routeToHandoff maps the directive onto the typed Handoff", () => {
    expect(routeToHandoff(parseRoute(text)!)).toEqual({
      target: "reviewer",
      reason: "check the diff",
      context: "Look for regressions.",
      artifacts: [],
    })
  })

  test("stripRouteDirective removes the legacy directive", () => {
    expect(stripRouteDirective(text)).toBe("Look for regressions.")
  })
})

describe("parseHandoffAny — one entry point for the session loop", () => {
  test("prefers the structured handoff", () => {
    const text = `\`\`\`handoff\n${JSON.stringify(handoff)}\n\`\`\`\n#route: reviewer other`
    expect(parseHandoffAny(text)).toEqual(handoff)
  })

  test("falls back to the legacy #route adapter", () => {
    expect(parseHandoffAny("#route: planner plan it")?.target).toBe("planner")
  })

  test("returns null when neither is present", () => {
    expect(parseHandoffAny("just a normal answer")).toBeNull()
  })
})
