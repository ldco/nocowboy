/**
 * Wraps the TUI in the i18n context using the configured language.
 *
 * Must sit inside SyncProvider (the language comes from the synced config) and
 * above the components that call useI18n().
 */
import type { ParentProps } from "solid-js"
import { useSync } from "@tui/context/sync"
import { I18nProvider } from "@tui/context/i18n"

export function NoCowboyI18n(props: ParentProps) {
  const sync = useSync()
  const lang = () => (sync.data.config as { lang?: string } | undefined)?.lang ?? "en"
  return <I18nProvider lang={lang}>{props.children}</I18nProvider>
}
