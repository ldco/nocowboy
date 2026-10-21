import type { PmTool } from './index.js'
import { getProjectRoot, runCmd, runCmdDetached, checkPort } from './utils.js'

export const devTool: PmTool = {
  name: 'pm_dev',
  description:
    'Manage the PuppetMaster 4 dev server (SvelteKit + Vite, port 5173). Start uses `npm run dev`, which also runs the package predev hook (env-bootstrap + Paraglide sync).',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'restart', 'status'],
        description: 'Action to perform on the dev server',
      },
      port: {
        type: 'number',
        description: 'Port to check (default: 5173)',
      },
    },
  },
  async handler(args) {
    const action = (args.action as string) || 'status'
    const port = (args.port as number) || 5173
    const root = getProjectRoot()
    const isRunning = checkPort(port)

    if (action === 'status') {
      return JSON.stringify({
        running: isRunning,
        port,
        url: isRunning ? `http://localhost:${port}` : null,
        projectRoot: root,
      })
    }

    if (action === 'stop') {
      if (!isRunning) return 'Dev server is not running.'
      runCmd(`lsof -i :${port} -sTCP:LISTEN -t | xargs kill 2>/dev/null; pkill -f "vite" 2>/dev/null || true`)
      return `Dev server on port ${port} has been stopped.`
    }

    if (action === 'start' || action === 'restart') {
      if (isRunning && action === 'start') {
        return `Dev server already running on port ${port}. Use pm_dev restart to cycle it.`
      }
      if (isRunning && action === 'restart') {
        runCmd(`lsof -i :${port} -sTCP:LISTEN -t | xargs kill 2>/dev/null; pkill -f "vite" 2>/dev/null || true`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      // `npm run dev` invokes PM4's predev hook (env-bootstrap + Paraglide sync)
      // automatically; spawning vite directly would silently skip it.
      const pid = runCmdDetached('npm', ['run', 'dev'], root)
      return `Dev server starting (pid ${pid}) on port ${port}. Use pm_dev status to verify.`
    }

    return `Unknown action: ${action}`
  },
}
