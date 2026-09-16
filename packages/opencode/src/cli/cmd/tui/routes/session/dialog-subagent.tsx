import { DialogSelect } from "@tui/ui/dialog-select"
import { useRoute } from "@tui/context/route"
import { t } from "@tui/context/i18n"

export function DialogSubagent(props: { sessionID: string }) {
  const route = useRoute()

  return (
    <DialogSelect
      title={t("dialog.subagentActions")}
      options={[
        {
          title: "Open",
          value: "subagent.view",
          description: "the subagent's session",
          onSelect: (dialog) => {
            route.navigate({
              type: "session",
              sessionID: props.sessionID,
            })
            dialog.clear()
          },
        },
      ]}
    />
  )
}
