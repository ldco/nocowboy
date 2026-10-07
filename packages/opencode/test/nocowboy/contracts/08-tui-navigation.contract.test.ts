/**
 * Migration contract — TUI navigation surface.
 *
 * Keybindings are data: every binding is well-formed, ids are unique, and the
 * navigation groups the TUI relies on are present. Simulated mouse events are an
 * OpenTUI framework concern, not the engine's — the pinned seam is the keybind
 * data surface plus the prompt focus/selection capture (computePromptTraits).
 */
import { describe, expect, test } from "bun:test"
import { NoCowboyKeybinds } from "@/nocowboy/tui/keybinds"
import { computePromptTraits } from "@/cli/cmd/tui/component/prompt/traits"

describe("TUI navigation keybinds", () => {
  const list = NoCowboyKeybinds.list()

  test("every binding is well-formed", () => {
    expect(list.length).toBeGreaterThan(0)
    for (const kb of list) {
      expect(kb.id.length).toBeGreaterThan(0)
      expect(kb.label.length).toBeGreaterThan(0)
      expect(kb.group.length).toBeGreaterThan(0)
      expect(typeof kb.default).toBe("string")
      expect(typeof kb.description).toBe("string")
    }
  })

  test("binding ids are unique", () => {
    const ids = list.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("core navigation groups exist", () => {
    const groups = new Set(list.map((k) => k.group))
    // The TUI navigates between messages, sessions and input history.
    expect(groups.has("Messages")).toBe(true)
    expect(groups.has("Sessions")).toBe(true)
    expect(groups.has("Input history")).toBe(true)
  })
})

describe("TUI prompt focus/selection capture", () => {
  test("autocomplete open captures navigation keys", () => {
    const traits = computePromptTraits({ mode: "normal", autocompleteVisible: true })
    expect(traits.capture).toContain("navigate")
    expect(traits.capture).toContain("escape")
    // Focus changes must never unsuspend the keymap-managed editor mappings.
    expect((traits as { suspend?: unknown }).suspend).toBeUndefined()
  })

  test("shell mode releases capture and reports SHELL", () => {
    const traits = computePromptTraits({ mode: "shell", autocompleteVisible: false })
    expect(traits.capture).toBeUndefined()
    expect(traits.status).toBe("SHELL")
  })
})
