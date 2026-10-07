/**
 * Migration contract — locale switching.
 *
 * RU/EN string tables are independent; switching locale mid-session just selects
 * a table, and two projects with different locales do not share state.
 */
import { describe, expect, test } from "bun:test"
import { I18n, translatePhrase } from "@/nocowboy/ui/i18n"

describe("locale switching", () => {
  test("ru and en tables have the same keys", () => {
    const ru = I18n.getStrings("ru")
    const en = I18n.getStrings("en")
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())
  })

  test("switching the locale is a pure lookup", () => {
    const ru = I18n.getStrings("ru")
    const en = I18n.getStrings("en")
    const key = Object.keys(en)[0] as keyof typeof en
    expect(ru[key]).toBeDefined()
    expect(en[key]).toBeDefined()
    // Re-reading does not mutate either table (two projects stay independent).
    expect(I18n.getStrings("ru")[key]).toBe(ru[key])
    expect(I18n.getStrings("en")[key]).toBe(en[key])
  })

  test("data-registered phrases translate for ru and pass through for en", () => {
    expect(translatePhrase("Agent", "ru")).toBe("Агент")
    expect(translatePhrase("Agent", "en")).toBe("Agent")
    expect(translatePhrase("__not_registered__", "ru")).toBe("__not_registered__")
  })
})
