# TUI: mouse Paste button

The prompt now shows a `[Paste]` affordance next to the YOLO toggle, on both the
home screen and the session prompt.

Clicking it dispatches the existing `prompt.paste` command, so the behaviour is
identical to the keyboard shortcut: images become file parts, PDFs become file
parts, and text is inserted (summarised inline when it is large).

## Files

- `packages/opencode/src/nocowboy/components/paste-button.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/home.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`
- `packages/opencode/src/cli/cmd/tui/util/clipboard.ts`

## Wayland: text must be read with wl-paste

`Clipboard.read()` only used `wl-paste` for images; text fell through to
`clipboardy`, which shells out to `xsel` (the X11 clipboard). On a Wayland
session a copy made in a Wayland app is not visible to `xsel`, so `read()`
returned `undefined` and clicking `[Paste]` did nothing.

The Linux branch now reads text from the native selection with
`wl-paste --no-newline` when `WAYLAND_DISPLAY` is set, before falling back to
`clipboardy`. `--no-newline` strips the trailing newline the tool adds while
preserving real line breaks.

Regression: `packages/opencode/test/cli/tui/clipboard.test.ts`.

## Why dispatch a command instead of reimplementing paste

One code path. Clipboard reading, image detection, paste summarisation and
extmark bookkeeping stay in the prompt component; the button is a thin mouse
binding.
