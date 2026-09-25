import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@nocowboy/plugin/tui"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { TodoItem } from "@tui/component/todo-item"

const id = "internal:nocowboy-sidebar-roadmap"

/** When collapsed, show at most this many upcoming items plus a "+N more" hint. */
const COLLAPSED_MAX = 6

/**
 * Sidebar "Roadmap" section for an active roadmap run.
 *
 * A roadmap run is long and stage-based; the mode badge in the prompt bar only
 * says ROADMAP ▶. This section is where the run's shape is visible: the
 * `done/total` progress and the remaining work as a checklist, so the human can
 * see which step the run is on and what is left. It reuses the same sidebar slot
 * and `TodoItem` rendering as the agent's Todo list (see feature-plugins/sidebar/
 * todo.tsx) but is fed from `docs/roadmap.json` through the `session.goal` event,
 * so it never collides with the agent's own working todo list.
 */
function View(props: { api: TuiPluginApi; session_id: string }) {
  const sync = useSync()
  const theme = () => props.api.theme.current
  const [open, setOpen] = createSignal(true)

  const goal = createMemo(() => sync.data.goal[props.session_id])
  const items = createMemo(() => (goal()?.roadmap ? (goal()?.items ?? []) : []))
  const show = createMemo(() => goal()?.roadmap === true && items().length > 0)
  const progress = createMemo(() => {
    const g = goal()
    if (!g || typeof g.done !== "number" || typeof g.total !== "number" || g.total <= 0) return ""
    return `${g.done}/${g.total}`
  })
  const collapsed = createMemo(() => items().length > COLLAPSED_MAX && !open())
  const visible = createMemo(() => (collapsed() ? items().slice(0, COLLAPSED_MAX) : items()))
  const hidden = createMemo(() => Math.max(0, items().length - visible().length))
  const stage = createMemo(() => goal()?.stage)

  return (
    <Show when={show()}>
      <box>
        <box flexDirection="row" gap={1} onMouseDown={() => items().length > COLLAPSED_MAX && setOpen((x) => !x)}>
          <Show when={items().length > COLLAPSED_MAX}>
            <text fg={theme().text}>{open() ? "▼" : "▶"}</text>
          </Show>
          <text fg={theme().text}>
            <b>Roadmap</b>
          </text>
          <Show when={progress()}>
            <text fg={theme().textMuted}>{progress()}</text>
          </Show>
        </box>
        <Show when={stage()}>
          <text fg={theme().warning} wrapMode="none">
            ▶ {stage()}
          </text>
        </Show>
        <For each={visible()}>{(item) => <TodoItem status={item.status} content={item.id} />}</For>
        <Show when={hidden() > 0}>
          <text fg={theme().textMuted}>… +{hidden()} more</text>
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 390,
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
