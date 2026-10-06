import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@nocowboy/plugin/tui"
import { createMemo, Show } from "solid-js"
import { t } from "@tui/context/i18n"

const id = "internal:kilo-sidebar-usage"

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  // Values come from the façade view models, not internal TUI contexts.
  const usage = createMemo(() => props.api.viewModels.usage(props.session_id))

  return (
    <box gap={1}>
      <box>
        <text fg={theme().text}>
          <b>{t("sidebar.usage")}</b>
        </text>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().textMuted}>{t("sidebar.usage.input")}</text>
          <text fg={theme().textMuted}>{usage().input}</text>
        </box>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().textMuted}>{t("sidebar.usage.output")}</text>
          <text fg={theme().textMuted}>{usage().output}</text>
        </box>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().textMuted}>{t("sidebar.usage.cached")}</text>
          <text fg={theme().textMuted}>{usage().cached}</text>
        </box>
      </box>
      <Show when={usage().terminalBench}>
        {(value) => (
          <box>
            <text fg={theme().text}>
              <b>{t("sidebar.usage.terminalBench")}</b>
            </text>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().textMuted}>{t("sidebar.usage.completion")}</text>
              <text fg={theme().textMuted}>{value().score}</text>
            </box>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().textMuted}>{t("sidebar.usage.costPerAttempt")}</text>
              <text fg={theme().textMuted}>{value().costPerAttempt}</text>
            </box>
          </box>
        )}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
