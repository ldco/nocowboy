//
// Replaces the manual nutausik-hooks.sh with native code wired into
// the NoCowboy session lifecycle:
//   - SessionStart → auto-create NUTAUSIK session + task (onSessionCreated)
//   - PostToolUse  → log tool calls to the task (via hooks MCP registration)
//   - SessionEnd   → close NUTAUSIK session + save handoff + compact memory
//
// All MCP communication is delegated to nutausik-client.ts.

import { saveMetrics } from "./session-metrics"
import { autoCreateTask, autoEndSession, callTool } from "./nutausik-client"
import * as Log from "@nocowboy/core/util/log"
import * as fs from "node:fs"
import * as path from "node:path"
import { homedir } from "node:os"

const log = Log.create({ service: "nutausik.auto-wire" })

const HOOKS_FILE = path.join(homedir(), ".nocowboy", "hooks.json")

/**
 * Register a PostToolUse hook that logs tool calls to NUTAUSIK.
 * Writes directly to ~/.nocowboy/hooks.json — the hooks MCP reads it dynamically.
 */
/**
 * Register a PostToolUse hook that logs tool calls to NUTAUSIK.
 * Writes directly to ~/.nocowboy/hooks.json — the hooks MCP reads it dynamically.
 */
function registerToolLoggingHook(): void {
  try {
    if (!fs.existsSync(HOOKS_FILE)) {
      fs.writeFileSync(HOOKS_FILE, JSON.stringify({ hooks: {} }, null, 2))
    }
    const config = JSON.parse(fs.readFileSync(HOOKS_FILE, "utf-8"))
    if (!config.hooks) config.hooks = {}
    if (!config.hooks.PostToolUse) config.hooks.PostToolUse = []

    if (!config.hooks.PostToolUse.some((h: any) => h.id === "nutausik-log")) {
      config.hooks.PostToolUse.push({
        id: "nutausik-log",
        event: "PostToolUse",
        matcher: "*",
        type: "command",
        command: "sh",
        args: [
          "-c",
          'cat | python3 -c "\nimport sys,json,subprocess\nctx=json.loads(sys.stdin.read())\ntool=ctx.get(\'tool_name\',\'\')\nargs=ctx.get(\'tool_args\',{})\n# Extract relevant detail from args\nif tool==\'bash\': detail=\'cmd: \' + args.get(\'command\',\'\')[:80]\nelif tool in (\'edit\',\'write\'): detail=\'file: \' + args.get(\'filePath\',args.get(\'file\',\'\'))[:80]\nelif tool==\'search_replace\': detail=\'file: \' + args.get(\'filePath\',\'\')[:80]\nelse: detail=\'\'\nmsg=f\'{tool} — completed ({detail})\' if detail else f\'{tool} — completed\'\nsubprocess.run([\'curl\',\'-s\',\'-X\',\'POST\',\'http://127.0.0.1:9204/mcp\',\'-H\',\'Content-Type: application/json\',\'-d\',json.dumps({\'jsonrpc\':\'2.0\',\'id\':1,\'method\':\'tools/call\',\'params\':{\'name\':\'nutausik_task_log\',\'arguments\':{\'message\':msg,\'phase\':\'execute\'}}})],capture_output=True)\n"',
        ],
      })
      fs.writeFileSync(HOOKS_FILE, JSON.stringify(config, null, 2))
      log.info("registered PostToolUse logging hook")
    }
  } catch (e) {
    log.warn("failed to register PostToolUse hook", { error: String(e) })
  }
}

/**
 * Called when a NoCowboy session is created.
 * Auto-creates a NUTAUSIK task, starts a NUTAUSIK session,
 * and registers a PostToolUse hook for tool call logging.
 */
export function onSessionCreated(sessionID: string, title: string, directory: string): void {
  autoCreateTask(sessionID, title, directory)
  registerToolLoggingHook()
}

/**
 * Called when a NoCowboy session is removed/ended.
 * Auto-ends the NUTAUSIK session, saves handoff, compacts memory.
 */
export function onSessionEnded(sessionID: string, directory: string): void {
  autoEndSession(sessionID, directory)
  // Save session metrics (non-blocking, errors ignored)
  try {
    saveMetrics({
      sessionID,
      title: "",
      agent: "",
      startTime: 0,
      endTime: Date.now(),
      durationMs: 0,
      messageCount: 0,
      toolCallCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    })
  } catch {}
}
