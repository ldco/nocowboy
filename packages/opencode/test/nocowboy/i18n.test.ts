import { describe, expect, test } from "bun:test"
import { I18n, phrases, translatePhrase } from "../../src/nocowboy/ui/i18n"

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

// Command palette titles, key-binding descriptions, groups and categories are
// registered as data, so they are translated by phrase rather than by key.
describe("phrase translation", () => {
  test("translates a known palette title in Russian", () => {
    expect(translatePhrase("New session", "ru")).toBe("Новая сессия")
    expect(translatePhrase("Toggle sidebar", "ru")).toBe("Показать/скрыть сайдбар")
  })

  test("translates groups and categories", () => {
    expect(translatePhrase("Permission", "ru")).toBe("Разрешения")
    expect(translatePhrase("Session", "ru")).toBe("Сессия")
  })

  test("passes unknown phrases and non-Russian languages through", () => {
    expect(translatePhrase("New session", "en")).toBe("New session")
    expect(translatePhrase("gpt-5.1-codex", "ru")).toBe("gpt-5.1-codex")
    expect(translatePhrase("", "ru")).toBe("")
  })

  test("every collected phrase has a non-empty Russian translation", () => {
    // Guards the table itself: no accidental empty values.
    for (const [english, russian] of Object.entries(phrases) as [string, string][]) {
      expect(english.length).toBeGreaterThan(0)
      expect(russian.length).toBeGreaterThan(0)
    }
  })
})
