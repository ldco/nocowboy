import * as os from "node:os"
import * as path from "node:path"
import * as fsp from "node:fs/promises"
import { createRequire } from "node:module"

const LAUNCH_FILE = path.join(os.homedir(), ".nocowboy", "mcp", "launch.json")

const _require = createRequire(import.meta.url)

const DEFAULT_LAUNCHES: Record<string, { command: string } | null> = {
  context7: { command: "npx -y @upstash/context7-mcp" },
  sqlite: { command: "npx mcp-sqlite-server" },
  puppeteer: { command: "npx puppeteer-mcp-claude serve" },
  git: { command: "npx -y mcp-server-git" },
  // First-party MCP servers (constitution, contract-guard, etc.) are published
  // as separate @nocowboy/mcp-<name> packages. They're auto-detected below
  // via require.resolve when installed. No default entries needed.
}

export namespace Launcher {
  export async function command(name: string): Promise<string | null> {
    // 1. User's launch.json takes priority
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      const map = JSON.parse(raw)
      const entry = map[name]
      if (entry && entry.command !== undefined) return entry.command
    } catch {}

    // 2. Try installed @nocowboy/mcp-<name> packages
    try {
      const pkg = `@nocowboy/mcp-${name}`
      const bin = _require.resolve(`${pkg}/dist/index.js`)
      return `node ${bin}`
    } catch {}

    // 3. Defaults (npx-based third-party servers)
    const entry = DEFAULT_LAUNCHES[name]
    return entry?.command ?? null
  }

  export async function save(name: string, cmd: string | null): Promise<void> {
    let map: Record<string, { command: string } | null>
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      map = JSON.parse(raw)
    } catch {
      map = {}
    }
    if (cmd !== null) {
      map[name] = { command: cmd }
    } else {
      delete map[name]
    }
    await fsp.mkdir(path.dirname(LAUNCH_FILE), { recursive: true })
    await fsp.writeFile(LAUNCH_FILE, JSON.stringify(map, null, 2))
  }
}
