import * as os from "node:os"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { spawn } from "node:child_process"

const MCP_DIR = path.join(os.homedir(), ".nocowboy", "mcp")

const MANIFEST: Record<string, { command: string } | null> = {
  context7: { command: "npx -y @upstash/context7-mcp" },
  sqlite: { command: "npx mcp-sqlite-server" },
  puppeteer: { command: "npx puppeteer-mcp-claude serve" },
  git: { command: "uvx mcp-server-git" },
  puppetmaster: { command: "node /usr/share/nocowboy/mcp-servers/puppetmaster/dist/index.js" },
  ralph: { command: "node /usr/share/nocowboy/mcp-servers/ralph/dist/index.js" },
  constitution: { command: "node /usr/share/nocowboy/mcp-servers/constitution/dist/index.js" },
  "ncp-validator": { command: "node /usr/share/nocowboy/mcp-servers/ncp-validator/dist/index.js" },
  "contract-guard": { command: "node /usr/share/nocowboy/mcp-servers/contract-guard/dist/index.js" },
  "score-engine": { command: "node /usr/share/nocowboy/mcp-servers/score-engine/dist/index.js" },
  "plugin-registry": { command: "node /usr/share/nocowboy/mcp-servers/plugin-registry/dist/index.js" },
  tausik: null,
}

export namespace McpLifecycle {
  export function knownServers(): string[] {
    return Object.keys(MANIFEST).filter((name) => MANIFEST[name] !== null)
  }

  export function serverCommand(name: string): string | null {
    const entry = MANIFEST[name]
    return entry?.command ?? null
  }

  function pidFile(name: string): string {
    return path.join(MCP_DIR, `${name}.pid`)
  }

  function logFile(name: string): string {
    return path.join(MCP_DIR, `${name}.log`)
  }

  async function ensureDir(): Promise<void> {
    await fs.mkdir(MCP_DIR, { recursive: true })
  }

  export interface McpProcessInfo {
    name: string
    pid: number | null
    running: boolean
    port: number
    url: string
  }

  function serverPort(name: string): number {
    const portMap: Record<string, number> = {
      context7: 9200,
      sqlite: 9201,
      puppeteer: 9202,
      puppetmaster: 9203,
      tausik: 9204,
      git: 9205,
      ralph: 9210,
      "plugin-registry": 9214,
      constitution: 9216,
      "ncp-validator": 9217,
      "contract-guard": 9218,
      "score-engine": 9219,
    }
    return portMap[name] ?? 0
  }

  async function isRunning(pid: number): Promise<boolean> {
    try {
      return process.kill(pid, 0)
    } catch {
      return false
    }
  }

  export async function status(name?: string): Promise<McpProcessInfo[]> {
    await ensureDir()
    const names = name ? [name] : knownServers()
    const results: McpProcessInfo[] = []
    for (const n of names) {
      const port = serverPort(n)
      const url = `http://127.0.0.1:${port}/mcp`
      try {
        const pidStr = await fs.readFile(pidFile(n), "utf-8").catch(() => "")
        const pid = pidStr.trim() ? Number(pidStr.trim()) : null
        const running = pid ? await isRunning(pid) : false
        results.push({ name: n, pid, running, port, url })
      } catch {
        results.push({ name: n, pid: null, running: false, port, url })
      }
    }
    return results
  }

  export async function startOne(name: string): Promise<McpProcessInfo> {
    const cmd = serverCommand(name)
    if (!cmd) throw new Error(`MCP server "${name}" has no spawn command defined`)

    const port = serverPort(name)
    const url = `http://127.0.0.1:${port}/mcp`
    const existing = await status(name)
    if (existing[0]?.running) return existing[0]

    await ensureDir()
    const logPath = logFile(name)
    const logStream = await fs.open(logPath, "a")
    const logFd = logStream.fd

    const child = spawn("mcp-proxy", ["--port", String(port), "--", ...cmd.split(" ")], {
      stdio: ["ignore", logFd, logFd],
      detached: false,
    })

    await fs.writeFile(pidFile(name), String(child.pid ?? ""))
    return { name, pid: child.pid ?? null, running: true, port, url }
  }

  export async function startAll(): Promise<McpProcessInfo[]> {
    const results: McpProcessInfo[] = []
    for (const name of knownServers()) {
      try {
        results.push(await startOne(name))
      } catch (err) {
        results.push({
          name,
          pid: null,
          running: false,
          port: serverPort(name),
          url: `http://127.0.0.1:${serverPort(name)}/mcp`,
        })
      }
    }
    return results
  }

  export async function stopOne(name: string): Promise<void> {
    const pf = pidFile(name)
    const pidStr = await fs.readFile(pf, "utf-8").catch(() => "")
    if (!pidStr.trim()) return
    const pid = Number(pidStr.trim())
    if (!pid) return
    try {
      process.kill(pid, "SIGTERM")
      setTimeout(() => { try { process.kill(pid, "SIGKILL") } catch {} }, 3000)
    } catch {}
    await fs.unlink(pf).catch(() => {})
  }

  export async function stopAll(): Promise<void> {
    for (const name of knownServers()) {
      await stopOne(name).catch(() => {})
    }
  }

  export async function logs(name: string, lines?: number): Promise<string> {
    const lf = logFile(name)
    const content = await fs.readFile(lf, "utf-8").catch(() => "")
    const all = content.split("\n").filter(Boolean)
    const n = lines ?? 20
    return all.slice(-n).join("\n")
  }
}
