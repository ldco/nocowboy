/**
 * Regression: the prompt's Paste button reads the clipboard through
 * `Clipboard.read()`. On a Wayland session the text lives in the native
 * selection, which xsel/clipboardy (X11) cannot see, so the module used to
 * return undefined for copied text and the button did nothing. These tests pin
 * the wl-paste text path and the fact that it is gated on WAYLAND_DISPLAY.
 */
import { beforeEach, expect, mock, test } from "bun:test"
import { platform } from "node:os"

const calls: string[][] = []
let stdoutByCommand: Record<string, Buffer> = {}

void mock.module("@/util/process", () => ({
  run: async (cmd: string[], _opts?: unknown) => {
    calls.push(cmd)
    return { stdout: stdoutByCommand[cmd.join(" ")] ?? Buffer.alloc(0) }
  },
}))

// clipboardy is only reached on the non-Wayland fallback path; keep it
// deterministic so the test never touches a real X11 selection.
void mock.module("clipboardy", () => ({
  default: { read: async () => "from-clipboardy" },
}))

const { read } = await import("@/cli/cmd/tui/util/clipboard")

beforeEach(() => {
  calls.length = 0
  stdoutByCommand = {}
})

const linuxOnly = test.skipIf(platform() !== "linux")

linuxOnly("read() returns text from wl-paste on a Wayland session", async () => {
  process.env["WAYLAND_DISPLAY"] = "wayland-0"
  stdoutByCommand["wl-paste --no-newline"] = Buffer.from("copied text")

  const content = await read()

  expect(content).toEqual({ data: "copied text", mime: "text/plain" })
  expect(calls.some((cmd) => cmd.join(" ") === "wl-paste --no-newline")).toBe(true)
})

linuxOnly("read() prefers an image over text when both are present", async () => {
  process.env["WAYLAND_DISPLAY"] = "wayland-0"
  stdoutByCommand["wl-paste -t image/png"] = Buffer.from([1, 2, 3])
  stdoutByCommand["wl-paste --no-newline"] = Buffer.from("copied text")

  const content = await read()

  expect(content?.mime).toBe("image/png")
  expect(calls.some((cmd) => cmd.join(" ") === "wl-paste --no-newline")).toBe(false)
})

linuxOnly("read() does not read wl-paste text without a Wayland display", async () => {
  delete process.env["WAYLAND_DISPLAY"]
  stdoutByCommand["wl-paste --no-newline"] = Buffer.from("must not be used")

  const content = await read()

  expect(content).toEqual({ data: "from-clipboardy", mime: "text/plain" })
  expect(calls.some((cmd) => cmd.join(" ") === "wl-paste --no-newline")).toBe(false)
})
