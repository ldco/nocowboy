import { describe, expect, test } from "bun:test"
import { I18n } from "../../src/nocowboy/ui/i18n"

// The dictionary is typed as Record<I18n.Key, string>, so a missing translation is
// a type error; this also guards against silently adding a key to only one locale.
describe("i18n dictionary", () => {
  test("every key exists in both locales with a non-empty value", () => {
    const ru = I18n.getStrings("ru")
    const en = I18n.getStrings("en")
    const keys = Object.keys(en) as I18n.Key[]
    expect(keys.length).toBeGreaterThan(30)
    for (const key of keys) {
      expect(typeof ru[key as I18n.Key]).toBe("string")
      expect(ru[key as I18n.Key].length).toBeGreaterThan(0)
      expect(en[key as I18n.Key].length).toBeGreaterThan(0)
    }
  })

  test("selects the locale from the lang code", () => {
    expect(I18n.getStrings("ru")["sidebar.settings"]).toBe("Настройки")
    expect(I18n.getStrings("ru-RU")["sidebar.settings"]).toBe("Настройки")
    expect(I18n.getStrings("en")["sidebar.settings"]).toBe("Settings")
    expect(I18n.getStrings("de")["sidebar.settings"]).toBe("Settings")
  })

  test("the newer sidebar and session keys are translated", () => {
    expect(I18n.getStrings("ru")["sessions.allWorktrees"]).toContain("worktree")
    expect(I18n.getStrings("ru")["sidebar.templates"]).toBe("Шаблоны")
    expect(I18n.getStrings("en")["sidebar.templates"]).toBe("Templates")
  })
})
