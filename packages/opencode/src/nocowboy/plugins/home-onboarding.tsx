import type { TuiPlugin, TuiPluginModule } from "@nocowboy/plugin/tui"

const id = "internal:home-onboarding"

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 99,
    slots: {
      home_bottom() {
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
