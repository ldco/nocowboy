import { describe, expect, test } from "bun:test"
import {
  createButtonPort,
  isClick,
  nextScreen,
  prevScreen,
  SCREEN_ORDER,
  screenIndex,
  type ScreenKey,
} from "@/nocowboy/ui/input-port"

describe("screen order and navigation", () => {
  test("the order is the builtin screen then the app screens", () => {
    expect([...SCREEN_ORDER]).toEqual(["chat", "api", "git", "db", "files", "edit"])
  })

  test("next wraps at the end, prev wraps at the start", () => {
    expect(nextScreen("chat")).toBe("api")
    expect(nextScreen("edit")).toBe("chat")
    expect(prevScreen("chat")).toBe("edit")
    expect(prevScreen("api")).toBe("chat")
  })

  test("screenIndex reports the position (and -1 for unknown)", () => {
    expect(screenIndex("git")).toBe(2)
    expect(screenIndex("screensaver" as ScreenKey)).toBe(-1)
  })

  test("navigation is overridable by a custom order", () => {
    const order: readonly ScreenKey[] = ["chat", "api"]
    expect(nextScreen("api", order)).toBe("chat")
    expect(prevScreen("chat", order)).toBe("api")
  })
})

describe("isClick — propagation", () => {
  test("only the left (button 0, or undefined) is a click", () => {
    expect(isClick(0)).toBe(true)
    expect(isClick("left")).toBe(true)
    expect(isClick(undefined)).toBe(true)
    expect(isClick(1)).toBe(false)
    expect(isClick(2)).toBe(false)
    expect(isClick("right")).toBe(false)
    expect(isClick("middle")).toBe(false)
  })
})

describe("createButtonPort", () => {
  function port(initial: ScreenKey = "chat") {
    let current = initial
    const changes: ScreenKey[] = []
    const button = createButtonPort({
      screen: () => current,
      setScreen: (next) => {
        current = next
        changes.push(next)
      },
    })
    return { button, changes, current: () => current }
  }

  test("active reflects the current screen", () => {
    const { button } = port("git")
    expect(button.active("git")).toBe(true)
    expect(button.active("chat")).toBe(false)
  })

  test("select switches only when different", () => {
    const { button, changes } = port("chat")
    button.select("chat")
    expect(changes).toEqual([])
    button.select("api")
    expect(changes).toEqual(["api"])
  })

  test("move walks the order with wrap-around", () => {
    const { button, current } = port("chat")
    button.move("prev")
    expect(current()).toBe("edit")
    button.move("next")
    expect(current()).toBe("chat")
  })

  test("a left click consumes the event and selects", () => {
    const { button, changes } = port("chat")
    expect(button.click({ button: "left", key: "db" })).toEqual({ handled: true })
    expect(changes).toEqual(["db"])
  })

  test("a right/middle click propagates without switching", () => {
    const { button, changes } = port("chat")
    expect(button.click({ button: "right", key: "db" })).toEqual({ handled: false })
    expect(button.click({ button: "middle", key: "db" })).toEqual({ handled: false })
    expect(changes).toEqual([])
  })
})
