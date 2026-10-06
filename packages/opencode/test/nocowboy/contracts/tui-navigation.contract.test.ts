import { describe, expect, test } from "bun:test"
import { handleSelectionKey } from "@/cli/cmd/tui/util/selection"

function harness(selectedText: string | null, focusedHasSelection = false) {
  const cleared: number[] = []
  const focus = { hasSelection: () => focusedHasSelection }
  const renderer = {
    getSelection: () =>
      selectedText === null ? null : { getSelectedText: () => selectedText, selectedRenderables: [focus] },
    clearSelection: () => cleared.push(1),
    currentFocusedRenderable: focus,
  }
  const toast = { show: () => {}, error: () => {} }
  return { renderer, toast, cleared }
}

const event = (name: string, ctrl = false) => {
  let prevented = false
  let stopped = false
  return {
    name,
    ctrl,
    preventDefault: () => (prevented = true),
    stopPropagation: () => (stopped = true),
    get prevented() {
      return prevented
    },
    get stopped() {
      return stopped
    },
  }
}

describe("contract: TUI selection/navigation", () => {
  test("no selection → the key is left to normal navigation", () => {
    const { renderer, toast, cleared } = harness(null)
    handleSelectionKey(renderer, toast, event("up"))
    expect(cleared).toHaveLength(0)
  })

  test("escape clears the selection and consumes the key", () => {
    const { renderer, toast, cleared } = harness("hello")
    const key = event("escape")
    handleSelectionKey(renderer, toast, key)
    expect(cleared).toHaveLength(1)
    expect(key.prevented).toBe(true)
    expect(key.stopped).toBe(true)
  })

  test("ctrl+c copies the selection and consumes the key", () => {
    const { renderer, toast, cleared } = harness("hello")
    const key = event("c", true)
    handleSelectionKey(renderer, toast, key)
    expect(key.prevented).toBe(true)
    expect(cleared).toHaveLength(1)
  })

  test("a focused renderable that has a selection keeps it on an unrelated key", () => {
    const { renderer, toast, cleared } = harness("hello", true)
    handleSelectionKey(renderer, toast, event("up"))
    expect(cleared).toHaveLength(0)
  })

  test("an unrelated key without a focused selection clears it", () => {
    const { renderer, toast, cleared } = harness("hello", false)
    handleSelectionKey(renderer, toast, event("up"))
    expect(cleared).toHaveLength(1)
  })
})
