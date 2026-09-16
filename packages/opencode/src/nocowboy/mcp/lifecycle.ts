import * as os from "node:os"
import * as path from "node:path"
import * as fsp from "node:fs/promises"
import * as fs from "node:fs"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { Launcher } from "./launcher"

const LIFECYCLE_DIR = path.dirname(fileURLToPath(import.meta.url))

async function findProxyPath(): Promise<string> {
  const candidates = [
    path.join(LIFECYCLE_DIR, "proxy-standalone.mjs"),
    path.join(path.dirname(process.execPath), "proxy-standalone.mjs"),
    path.join(os.homedir(), ".nocowboy", "proxy-standalone.mjs"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error("Cannot find proxy-standalone.mjs")
}

const MCP_DIR = path.join(os.homedir(), ".nocowboy", "mcp")

export interface McpProcessInfo {
  name: string
  pid: number | null
  running: boolean
  port: number
  url: string
}

async function ensureDir(): Promise<void> {
  await fsp.mkdir(MCP_DIR, { recursive: true })
}

function pidFile(name: string): string {
  return path.join(MCP_DIR, `${name}.pid`)
}

function logFile(name: string): string {
  return path.join(MCP_DIR, `${name}.log`)
}

function portMapFile(): string {
  return path.join(MCP_DIR, "ports.json")
}

async function isRunning(pid: number): Promise<boolean> {
  try {
    return process.kill(pid, 0)
  } catch {
    return false
  }
}

export namespace McpLifecycle {
  export async function status(name: string): Promise<McpProcessInfo> {
    const ports = await readPorts()
    const port = ports[name] ?? 0
    const url = port ? `http://127.0.0.1:${port}/mcp` : ""
    const pidStr = await fsp.readFile(pidFile(name), "utf-8").catch(() => "")
    const pid = pidStr.trim() ? Number(pidStr.trim()) : null
    const running = pid ? await isRunning(pid) : false
    return { name, pid, running, port, url }
  }

  // In-flight single-flight guard: two parallel startOne() calls for the same name
  // used to race (both saw "not running") and spawn duplicate proxies on one port.
  const starting = new Map<string, Promise<McpProcessInfo>>()

  export async function startOne(name: string, command: string, port: number): Promise<McpProcessInfo> {
    const existing = await status(name)
    if (existing.running) return existing

    const prior = starting.get(name)
    if (prior) return prior

    const task = doStart(name, command, port)
    starting.set(name, task)
    try {
      return await task
    } finally {
      starting.delete(name)
    }
  }

  async function doStart(name: string, command: string, port: number): Promise<McpProcessInfo> {
    const existing = await status(name)
    if (existing.running) return existing

    await ensureDir()
    const logPath = logFile(name)
    const logFd = fs.openSync(logPath, "a")
    const cmd = command

    const proxyPath = await findProxyPath()
    const child = spawn("node", [proxyPath, String(port), cmd], {
      stdio: ["ignore", logFd, logFd],
      detached: true,
    })
    child.unref()

    await fsp.writeFile(pidFile(name), String(child.pid ?? ""))
    await savePort(name, port)
    return { name, pid: child.pid ?? null, running: true, port, url: `http://127.0.0.1:${port}/mcp` }
  }

  export async function stopOne(name: string): Promise<void> {
    const pf = pidFile(name)
    const pidStr = await fsp.readFile(pf, "utf-8").catch(() => "")
    if (!pidStr.trim()) return
    const pid = Number(pidStr.trim())
    if (!pid) return
    try {
      process.kill(pid, "SIGTERM")
      setTimeout(() => { try { process.kill(pid, "SIGKILL") } catch { /* best-effort kill */ } }, 3000)
    } catch { /* best-effort kill */ }
    await fsp.unlink(pf).catch(() => {})
  }

  export async function logs(name: string, lines?: number): Promise<string> {
    const lf = logFile(name)
    const content = await fsp.readFile(lf, "utf-8").catch(() => "")
    const all = content.split("\n").filter(Boolean)
    const n = lines ?? 20
    return all.slice(-n).join("\n")
  }
}

async function readPorts(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fsp.readFile(portMapFile(), "utf-8"))
  } catch {
    return {}
  }
}

async function savePort(name: string, port: number): Promise<void> {
  const ports = await readPorts()
  ports[name] = port
  await fsp.writeFile(portMapFile(), JSON.stringify(ports, null, 2))
}
