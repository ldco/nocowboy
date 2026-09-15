import { createResource, createSignal } from "solid-js"
import fs from "node:fs/promises"
import path from "node:path"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"

interface Entry {
  name: string
  dir: boolean
}

/**
 * Minimal in-terminal file picker: browse the working tree, descend into
 * directories and pick a file. The parent receives the absolute path and is
 * responsible for reading/attaching it.
 */
export function DialogFilePicker(props: { startDir?: string; onPick: (filepath: string) => void }) {
  const dialog = useDialog()
  const [dir, setDir] = createSignal(props.startDir ?? process.cwd())

  const [entries] = createResource(dir, async (current): Promise<Entry[]> => {
    const list = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    const dirs = list.filter((e) => e.isDirectory()).map((e) => ({ name: e.name, dir: true }))
    const files = list.filter((e) => e.isFile()).map((e) => ({ name: e.name, dir: false }))
    const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name)
    return [...dirs.sort(byName), ...files.sort(byName)]
  })

  const options = () => {
    const current = dir()
    const parent = path.dirname(current)
    const result: { title: string; value: string; description?: string; category: string }[] = []
    if (parent !== current) {
      result.push({ title: "..", value: parent, description: parent, category: "Directories" })
    }
    for (const entry of entries() ?? []) {
      const full = path.join(current, entry.name)
      result.push({
        title: entry.dir ? `${entry.name}/` : entry.name,
        value: full,
        category: entry.dir ? "Directories" : "Files",
      })
    }
    return result
  }

  return (
    <DialogSelect
      title={`Attach file — ${dir()}`}
      placeholder="Filter by name"
      options={options()}
      onSelect={(option) => {
        const value = option.value
        if (option.title === ".." || option.title.endsWith("/")) {
          setDir(value)
          return
        }
        props.onPick(value)
        dialog.clear()
      }}
    />
  )
}
