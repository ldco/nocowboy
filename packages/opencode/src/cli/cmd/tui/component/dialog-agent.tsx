import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"

type AgentItem = { name: string; displayName?: string; description?: string; native?: boolean; deprecated?: boolean }

export function DialogAgent() {
  const local = useLocal()
  const dialog = useDialog()

  const options = createMemo(() =>
    local.agent.list().map((item: AgentItem) => {
      return {
        value: item.name,
        title: item.displayName ?? item.name,
        description:
          [item.deprecated && "deprecated"].filter(Boolean).join(", ") || (item.description ?? ""),
      }
    }),
  )

  return (
    <DialogSelect
      title="Select agent"
      current={local.agent.current()?.name ?? ""}
      options={options()}
      onSelect={(option: { value: string }) => {
        local.agent.set(option.value)
        dialog.clear()
      }}
    />
  )
}
