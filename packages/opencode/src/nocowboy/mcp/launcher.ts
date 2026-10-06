import * as os from "node:os"
import * as path from "node:path"
import * as fsp from "node:fs/promises"
import { createRequire } from "node:module"

const LAUNCH_FILE = path.join(os.homedir(), ".nocowboy", "mcp", "launch.json")

const _require = createRequire(import.meta.url)

/** First-party MCP servers are published as `@nocowboy/mcp-<name>` packages. */
export const FIRST_PARTY_MCP_PREFIX = "@nocowboy/mcp-"

/** Third-party convenience defaults (npx/uvx), opted into by name. */
const DEFAULT_LAUNCHES: Record<string, { command: string } | null> = {
  context7: { command: "npx -y @upstash/context7-mcp" },
  sqlite: { command: "npx mcp-sqlite-server" },
  puppeteer: { command: "npx puppeteer-mcp-claude serve" },
  git: { command: "uvx mcp-server-git" },
  // First-party MCP servers (constitution, contract-guard, git, etc.) are published
  // as separate @nocowboy/mcp-<name> packages. They're auto-detected below
  // via require.resolve when installed. No default entries needed.
}

/** True when a server name belongs to the first-party `@nocowboy/mcp-*` family. */
export function isFirstPartyMcp(name: string): boolean {
  return name.trim().length > 0 && !Object.hasOwn(DEFAULT_LAUNCHES, name)
}

export interface LaunchDeps {
  /** The user's launch.json entry for `name` (command string, or null/undefined). */
  launchJson?: (name: string) => string | null | undefined
  /** The resolved `node <bin>` for an installed `@nocowboy/mcp-<name>`, or null. */
  installedPackage?: (name: string) => string | null
  /** Third-party npx/uvx defaults. */
  defaults?: Record<string, { command: string } | null | undefined>
}

/**
 * Pure launch precedence for an MCP server:
 *   1. the user's launch.json entry;
 *   2. an installed first-party `@nocowboy/mcp-<name>` package;
 *   3. a third-party `npx`/`uvx` default;
 *   4. null (no way to launch).
 * An explicit `launch.json` null/`{command:undefined}` falls through — only a
 * concrete command string wins.
 */
export function resolveCommand(name: string, deps: LaunchDeps): string | null {
  const fromJson = deps.launchJson?.(name)
  if (typeof fromJson === "string" && fromJson.length > 0) return fromJson

  const installed = deps.installedPackage?.(name)
  if (installed) return installed

  return deps.defaults?.[name]?.command ?? null
}

export namespace Launcher {
  async function readLaunchJson(name: string): Promise<string | null | undefined> {
    try {
      const raw = await fsp.readFile(LAUNCH_FILE, "utf-8")
      const map = JSON.parse(raw) as Record<string, { command?: string } | null | undefined>
      const entry = map[name]
      if (!entry) return undefined
      return entry.command
    } catch {
      return undefined
    }
  }

  async function resolveInstalled(name: string): Promise<string | null> {
    try {
      const bin = _require.resolve(`${FIRST_PARTY_MCP_PREFIX}${name}/dist/index.js`)
      return `node ${bin}`
    } catch {
      return null
    }
  }

  export async function command(name: string): Promise<string | null> {
    // Resolve the async sources first, then apply the pure precedence.
    const fromJson = await readLaunchJson(name)
    const installed = await resolveInstalled(name)
    return resolveCommand(name, {
      launchJson: () => fromJson,
      installedPackage: () => installed,
      defaults: DEFAULT_LAUNCHES,
    })
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
