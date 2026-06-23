import * as os from "node:os"
import * as path from "node:path"
import * as fsp from "node:fs/promises"

const LAUNCH_FILE = path.join(os.homedir(), ".nocowboy", "mcp", "launch.json")

const DEFAULT_LAUNCHES: Record<string, { command: string } | null> = {
  context7: { command: "npx -y @upstash/context7-mcp" },
  sqlite: { command: "npx mcp-sqlite-server" },
  puppeteer: { command: "npx puppeteer-mcp-claude serve" },
  git: { command: "uvx mcp-server-git" },
  tausik: null,
  "plugin-registry": { command: "node /usr/share/nocowboy/mcp-servers/plugin-registry/dist/index.js" },
  constitution: { command: "node /usr/share/nocowboy/mcp-servers/constitution/dist/index.js" },
  "contract-guard": { command: "node /usr/share/nocowboy/mcp-servers/contract-guard/dist/index.js" },
  "ncp-validator": { command: "node /usr/share/nocowboy/mcp-servers/ncp-validator/dist/index.js" },
  "score-engine": { command: "node /usr/share/nocowboy/mcp-servers/score-engine/dist/index.js" },
  puppetmaster: { command: "node /usr/share/nocowboy/mcp-servers/puppetmaster/dist/index.js" },
  ralph: { command: "node /usr/share/nocowboy/mcp-servers/ralph/dist/index.js" },
}

export namespace Launcher {
  export async function command(name: string): Promise<string | null> {
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      const map = JSON.parse(raw)
      const entry = map[name]
      if (!entry || entry.command === undefined) return null
      return entry.command
    } catch {
      const entry = DEFAULT_LAUNCHES[name]
      return entry?.command ?? null
    }
  }

  export async function allNames(): Promise<string[]> {
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      const map = JSON.parse(raw)
      return Object.entries(map)
        .filter(([, v]) => v && typeof v === "object" && "command" in v)
        .map(([k]) => k)
    } catch {
      return Object.entries(DEFAULT_LAUNCHES)
        .filter(([, v]) => v !== null)
        .map(([k]) => k)
    }
  }

  export async function save(name: string, cmd: string | null): Promise<void> {
    let map: Record<string, { command: string } | null>
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      map = JSON.parse(raw)
    } catch {
      map = { ...DEFAULT_LAUNCHES }
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
