import type { PmTool } from './index.js'
import { getProjectRoot, fileExists, loadConfig, PM_CONFIG_FILE } from './utils.js'

export const initTool: PmTool = {
  name: 'pm_init',
  description:
    'Initialize / inspect a PuppetMaster 4 project. Verifies SvelteKit dependencies, reads PM_CONFIG.mode from src/project/pm.config.ts, and reports the framework setup steps.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['develop', 'build', 'auto'],
        description: 'Expected project mode: develop (framework dev, seeded DB) or build (client project). Reports the current PM_CONFIG.mode and does not rewrite the typed config.',
      },
      startDev: {
        type: 'boolean',
        description: 'Start the dev server after initialization',
      },
    },
  },
  async handler(args) {
    const root = getProjectRoot()
    const results: string[] = []

    // PM4 is SvelteKit + Vite; the old Nuxt binary check never exists here.
    if (!fileExists('node_modules/.bin/svelte-kit') && !fileExists('node_modules/.bin/vite')) {
      results.push('Dependencies missing. Run: npm install')
      return results.join('\n')
    }

    let project = null
    let configError: string | null = null
    try {
      project = await loadConfig(root)
    } catch (error) {
      configError = error instanceof Error ? error.message : String(error)
    }

    results.push(`Project root: ${root}`)
    results.push(`Config (${PM_CONFIG_FILE}) exists: ${project !== null}`)
    if (configError) results.push(`Config read error: ${configError}`)
    if (project) results.push(`Current mode: ${String(project.config.mode ?? 'unknown')}`)
    if (project) results.push(`Modules from manifest: ${project.modules.filter((module) => module.moduleId).length}`)

    const mode = (args.mode as string) ?? 'auto'
    results.push(`Requested mode: ${mode}`)
    results.push('Next steps: npm run db:push, optionally npm run db:seed, then pm_dev start (npm run dev runs predev bootstrap).')
    results.push('Use pm_status for full project status.')

    if (args.startDev === true) {
      results.push('Start the server with pm_dev action=start.')
    }

    return results.join('\n')
  },
}
