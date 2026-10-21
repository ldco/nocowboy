import type { PmTool } from './index.js'
import { getProjectRoot, checkPort, fileExists, fileSize, loadConfig, PM_CONFIG_FILE, type PmProject } from './utils.js'

const DEV_PORT = 5173

function moduleState(project: PmProject): Record<string, unknown> {
  return Object.fromEntries(
    project.modules
      .filter((module) => module.moduleId !== undefined)
      .map((module) => [module.moduleId as string, { enabled: module.moduleEnabled ?? true, config: module.config ?? {} }]),
  )
}

export const statusTool: PmTool = {
  name: 'pm_status',
  description:
    'Display PuppetMaster 4 project status: typed config, module manifest, database file, and dev server (Vite on port 5173).',
  inputSchema: {
    type: 'object',
    properties: {
      detail: {
        type: 'string',
        enum: ['summary', 'config', 'modules', 'db', 'full'],
        description: 'Level of detail to return',
      },
    },
  },
  async handler(args) {
    const root = getProjectRoot()
    const detail = (args.detail as string) || 'summary'

    const status: Record<string, unknown> = { projectRoot: root }

    let project: PmProject | null = null
    let configError: string | null = null
    try {
      project = await loadConfig(root)
    } catch (error) {
      configError = error instanceof Error ? error.message : String(error)
    }

    status.configExists = project !== null
    status.configPath = PM_CONFIG_FILE
    status.mode = project?.config.mode ?? 'unknown'
    if (configError) status.configError = configError

    const dbState = { exists: fileExists('data/sqlite.db'), path: 'data/sqlite.db', sizeBytes: fileSize('data/sqlite.db') }
    const devRunning = checkPort(DEV_PORT)

    if (detail === 'summary') {
      status.database = dbState
      status.devServer = { running: devRunning, port: DEV_PORT, url: devRunning ? `http://localhost:${DEV_PORT}` : null }
      status.modules = project ? moduleState(project) : {}
      return JSON.stringify(status, null, 2)
    }

    if (detail === 'config' || detail === 'modules' || detail === 'full') {
      status.config = project?.config ?? null
      status.site = project?.config.site ?? null
      status.modules = project ? moduleState(project) : {}
      status.moduleManifest = project?.modules ?? []
    }

    if (detail === 'db' || detail === 'full') {
      status.database = dbState
    }

    if (detail === 'full') {
      status.devServer = {
        running: devRunning,
        port: DEV_PORT,
        url: devRunning ? `http://localhost:${DEV_PORT}` : null,
      }
    }

    return JSON.stringify(status, null, 2)
  },
}
