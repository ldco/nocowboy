import { describe, expect, test } from "bun:test"
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, resolveLanguage } from "@/nocowboy/ui/language"

describe("resolveLanguage", () => {
  test("the TUI config wins over the project config", () => {
    expect(resolveLanguage({ tui: "ru", config: "en" })).toBe("ru")
    expect(resolveLanguage({ tui: "en", config: "ru" })).toBe("en")
  })

  test("falls back to the synced project config", () => {
    expect(resolveLanguage({ config: "ru" })).toBe("ru")
  })

  test("defaults to en when nothing is set", () => {
    expect(resolveLanguage({})).toBe(DEFAULT_LANGUAGE)
    expect(resolveLanguage({ tui: undefined, config: undefined })).toBe("en")
  })

  test("ignores unsupported values at either level", () => {
    expect(resolveLanguage({ tui: "de", config: "ru" })).toBe("ru")
    expect(resolveLanguage({ tui: 5, config: null })).toBe("en")
    expect(resolveLanguage({ config: "zz" })).toBe("en")
  })

  test("honours an explicit fallback", () => {
    expect(resolveLanguage({ fallback: "ru" })).toBe("ru")
  })
})

describe("isLanguage", () => {
  test("accepts only the supported languages", () => {
    expect(LANGUAGES.map(isLanguage)).toEqual([true, true])
    expect(isLanguage("de")).toBe(false)
    expect(isLanguage(undefined)).toBe(false)
    expect(isLanguage(1)).toBe(false)
  })
})
