import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { PmTool } from './index.js'
import {
  getProjectRoot,
  loadConfig,
  loadModuleExports,
  PM_CONFIG_FILE,
  PM_MANIFEST_FILE,
  type PmProject,
} from './utils.js'

function moduleMap(project: PmProject): Record<string, { enabled: boolean; config: Record<string, unknown> }> {
  return Object.fromEntries(
    project.modules
      .filter((module) => module.moduleId !== undefined)
      .map((module) => [module.moduleId as string, { enabled: module.moduleEnabled ?? true, config: module.config ?? {} }]),
  )
}

function readPath(value: unknown, parts: string[]): { found: boolean; value?: unknown } {
  let current = value
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return { found: false }
    const record = current as Record<string, unknown>
    if (!(part in record)) return { found: false }
    current = record[part]
  }
  return { found: true, value: current }
}

function render(value: unknown): string {
  if (value === null || typeof value !== 'object') return String(value)
  return JSON.stringify(value, null, 2)
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function literal(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
  }
  return String(value)
}

/** Rewrite a unique scalar literal inside the PM_CONFIG block. */
function rewriteScalar(
  content: string,
  key: string,
  value: string | number | boolean,
): { content: string } | { error: string } {
  const leaf = key.split('.').pop()
  if (!leaf) return { error: `Invalid key "${key}".` }

  // The type declarations above the constant contain the same field names, so
  // only the `export const PM_CONFIG` block may be rewritten.
  const blockStart = content.indexOf('export const PM_CONFIG')
  if (blockStart === -1) return { error: `Cannot find "export const PM_CONFIG" in ${PM_CONFIG_FILE}. Edit manually.` }
  const prefix = content.slice(0, blockStart)
  const block = content.slice(blockStart)

  // Match a COMPLETE scalar literal, not "everything up to the next comma":
  // `site.url: 'https://x,y'` must be replaceable, and array/object values must
  // never be half-consumed.
  const stringLiteral = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`
  const pattern = new RegExp(`(\\b${escapeRegex(leaf)}\\s*:\\s*)(?:${stringLiteral}|-?\\d+(?:\\.\\d+)?|true|false)`, 'g')
  const matches = block.match(pattern) ?? []
  if (matches.length === 0) {
    const hasKey = new RegExp(`\\b${escapeRegex(leaf)}\\s*:`).test(block)
    if (hasKey) return { error: `Key "${key}" exists but its value is not a scalar; edit ${PM_CONFIG_FILE} manually.` }
    return { error: `Key "${key}" not found in PM_CONFIG (${PM_CONFIG_FILE}). Manual edit required.` }
  }
  if (matches.length > 1) {
    return { error: `Key "${leaf}" appears ${matches.length} times inside PM_CONFIG; refusing an ambiguous rewrite. Edit manually.` }
  }

  // A replacer FUNCTION, not a replacement string: `$&`/`$1` in the user's
  // value must be written literally instead of being interpreted by String.replace.
  return { content: prefix + block.replace(pattern, (_match, field: string) => field + literal(value)) }
}

/**
 * Rewrite a website module's ONE switch. PM4 derives the public gate from
 * `moduleEnabled` and the admin page from `defaultEnabled`, so both must move
 * together — otherwise a "disabled" module keeps an admin surface (or vice
 * versa). Admin-only pages (no `moduleId`) are not modules and are rejected.
 */
function rewriteModuleFlag(content: string, id: string, enabled: boolean): { content: string } | { error: string } {
  const idPattern = new RegExp(`\\bid\\s*:\\s*['"]${escapeRegex(id)}['"]`)
  const lines = content.split('\n')
  const indexes = lines.map((line, index) => (idPattern.test(line) ? index : -1)).filter((index) => index >= 0)
  if (indexes.length === 0) return { error: `Module "${id}" not found in ${PM_MANIFEST_FILE}.` }
  if (indexes.length > 1) return { error: `Module id "${id}" appears ${indexes.length} times in ${PM_MANIFEST_FILE}; edit manually.` }

  const index = indexes[0] as number
  const line = lines[index] as string
  if (!/\bmoduleId\s*:/.test(line)) {
    return { error: `"${id}" is an admin page, not a website module; modules.<id>.enabled only toggles ModuleManifest website modules.` }
  }

  const moduleEnabled = /\bmoduleEnabled\s*:\s*(true|false)/
  const defaultEnabled = /\bdefaultEnabled\s*:\s*(true|false)/
  if (!moduleEnabled.test(line) || !defaultEnabled.test(line)) {
    return { error: `Module "${id}" is missing moduleEnabled/defaultEnabled; edit ${PM_MANIFEST_FILE} manually.` }
  }

  lines[index] = line
    .replace(moduleEnabled, `moduleEnabled: ${enabled}`)
    .replace(defaultEnabled, `defaultEnabled: ${enabled}`)
  return { content: lines.join('\n') }
}

/**
 * Write `content` atomically and only after it loads. The temp file sits next
 * to the target so it inherits the project's tsconfig (`$lib` aliases) and the
 * final rename is atomic; a failed load leaves the original file untouched.
 */
function writeValidated(filePath: string, content: string, validate: (mod: Record<string, unknown>) => string | null): string | null {
  const temp = join(dirname(filePath), `.${basename(filePath)}.${process.pid}-${Date.now()}.tmp.ts`)
  try {
    writeFileSync(temp, content, 'utf-8')
    const error = validate(loadModuleExports(temp))
    if (error) return error
    renameSync(temp, filePath)
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Rejected: the rewritten ${basename(filePath)} does not load (${message}). The original file was left untouched.`
  } finally {
    try {
      if (existsSync(temp)) unlinkSync(temp)
    } catch {
      // best-effort cleanup; the validated file already replaced the target
    }
  }
}

export const configTools: PmTool[] = [
  {
    name: 'pm_config_get',
    description:
      `Read the PuppetMaster 4 project configuration. Returns ${PM_CONFIG_FILE} (mode, site, storage, mail, admin, security) and the module state derived from the ModuleManifest (${PM_MANIFEST_FILE}).`,
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Dot-notation key to read (e.g. "mode", "site.locales", "modules.faq"). Omit for the full config + module manifest.',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      let project: PmProject | null
      try {
        project = await loadConfig(root)
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
      if (!project) return `No PuppetMaster 4 config found at ${PM_CONFIG_FILE} (project root: ${root}).`

      const modules = moduleMap(project)
      const key = args.key as string | undefined
      if (!key) {
        return JSON.stringify({ config: project.config, modules, moduleManifest: project.modules }, null, 2)
      }

      const parts = key.split('.')
      const scoped =
        parts[0] === 'config'
          ? readPath(project.config, parts.slice(1))
          : parts[0] === 'modules'
            ? readPath(modules, parts.slice(1))
            : readPath(project.config, parts)
      if (scoped.found) return render(scoped.value)

      const module = readPath(modules, parts)
      if (module.found) return render(module.value)
      return `Key "${key}" not found. Use "config.<path>" or "modules.<moduleId>".`
    },
  },
  {
    name: 'pm_config_set',
    description:
      `Set a PuppetMaster 4 value. Scalar leaves are rewritten in ${PM_CONFIG_FILE} only when the key is unique; arrays/objects are refused because that file is imported by svelte.config.js. "modules.<id>.enabled" flips the module's public and admin gates together in ${PM_MANIFEST_FILE}. Every write is validated before it replaces the original.`,
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Dot-notation config path (e.g. "mode", "admin.twoFactor") or "modules.<id>.enabled"',
        },
        value: {
          description: 'New scalar value (string, number, or boolean)',
        },
      },
      required: ['key', 'value'],
    },
    async handler(args) {
      const { key, value } = args as { key?: string; value?: unknown }
      if (!key) return 'Specify key=<path> and value=<value>.'
      if (value === undefined) return 'Specify a value (undefined cannot be written to the config).'
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return `Only scalar values (string, number, boolean) can be set; edit ${PM_CONFIG_FILE} manually for arrays/objects.`
      }
      if (typeof value === 'number' && !Number.isFinite(value)) return 'Only finite numbers can be written.'

      const root = getProjectRoot()
      let project: PmProject | null
      try {
        project = await loadConfig(root)
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
      if (!project) return `No PuppetMaster 4 config found at ${PM_CONFIG_FILE} (project root: ${root}).`

      const moduleFlag = /^modules\.([^.]+)\.enabled$/.exec(key)
      if (moduleFlag) {
        if (typeof value !== 'boolean') return `modules.${moduleFlag[1]}.enabled expects true or false.`
        if (!project.manifestPath) return `No ${PM_MANIFEST_FILE} found (project root: ${root}); there is no module manifest to toggle.`
        const id = moduleFlag[1] as string
        const path = resolve(root, PM_MANIFEST_FILE)
        const result = rewriteModuleFlag(readFileSync(path, 'utf-8'), id, value)
        if ('error' in result) return result.error

        const error = writeValidated(path, result.content, (mod) => {
          const manifest = mod.MODULE_MANIFEST
          if (!Array.isArray(manifest)) return `Rejected: ${PM_MANIFEST_FILE} no longer exports MODULE_MANIFEST.`
          const entry = manifest.find((item): item is Record<string, unknown> =>
            !!item && typeof item === 'object' && (item as Record<string, unknown>).id === id,
          )
          if (!entry) return `Rejected: module "${id}" disappeared after the rewrite.`
          if (entry.moduleEnabled !== value || entry.defaultEnabled !== value) {
            return `Rejected: "${id}" gates did not move together (moduleEnabled/defaultEnabled).`
          }
          return null
        })
        return error ?? `Set ${key} = ${value} in ${PM_MANIFEST_FILE}.`
      }

      const normalized = key.replace(/^config\./, '')
      const path = resolve(root, PM_CONFIG_FILE)
      const result = rewriteScalar(readFileSync(path, 'utf-8'), normalized, value)
      if ('error' in result) return result.error

      const error = writeValidated(path, result.content, (mod) => {
        const actual = readPath(mod.PM_CONFIG, normalized.split('.'))
        if (!actual.found) return `Rejected: ${normalized} is not readable after the rewrite.`
        if (actual.value !== value) return `Rejected: ${normalized} did not accept the new value.`
        return null
      })
      return error ?? `Set ${key} in ${PM_CONFIG_FILE}.`
    },
  },
]
