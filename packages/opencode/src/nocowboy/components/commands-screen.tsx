import { useCommandPalette } from "@tui/context/command-palette"
import { useTuiConfig } from "@tui/context/tui-config"
import { useKeymapSelector } from "@tui/keymap"
import { useScreen } from "@/nocowboy/components/nocowboy-bars"

export function CommandsScreen() {
  const config = useTuiConfig()
  const palette = useCommandPalette()
  const { setScreen } = useScreen()
  const entries = useKeymapSelector((keymap: any) => {
    const reachable = keymap.getCommandEntries({ namespace: "palette", visibility: "reachable" })
    const bindings = keymap.getCommandBindings({
      visibility: "registered",
      commands: reachable.map((e: any) => e.command.name),
    })
    return reachable.map((e: any) => ({
      title: typeof e.command.title === "string" ? e.command.title : e.command.name,
      name: e.command.name,
      category: typeof e.command.category === "string" ? e.command.category : undefined,
      bindings: bindings.get(e.command.name) ?? e.bindings,
    }))
  })

  return (
    <box flexGrow={1} flexDirection="column" paddingX={2}>
      <box height={1} />
      <text fg={config.theme.highlight}>  Commands</text>
      <box height={1} />
      <box flexGrow={1} flexDirection="column">
        {entries().slice(0, 30).map((entry: any) => (
          <text
            fg={config.theme.textDim}
            onMouseDown={() => {
              palette.run(entry.name)
              setScreen("chat")
            }}
          >
            {"  "}{entry.title}{entry.category ? ` — ${entry.category}` : ""}
          </text>
        ))}
      </box>
    </box>
  )
}
