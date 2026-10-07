import { describe, expect, test } from "bun:test"
import { renderPromptTemplate } from "../../src/mcp/prompt-template"

describe("renderPromptTemplate", () => {
  test("renders multi-message text joined by newline", () => {
    const out = renderPromptTemplate(
      {
        messages: [
          { content: { type: "text", text: "first" } },
          { content: { type: "text", text: "second" } },
        ],
      },
      { client: "nutausik", name: "dream" },
    )
    expect(out).toBe("first\nsecond")
  })

  test("non-text parts become empty strings", () => {
    const image = { type: "image", data: "aGVsbG8=", mimeType: "image/png" }
    const out = renderPromptTemplate(
      {
        messages: [
          { content: { type: "text", text: "hello" } },
          { content: image },
          { content: { type: "text", text: "world" } },
        ],
      },
      { client: "c", name: "n" },
    )
    expect(out).toBe("hello\n\nworld")
  })

  test("a text part without a text field renders empty, not 'undefined'", () => {
    const out = renderPromptTemplate({ messages: [{ content: { type: "text" } }] }, { client: "c", name: "n" })
    expect(out).toBe("")
  })

  test("an undefined template throws naming the prompt and client, never empty", () => {
    let error: unknown
    try {
      renderPromptTemplate(undefined, { client: "nutausik", name: "dream" })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("dream")
    expect((error as Error).message).toContain("nutausik")
    expect((error as Error).message).not.toBe("")
  })
})
