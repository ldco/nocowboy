import { For, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { TextAttributes, RGBA } from "@opentui/core"
import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

export function InfoScreen() {
  const theme = useTheme().theme
  const project = useProject()
  const sync = useSync()

  const rows = createMemo(() => {
    const items: { label: string; value: string }[] = []
    const dir = project.data.instance.path.directory
    if (dir) items.push({ label: "Directory", value: dir })
    const v = sync.data.globalConfig as any
    if (v?.directory) items.push({ label: "Config", value: v.directory })
    items.push({ label: "Version", value: "local" })
    return items
  })

  return (
    <box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
      <text attributes={TextAttributes.BOLD} fg={brand} paddingBottom={1}>
        NoCowboy Info
      </text>
      <For each={rows()}>
        {(row) => (
          <box flexDirection="row" gap={2}>
            <text fg={theme.textMuted} minWidth={12}>
              {row.label}:
            </text>
            <text fg={theme.text}>{row.value}</text>
          </box>
        )}
      </For>
    </box>
  )
}
