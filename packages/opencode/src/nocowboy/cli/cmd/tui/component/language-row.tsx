/**
 * Language switcher for the TUI settings.
 *
 * Writes `lang` to the config (the same way the LSP toggle writes `lsp`) and
 * updates the local sync state, so the i18n bridge re-renders every label
 * immediately. Kept in the nocowboy mirror: the upstream settings tab only
 * mounts it behind a single marker.
 */
import { createMemo, For } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useProject } from "@tui/context/project"
import { useI18n } from "@tui/context/i18n"

const LANGUAGES = ["ru", "en"] as const

export function LanguageRow() {
  const { theme } = useTheme()
  const sync = useSync()
  const sdk = useSDK()
  const project = useProject()
  const t = useI18n()

  const current = createMemo(() => (sync.data.config as { lang?: string } | undefined)?.lang ?? "en")

  const select = (lang: string) => {
    if (current() === lang) return
    const dir = project.instance.directory() ?? ""
    sync.set("config", { ...((sync.data.config as Record<string, unknown> | undefined) ?? {}), lang })
    sdk.client.config
      .update({ directory: dir, config: { lang } })
      .catch((error: unknown) => console.warn("[i18n] failed to persist language", error))
  }

  return (
    <box flexDirection="column">
      <text attributes={TextAttributes.BOLD} fg={theme.text}>
        {t("settings.language")}
      </text>
      <box flexDirection="row" gap={1}>
        <For each={LANGUAGES}>
          {(lang) => (
            <text
              fg={current() === lang ? theme.accent : theme.textMuted}
              onMouseDown={() => select(lang)}
            >
              {current() === lang ? `[${lang.toUpperCase()}]` : lang.toUpperCase()}
            </text>
          )}
        </For>
      </box>
    </box>
  )
}
