import type { TuiPlugin, TuiPluginApi } from "@nocowboy/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { useBindings } from "../../keymap"

const id = "internal:home-tips"

function View(props: { api: TuiPluginApi; hidden: boolean; show: boolean; connected: boolean }) {
  useBindings(() => ({
    commands: [
      {
        name: "tips.toggle",
        title: props.hidden ? "Show tips" : "Hide tips",
        category: "System",
        namespace: "palette",
        run() {
          props.api.kv.set("tips_hidden", !props.api.kv.get("tips_hidden", false))
          props.api.ui.dialog.clear()
        },
      },
    ],
    bindings: props.api.tuiConfig.keybinds.get("tips.toggle"),
  }))

  return null // nocowboy_change - no visual output, no wasted space
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      home_bottom() {
        return <View api={api} hidden={true} show={false} connected={false} />
      },
    },
  })
}

const plugin: InternalTuiPlugin = {
  id,
  tui,
}

export default plugin
