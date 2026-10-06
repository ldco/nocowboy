/**
 * Wraps the TUI in the i18n context using the configured language.
 *
 * Must sit inside TuiConfigProvider and SyncProvider: the language is resolved
 * from the TUI config (`lang` in tui.json) first, then the synced project config
 * (`lang` in nocowboy.json, persisted by the language switcher), then `en`.
 */
import type { ParentProps } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useTuiConfig } from "@tui/context/tui-config"
import { I18nProvider } from "@tui/context/i18n"
import { resolveLanguage } from "@/nocowboy/ui/language"

export function NoCowboyI18n(props: ParentProps) {
  const sync = useSync()
  const tui = useTuiConfig()
  const lang = () =>
    resolveLanguage({
      tui: tui.lang,
      config: (sync.data.config as { lang?: string } | undefined)?.lang,
    })
  return <I18nProvider lang={lang}>{props.children}</I18nProvider>
}
