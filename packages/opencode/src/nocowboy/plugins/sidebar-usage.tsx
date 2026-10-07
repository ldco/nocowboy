import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@nocowboy/plugin/tui"
import { createMemo, Show } from "solid-js"
import { useLocal } from "@tui/context/local"
import { formatCount, getUsage } from "@tui/routes/session/usage"
import { fmtAttemptCost, fmtScore } from "@/nocowboy/components/model-info-panel-utils"
import { t } from "@tui/context/i18n"

const id = "internal:kilo-sidebar-usage"

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const local = useLocal()
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const usage = createMemo(() => {
    const total = getUsage(msg())
    return {
      input: formatCount(total.input),
      output: formatCount(total.output),
      cached: formatCount(total.cached),
    }
  })
  const bench = createMemo(() => {
    const current = local.model.current()
    if (!current) return
    const provider = props.api.state.provider.find((item) => item.id === current.providerID)
    return provider?.models[current.modelID]?.terminalBench
  })

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
      <Show when={bench()}>
        {(value) => (
          <box>
            <text fg={theme().text}>
              <b>{t("sidebar.usage.terminalBench")}</b>
            </text>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().textMuted}>{t("sidebar.usage.completion")}</text>
              <text fg={theme().textMuted}>{fmtScore(value().overallScore)}</text>
            </box>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().textMuted}>{t("sidebar.usage.costPerAttempt")}</text>
              <text fg={theme().textMuted}>{fmtAttemptCost(value().avgAttemptCostUsd)}</text>
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
