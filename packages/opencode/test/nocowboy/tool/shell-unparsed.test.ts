import { describe, expect, test } from "bun:test"
import type { Node } from "web-tree-sitter"
import { unparsed } from "../../../src/nocowboy/tool/shell-unparsed"

// Minimal stand-in for a web-tree-sitter Node — only the surface `unparsed` uses.
function fakeNode(input: {
  text: string
  hasError?: boolean
  errors?: { text: string; commandNames?: number }[]
}): Node {
  return {
    text: input.text,
    hasError: input.hasError ?? false,
    descendantsOfType: (type: string) => {
      if (type === "ERROR") {
        return (input.errors ?? []).map((err) => ({
          text: err.text,
          descendantsOfType: (inner: string) => (inner === "command_name" ? new Array(err.commandNames ?? 0) : []),
        })) as unknown as Node[]
      }
      return []
    },
  } as unknown as Node
}

describe("shell-unparsed (T0.5)", () => {
  test("returns nothing for a clean parse with commands", () => {
    const root = fakeNode({ text: "git status", hasError: false })
    expect(unparsed(root, 1)).toEqual([])
  })

  test("recovers failed command text from ERROR nodes with a command_name", () => {
    // e.g. `git checkout -- file`: tree-sitter-powershell drops it into an ERROR node
    const root = fakeNode({
      text: "git checkout -- file.txt",
      hasError: true,
      errors: [{ text: "git checkout -- file.txt", commandNames: 1 }],
    })
    expect(unparsed(root, 0)).toEqual(["git checkout -- file.txt"])
  })

  test("fails closed with raw input when the parse errored and recovered nothing", () => {
    const root = fakeNode({ text: "cat `echo hi`", hasError: true, errors: [{ text: "`echo hi`", commandNames: 0 }] })
    expect(unparsed(root, 0)).toEqual(["cat `echo hi`"])
  })

  test("ignores ERROR nodes without a command_name when raw text is present", () => {
    const root = fakeNode({ text: "echo hi", hasError: true, errors: [{ text: "  ", commandNames: 0 }] })
    expect(unparsed(root, 0)).toEqual(["echo hi"])
  })

  test("returns nothing for an empty raw command with errors", () => {
    const root = fakeNode({ text: "   ", hasError: true, errors: [] })
    expect(unparsed(root, 0)).toEqual([])
  })
})
