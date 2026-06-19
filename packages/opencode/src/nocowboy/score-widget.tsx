import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

export function ScoreWidget() {
  const { theme } = useTheme()

  const items = [
    { label: "NCP Compliance",     value: 82 },
    { label: "Constitution",        value: 91 },
    { label: "Contract Integrity",  value: 85 },
    { label: "Test Coverage",       value: 68 },
    { label: "Security Posture",    value: 97 },
  ]

  const total = Math.round(items.reduce((s, i) => s + i.value, 0) / items.length)

  return (
    <box border title=" Score" width={28} paddingX={1} paddingY={1}>
      <text>{`  ${total}/100  B+ Quality`}</text>
      <box height={1} />
      <For each={items}>
        {(item) => (
          <text>
            {`  ${item.label.padEnd(20)} ${"█".repeat(Math.floor(item.value / 10))}${"░".repeat(10 - Math.floor(item.value / 10))} ${item.value}%`}
          </text>
        )}
      </For>
    </box>
  )
}
