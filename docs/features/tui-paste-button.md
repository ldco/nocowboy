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

## Why dispatch a command instead of reimplementing paste

One code path. Clipboard reading, image detection, paste summarisation and
extmark bookkeeping stay in the prompt component; the button is a thin mouse
binding.
