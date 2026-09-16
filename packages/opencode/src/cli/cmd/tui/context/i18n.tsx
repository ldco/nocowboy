/**
 * SolidJS i18n контекст для TUI.
 * Читает lang из TuiConfig и предоставляет t(key) функцию.
 *
 * Besides the hook, a module-level `t` is exported so any component can translate
 * a literal without threading a hook through every file. It reads a signal, so
 * JSX expressions re-render when the language changes.
 */
import { createContext, useContext, createSignal, createEffect, type ParentProps, type Accessor } from "solid-js"
import { I18n, translatePhrase } from "@/nocowboy/ui/i18n"

export type T = (key: I18n.Key, params?: Record<string, string | number>) => string

const I18nContext = createContext<T>()

const [currentLang, setCurrentLang] = createSignal("en")

/** Translate a key with the current language. Reactive: reads a signal. */
export const t: T = (key, params) => {
  const strings = I18n.getStrings(currentLang())
  const raw = strings[key] ?? key
  if (!params) return raw
  // {name} placeholders so hints can keep their wording in both languages
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => (params[name] !== undefined ? String(params[name]) : `{${name}}`))
}

/**
 * Translate a phrase that is registered as data (palette title, key-binding
 * description, group, category). Unknown phrases pass through unchanged.
 */
export const p = (text: string): string => translatePhrase(text, currentLang())

export function I18nProvider(props: ParentProps<{ lang: Accessor<string> }>) {
  createEffect(() => setCurrentLang(props.lang()))
  return <I18nContext.Provider value={t}>{props.children}</I18nContext.Provider>
}

export function useI18n(): T {
  const ctx = useContext(I18nContext)
  if (!ctx) return t // fallback — до провайдера возвращаем ключ
  return ctx
}
