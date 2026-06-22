import { createSignal, createEffect, onCleanup, on } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { RGBA } from "@opentui/core"
import { Process } from "@/util/process"
import { unlink } from "node:fs/promises"

const brand = RGBA.fromInts(0xff, 0x68, 0x00)

function startCapture(): { child: ReturnType<typeof Process.spawn>; path: string } {
  const path = `/tmp/nocowboy-voice-${Date.now()}.wav`
  const child = Process.spawn([
    "ffmpeg", "-y", "-f", "pulse", "-i", "default",
    "-ac", "1", "-ar", "16000", path,
  ])
  return { child, path }
}

async function transcribe(
  audioFile: string,
  onResult: (text: string) => void,
) {
  try {
    const result = await Process.text(["ostt", "transcribe", audioFile])
    const trimmed = result.text.trim()
    if (trimmed) onResult(trimmed)
  } catch {
    // transcription failed
  }
  unlink(audioFile).catch(() => {})
}

type State = "idle" | "recording" | "transcribing"

const dotFrames = ["...", " ..", "  .", " .."]

export function VoiceButton(props: {
  onResult: (text: string) => void
}) {
  const { theme } = useTheme()
  const [state, setState] = createSignal<State>("idle")
  const [dotIdx, setDotIdx] = createSignal(0)
  let child: ReturnType<typeof Process.spawn> | undefined
  let audioPath: string | undefined

  onCleanup(() => { child?.kill() })

  createEffect(on(state, (s) => {
    if (s !== "transcribing") return
    setDotIdx(0)
    const timer = setInterval(() => {
      setDotIdx((p) => (p + 1) % dotFrames.length)
    }, 350)
    onCleanup(() => clearInterval(timer))
  }))

  async function record() {
    if (state() !== "idle") { stop(); return }
    setState("recording")
    const capture = startCapture()
    child = capture.child
    audioPath = capture.path
    void child.exited.then(async () => {
      setState("transcribing")
      const fp = audioPath!
      audioPath = undefined
      await transcribe(fp, props.onResult)
      setState("idle")
    }).catch(() => cleanup())
  }

  function stop() { child?.kill("SIGINT"); child = undefined }

  function cleanup() {
    child = undefined
    if (audioPath) { unlink(audioPath).catch(() => {}); audioPath = undefined }
    setState("idle")
  }

  const fg = () => {
    switch (state()) {
      case "recording": return brand
      case "transcribing": return brand
      default: return theme.textMuted
    }
  }

  return (
    <text
      fg={fg()}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(e: { preventDefault?: () => void }) => { e.preventDefault?.(); record() }}
    >
      {state() === "recording" ? "[⏹ Stop]" : state() === "transcribing" ? `⟳ Transcribing${dotFrames[dotIdx()]}` : "[🎙 Voice]"}
    </text>
  )
}
