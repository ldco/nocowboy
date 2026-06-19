import { Show } from "solid-js"
import { isNocowboyError } from "@/nocowboy/errors"

interface KiloErrorBlockProps {
  error: unknown
  fallback?: any
}

export function ErrorBlock(props: KiloErrorBlockProps) {
  return (
    <Show when={isNocowboyError(props.error)} fallback={props.fallback}>
      <box border title=" Error" paddingX={1} paddingY={1}>
        <text>An error occurred. Check the logs for details.</text>
      </box>
    </Show>
  )
}
