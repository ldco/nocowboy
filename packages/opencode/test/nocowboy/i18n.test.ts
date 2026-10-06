import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { I18n, phrases, translatePhrase } from "../../src/nocowboy/ui/i18n"
import { resolveLanguage } from "../../src/nocowboy/ui/language"
import { cacheKey as agentCacheKey } from "../../src/nocowboy/agent/index"
import type { Config } from "../../src/config/config"

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

  test("the sidebar usage labels are translated in both locales", () => {
    const ru = I18n.getStrings("ru")
    const en = I18n.getStrings("en")
    expect(en["sidebar.usage"]).toBe("Token Usage")
    expect(ru["sidebar.usage"]).toBe("Использование токенов")
    expect(ru["sidebar.usage.cached"]).toBe("Из кэша")
    expect(en["sidebar.usage.cached"]).toBe("Cached")
    expect(ru["sidebar.share"]).toBe("Поделиться")
    expect(en["sidebar.share"]).toBe("Share")
  })

  test("the own usage sidebar uses keys, not hardcoded literals", () => {
    const src = readFileSync(path.join(import.meta.dir, "../../src/nocowboy/plugins/sidebar-usage.tsx"), "utf-8")
    for (const literal of ["Token Usage", ">Input<", ">Output<", ">Cached<", "Cost / attempt"]) {
      expect(src, `sidebar-usage.tsx still has the literal ${literal}`).not.toContain(literal)
    }
    expect(src).toContain('t("sidebar.usage")')
    expect(src).toContain('t("sidebar.usage.cached")')
  })
})

describe("locale in the agent cache key and cross-project consistency", () => {
  test("the agent cache key includes lang, so a language switch rebuilds agents", () => {
    expect(agentCacheKey({ lang: "ru" } as Config.Info)).not.toBe(agentCacheKey({ lang: "en" } as Config.Info))
    expect(agentCacheKey({ lang: "ru" } as Config.Info)).toBe(agentCacheKey({ lang: "ru" } as Config.Info))
  })

  test("RU→EN→RU returns to the same strings", () => {
    const ru1 = I18n.getStrings("ru")["sidebar.settings"]
    const en = I18n.getStrings("en")["sidebar.settings"]
    const ru2 = I18n.getStrings("ru")["sidebar.settings"]
    expect(ru1).toBe(ru2)
    expect(ru1).not.toBe(en)
  })

  test("two projects with different locale resolve independently", () => {
    expect(resolveLanguage({ config: "ru" })).toBe("ru")
    expect(resolveLanguage({ config: "en" })).toBe("en")
    expect(resolveLanguage({ tui: "en", config: "ru" })).toBe("en")
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
