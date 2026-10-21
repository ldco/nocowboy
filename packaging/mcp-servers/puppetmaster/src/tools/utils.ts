import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

export function getProjectRoot(): string {
  const env = process.env.PM_PROJECT_ROOT
  if (env && existsSync(env)) return env
  return process.cwd()
}

export function runCmd(command: string, cwd?: string): string {
  return execSync(command, {
    cwd: cwd ?? getProjectRoot(),
    encoding: 'utf-8',
    timeout: 300_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function runCmdDetached(command: string, args: string[], cwd?: string): number {
  const child = spawn(command, args, {
    cwd: cwd ?? getProjectRoot(),
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  return child.pid ?? 0
}

export function hasNpmScript(name: string): boolean {
  const pkg = JSON.parse(readFileSync(resolve(getProjectRoot(), 'package.json'), 'utf-8'))
  return name in (pkg.scripts ?? {})
}

export function npmScript(name: string, cwd?: string): string {
  return runCmd(`npm run ${name}`, cwd)
}

export function fileExists(path: string): boolean {
  return existsSync(resolve(getProjectRoot(), path))
}

export function fileSize(path: string): number {
  try {
    return statSync(resolve(getProjectRoot(), path)).size
  } catch {
    return 0
  }
}

export function checkPort(port: number): boolean {
  try {
    const out = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf-8', timeout: 3000 })
    return out.trim().length > 0
  } catch {
    return false
  }
}

/** PM4 typed project-config entry (replaces the v2/v3 `project/` directory). */
export const PM_CONFIG_FILE = 'src/project/pm.config.ts'
/** PM4 ModuleManifest (ADR-04) — the single declarative module source. */
export const PM_MANIFEST_FILE = 'src/lib/config/modules.ts'

/** The subset of a ModuleManifest entry the MCP needs to describe a module. */
export interface PmModuleSummary {
  id: string
  moduleId?: string
  group: string
  menu: boolean
  roles: string[]
  defaultEnabled: boolean
  moduleEnabled?: boolean
  config?: Record<string, unknown>
}

/** A loaded PM4 project: the typed config plus its derived module manifest. */
export interface PmProject {
  root: string
  configPath: string
  config: Record<string, unknown>
  modules: PmModuleSummary[]
  manifestPath: string | null
}

const requireModule = createRequire(import.meta.url)

export function loadModuleExports(file: string): Record<string, unknown> {
  // The PM4 config modules are TypeScript and the manifest imports through the
  // `$lib` alias, so they can only be loaded by a runtime that understands
  // tsconfig paths (bun). Loading them (instead of regex-parsing the source)
  // keeps pm_config_get/pm_inject_context honest about the typed config.
  //
  // pm_config_set can rewrite the file while this long-lived MCP process is
  // running; dropping the require cache entry makes the next read observe it.
  // (ESM `import()` caches by absolute path and cannot be invalidated.)
  delete requireModule.cache[file]
  return requireModule(file) as Record<string, unknown>
}

function summarizeManifest(manifest: unknown): PmModuleSummary[] {
  if (!Array.isArray(manifest)) return []
  return manifest.flatMap((entry): PmModuleSummary[] => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    if (typeof record.id !== 'string') return []
    return [{
      id: record.id,
      moduleId: typeof record.moduleId === 'string' ? record.moduleId : undefined,
      group: typeof record.group === 'string' ? record.group : 'unknown',
      menu: record.menu === true,
      roles: Array.isArray(record.roles) ? record.roles.filter((role): role is string => typeof role === 'string') : [],
      defaultEnabled: record.defaultEnabled === true,
      moduleEnabled: typeof record.moduleEnabled === 'boolean' ? record.moduleEnabled : undefined,
      config: record.config && typeof record.config === 'object' ? record.config as Record<string, unknown> : undefined,
    }]
  })
}

/**
 * Load a PM4 project config + ModuleManifest. Returns null when the project has
 * no `src/project/pm.config.ts`; throws a readable error when the file exists
 * but the MCP runtime cannot import TypeScript (e.g. it was launched with plain
 * node instead of bun).
 */
export async function loadConfig(root: string): Promise<PmProject | null> {
  const configPath = resolve(root, PM_CONFIG_FILE)
  if (!existsSync(configPath)) return null

  let mod: Record<string, unknown>
  try {
    mod = loadModuleExports(configPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Cannot import ${PM_CONFIG_FILE}: ${message}. The PM4 config is TypeScript with tsconfig path aliases — launch this MCP with bun.`,
    )
  }

  const config = mod.PM_CONFIG ?? mod.default
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${PM_CONFIG_FILE} does not export PM_CONFIG`)
  }

  const manifestPath = resolve(root, PM_MANIFEST_FILE)
  let modules: PmModuleSummary[] = []
  if (existsSync(manifestPath)) {
    try {
      const manifestModule = loadModuleExports(manifestPath)
      modules = summarizeManifest(manifestModule.MODULE_MANIFEST)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Cannot import ${PM_MANIFEST_FILE}: ${message}`)
    }
  }

  return {
    root,
    configPath,
    config: config as Record<string, unknown>,
    modules,
    manifestPath: existsSync(manifestPath) ? manifestPath : null,
  }
}
