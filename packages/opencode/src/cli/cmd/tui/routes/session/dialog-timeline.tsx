import { TextAttributes } from "@opentui/core"
import { createMemo, For, onMount } from "solid-js"
import { useSync } from "@tui/context/sync"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog, type DialogContext } from "@tui/ui/dialog"
import { useTheme } from "@tui/context/theme"
import type { Snapshot } from "@/snapshot"
import type { PromptInfo } from "../../component/prompt/history"

function formatDiff(diff: Snapshot.FileDiff): string {
  const lines: string[] = []
  if (diff.file) lines.push(`File: ${diff.file}`)
  if (diff.status) lines.push(`Status: ${diff.status}`)
  lines.push(`Changes: +${diff.additions}/-${diff.deletions}`)
  if (diff.patch) {
    lines.push("")
    lines.push(diff.patch)
  }
  return lines.join("\n")
}

export function DialogTimeline(props: {
  sessionID: string
  onMove: (messageID: string) => void
  setPrompt?: (prompt: PromptInfo) => void
}) {
  const sync = useSync()
  const dialog = useDialog()
  const { theme } = useTheme()

  onMount(() => {
    dialog.setSize("large")
  })

  const diffs = createMemo((): Snapshot.FileDiff[] => {
    return sync.data.session_diff[props.sessionID] ?? []
  })

  const options = createMemo((): DialogSelectOption<string>[] => {
    return diffs().map((diff, index) => ({
      title: diff.file ?? "(unknown file)",
      value: `diff-${index}`,
      description: diff.status
        ? `${diff.status}  +${diff.additions}/-${diff.deletions}`
        : `+${diff.additions}/-${diff.deletions}`,
      footer: diff.status ?? "",
      onSelect: (_ctx: DialogContext) => {
        const content = formatDiff(diff)
        _ctx.replace(() => DiffViewer({ content }))
      },
    }))
  })

  const summaryLine = createMemo(() => {
    const list = diffs()
    if (list.length === 0) return "No file changes in this session"
    const totalAdd = list.reduce((s, d) => s + d.additions, 0)
    const totalDel = list.reduce((s, d) => s + d.deletions, 0)
    return `${list.length} file(s) changed — +${totalAdd}/-${totalDel}`
  })

  return (
    <DialogSelect
      title={`Timeline — ${summaryLine()}`}
      placeholder="Filter by filename"
      options={options()}
      onMove={(option: DialogSelectOption<string>) => props.onMove(option.value)}
      actions={[
        {
          command: "session.timeline.diff",
          title: "View diff",
          requiresSelection: true,
          onTrigger: (option: DialogSelectOption<string>) => {
            const idx = diffs().findIndex((_, i) => `diff-${i}` === option.value)
            if (idx >= 0) {
              dialog.replace(() => DiffViewer({ content: formatDiff(diffs()[idx]) }))
            }
          },
        },
      ]}
    />
  )
}

function DiffViewer(props: { content: string }) {
  const dialog = useDialog()
  const { theme } = useTheme()

  onMount(() => {
    dialog.setSize("xlarge")
  })

  const lines = createMemo(() => props.content.split("\n"))

  return (
    <box padding={1} flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={2} paddingRight={2}>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          File Diff
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc to close
        </text>
      </box>
      <scrollbox paddingLeft={2} paddingRight={2} scrollbarOptions={{ visible: true }}>
        <For each={lines()}>
          {(line: string) => {
            const color = () => {
              if (line.startsWith("+") && !line.startsWith("+++")) return theme.diffAdded
              if (line.startsWith("-") && !line.startsWith("---")) return theme.diffRemoved
              if (line.startsWith("@@")) return theme.diffHunkHeader
              if (
                line.startsWith("diff --git") ||
                line.startsWith("index ") ||
                line.startsWith("---") ||
                line.startsWith("+++")
              )
                return theme.textMuted
              return theme.text
            }
            return (
              <text fg={color()} wrapMode="none">
                {line}
              </text>
            )
          }}
        </For>
      </scrollbox>
    </box>
  )
}
