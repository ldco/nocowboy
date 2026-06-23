import * as os from "node:os"
import * as path from "node:path"
import * as fsp from "node:fs/promises"
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"

const LAUNCH_FILE = path.join(os.homedir(), ".nocowboy", "mcp", "launch.json")

function findServerDir(): string | null {
  // Try resolved from import.meta.url (dev/node_modules source install)
  const selfPath = fileURLToPath(import.meta.url)
  const fromSource = path.resolve(path.dirname(selfPath), "../../../../packaging/mcp-servers")
  if (fs.existsSync(fromSource)) return fromSource

  // Try AUR/system install path
  if (fs.existsSync("/usr/share/nocowboy/mcp-servers")) return "/usr/share/nocowboy/mcp-servers"

  // Try relative to binary
  const binary = process.argv[0] ?? process.execPath
  const fromBinary = path.resolve(path.dirname(binary), "..", "mcp-servers")
  if (fs.existsSync(fromBinary)) return fromBinary

  return null
}

const SERVERS_ROOT = findServerDir()
function serverPath(name: string): string {
  return SERVERS_ROOT ? path.join(SERVERS_ROOT, name, "dist", "index.js") : ""
}

const DEFAULT_LAUNCHES: Record<string, { command: string } | null> = {
  context7: { command: "npx -y @upstash/context7-mcp" },
  sqlite: { command: "npx mcp-sqlite-server" },
  puppeteer: { command: "npx puppeteer-mcp-claude serve" },
  git: { command: "uvx mcp-server-git" },
  tausik: null,
  "plugin-registry": { command: `node ${serverPath("plugin-registry")}` },
  constitution: { command: `node ${serverPath("constitution")}` },
  "contract-guard": { command: `node ${serverPath("contract-guard")}` },
  "ncp-validator": { command: `node ${serverPath("ncp-validator")}` },
  "score-engine": { command: `node ${serverPath("score-engine")}` },
  puppetmaster: { command: `node ${serverPath("puppetmaster")}` },
  ralph: { command: `node ${serverPath("ralph")}` },
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
