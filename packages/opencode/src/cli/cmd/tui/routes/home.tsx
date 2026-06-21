import { Prompt, type PromptRef } from "@tui/component/prompt"
import { For } from "solid-js"
import { RGBA, TextAttributes } from "@opentui/core"
import { createEffect, createSignal, onMount } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useProject } from "../context/project"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { TuiPluginRuntime } from "@/cli/cmd/tui/plugin/runtime"
import { useEditorContext } from "@tui/context/editor"

let once = false

const asciiLogo = [
  `███╗   ██╗ ██████╗  ██████╗ ██████╗ ██╗    ██╗██████╗  ██████╗ ██╗   ██╗`,
  `████╗  ██║██╔═══██╗██╔════╝██╔═══██╗██║    ██║██╔══██╗██╔═══██╗╚██╗ ██╔╝`,
  `██╔██╗ ██║██║   ██║██║     ██║   ██║██║ █╗ ██║██████╔╝██║   ██║ ╚████╔╝ `,
  `██║╚██╗██║██║   ██║██║     ██║   ██║██║███╗██║██╔══██╗██║   ██║  ╚██╔╝  `,
  `██║ ╚████║╚██████╔╝╚██████╗╚██████╔╝╚███╔███╔╝██████╔╝╚██████╔╝   ██║   `,
  `╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═════╝  ╚══╝╚══╝ ╚═════╝  ╚═════╝    ╚═╝   `,
]

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

const placeholder = {
  normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"],
  shell: ["ls -la", "git status", "pwd"],
}

export function Home() {
  const sync = useSync()
  const project = useProject()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexGrow={1} minHeight={0} alignItems="center" justifyContent="center">
        <box flexDirection="column" alignItems="center">
          <For each={asciiLogo}>
            {(line) => <text fg={brand} attributes={TextAttributes.BOLD}>{line}</text>}
          </For>
        </box>
      </box>
      <box width="100%" paddingX={2}>
        <TuiPluginRuntime.Slot
          name="home_prompt"
          mode="replace"
          workspace_id={project.workspace.current()}
          ref={bind}
        >
          {/* nocowboy_change — same styled input as session */}
          <box border borderStyle="rounded" borderColor="#ff6800">
            <Prompt
              ref={bind}
              workspaceID={project.workspace.current()}
              right={
                <box flexDirection="row">
                  <text
                    fg={useTheme().theme.textMuted}
                    paddingLeft={1}
                    paddingRight={1}
                    onMouseDown={(e: any) => { e?.preventDefault?.() }}
                  >
                    [🎙Voice]
                  </text>
                  <TuiPluginRuntime.Slot name="home_prompt_right" workspace_id={project.workspace.current()} />
                </box>
              }
              placeholders={placeholder}
            />
          </box>
        </TuiPluginRuntime.Slot>
      </box>
      <TuiPluginRuntime.Slot name="home_bottom" />
      <Toast />
      <box width="100%" flexShrink={0}>
        <TuiPluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </box>
  )
}
