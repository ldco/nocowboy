import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import { createMemo } from "solid-js"
import { useSDK } from "../context/sdk"
import { t } from "@tui/context/i18n"

interface DialogSessionRenameProps {
  session: string
  title?: string
  onConfirm?: () => void
}

export function DialogSessionRename(props: DialogSessionRenameProps) {
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const session = createMemo(() => sync.session.get(props.session))

  return (
    <DialogPrompt
      title={t("session.rename")}
      value={session()?.title ?? props.title}
      onConfirm={(value) => {
        void sdk.client.session
          .update({
            sessionID: props.session,
            title: value,
          })
          .then(() => props.onConfirm?.())
        dialog.clear()
      }}
      onCancel={() => dialog.clear()}
    />
  )
}
