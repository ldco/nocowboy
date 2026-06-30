// kilocode_change - new file
import { describe, expect, test } from "bun:test"
import { NoCowboySessionProcessor } from "../../src/nocowboy/session/processor"
import type { MessageV2 } from "../../src/session/message-v2"

const REVIEW_COMMANDS = ["review", "local-review", "local-review-uncommitted"] as const

const expected = (command: (typeof REVIEW_COMMANDS)[number]) => ({
  mode: "review" as const,
  feature: "code_reviews" as const,
  command,
})

describe("NoCowboySessionProcessor.reviewTelemetry", () => {
  for (const command of REVIEW_COMMANDS) {
    test(`returns telemetry for ${command}`, () => {
      expect(NoCowboySessionProcessor.reviewTelemetry(command)).toEqual(expected(command))
    })
  }

  test("returns undefined for an unrelated command", () => {
    expect(NoCowboySessionProcessor.reviewTelemetry("init")).toBeUndefined()
  })

  test("returns undefined for an undefined command", () => {
    expect(NoCowboySessionProcessor.reviewTelemetry(undefined)).toBeUndefined()
  })
})

describe("NoCowboySessionProcessor.markReviewTelemetry", () => {
  for (const command of REVIEW_COMMANDS) {
    test(`stamps text parts with telemetry for ${command}`, () => {
      const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [
        { type: "text", metadata: { existing: "keep" } },
        { type: "file" },
        { type: "text" },
      ]
      const tel = NoCowboySessionProcessor.markReviewTelemetry(parts, command)
      expect(tel).toEqual(expected(command))
      expect(parts[0].metadata).toEqual({ existing: "keep", ...expected(command) })
      expect(parts[1].metadata).toBeUndefined()
      expect(parts[2].metadata).toEqual({ ...expected(command) })
    })
  }

  test("does nothing for an unrelated command", () => {
    const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [{ type: "text" }]
    expect(NoCowboySessionProcessor.markReviewTelemetry(parts, "init")).toBeUndefined()
    expect(parts[0].metadata).toBeUndefined()
  })

  test("does nothing for an undefined command", () => {
    const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [{ type: "text" }]
    expect(NoCowboySessionProcessor.markReviewTelemetry(parts, undefined)).toBeUndefined()
    expect(parts[0].metadata).toBeUndefined()
  })
})

describe("NoCowboySessionProcessor.extractReviewTelemetry", () => {
  for (const command of REVIEW_COMMANDS) {
    test(`recovers ${command} telemetry from marked text parts`, () => {
      const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [{ type: "text" }]
      NoCowboySessionProcessor.markReviewTelemetry(parts, command)
      const round = NoCowboySessionProcessor.extractReviewTelemetry(parts as unknown as MessageV2.Part[])
      expect(round).toEqual(expected(command))
    })
  }

  test("returns undefined when parts have no review metadata", () => {
    const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [
      { type: "text" },
      { type: "text", metadata: { foo: "bar" } },
    ]
    expect(NoCowboySessionProcessor.extractReviewTelemetry(parts as unknown as MessageV2.Part[])).toBeUndefined()
  })

  test("returns undefined when command in metadata is unknown", () => {
    const parts: Array<{ type: string; metadata?: Record<string, unknown> }> = [
      { type: "text", metadata: { mode: "review", feature: "code_reviews", command: "unknown" } },
    ]
    expect(NoCowboySessionProcessor.extractReviewTelemetry(parts as unknown as MessageV2.Part[])).toBeUndefined()
  })
})

describe("NoCowboySessionProcessor.suggestionReviewTelemetry", () => {
  test("returns suggest-sourced telemetry for accepted review commands", () => {
    expect(
      NoCowboySessionProcessor.suggestionReviewTelemetry({
        accepted: { prompt: "/local-review-uncommitted --focus telemetry" },
      }),
    ).toEqual({ ...expected("local-review-uncommitted"), tool: "suggest" })
  })

  test("returns undefined for accepted non-review commands", () => {
    expect(NoCowboySessionProcessor.suggestionReviewTelemetry({ accepted: { prompt: "/test" } })).toBeUndefined()
  })

  test("returns undefined when accepted prompt is not a slash command", () => {
    expect(NoCowboySessionProcessor.suggestionReviewTelemetry({ accepted: { prompt: "Run tests" } })).toBeUndefined()
  })

  test("returns undefined when accepted metadata is missing", () => {
    expect(NoCowboySessionProcessor.suggestionReviewTelemetry({ dismissed: true })).toBeUndefined()
  })
})

describe("NoCowboySessionProcessor.extractSuggestionReviewTelemetry", () => {
  test("recovers review telemetry from completed suggest tool metadata", () => {
    const parts = [
      {
        type: "tool",
        tool: "suggest",
        state: {
          status: "completed",
          metadata: { accepted: { prompt: "/local-review" } },
        },
      },
    ]

    expect(NoCowboySessionProcessor.extractSuggestionReviewTelemetry(parts as unknown as MessageV2.Part[])).toEqual({
      ...expected("local-review"),
      tool: "suggest",
    })
  })
})
