/**
 * SolidJS i18n контекст для TUI.
 * Читает lang из TuiConfig и предоставляет t(key) функцию.
 */
import { createContext, useContext, createMemo, type ParentProps, type Accessor } from "solid-js"
import { I18n } from "@/nocowboy/ui/i18n"

export type T = (key: I18n.Key) => string

const I18nContext = createContext<T>()

export function I18nProvider(props: ParentProps<{ lang: Accessor<string> }>) {
  const t: T = (key) => {
    const strings = I18n.getStrings(props.lang())
    return strings[key] ?? key
  }
  return (
    <I18nContext.Provider value={t}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useI18n(): T {
  const ctx = useContext(I18nContext)
  if (!ctx) return (key) => key // fallback — просто возвращаем ключ
  return ctx
}
