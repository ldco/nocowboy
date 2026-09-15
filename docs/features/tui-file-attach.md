# TUI: file attach button (images and text)

The prompt shows an `[Attach]` affordance. It opens a small working-tree file
picker (`DialogFilePicker`): browse directories, descend with `..`, filter by
name, and pick a file.

On pick:

- **image / PDF** → attached as a file part (base64 data URL), same as a
  clipboard image paste;
- **text file** → inlined; a large file is inserted as a summarised virtual
  part (`[File: name]`) instead of flooding the prompt.

## Files

- `packages/opencode/src/nocowboy/components/attach-button.tsx`
- `packages/opencode/src/nocowboy/components/dialog-file-picker.tsx`
- `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` (`prompt.attach`
  command + `attachPath` helper)

## Notes

- The picker reads the filesystem with `node:fs/promises`; it lists files and
  directories separately, directories first.
- `attachPath` reuses the exact attach rules of the clipboard paste path so
  images/PDFs and text behave identically however they arrive.
