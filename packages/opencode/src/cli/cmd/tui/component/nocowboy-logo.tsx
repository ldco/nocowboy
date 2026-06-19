// nocowboy_change new file
import { RGBA, TextAttributes } from "@opentui/core"

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

export function Logo() {
  return (
    <box gap={1} paddingLeft={2}>
      <text attributes={TextAttributes.BOLD} fg={brand}>
        NoCowboy
      </text>
    </box>
  )
}
