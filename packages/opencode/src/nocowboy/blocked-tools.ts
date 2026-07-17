// nocowboy_change — PreToolUse blocking system (Claude Code-style)
//
// Регистратор блокировок инструментов. Работает на уровне resolveTools:
// перед тем как инструмент попадёт в список доступных модели, проверяется
// не заблокирован ли он. Если заблокирован — модель его не видит и не
// может вызвать.
//
// Как в Claude Code: PreToolUse hook может вернуть permissionDecision: "deny"
// и инструмент не выполняется. Разница: мы блокируем на уровне списка тулов,
// а не в рантайме. Результат тот же — модель не может вызвать заблокированный тул.

export interface BlockerCheckResult {
  blocked: boolean
  reason?: string
}

export interface ToolBlocker {
  /** Tool name pattern (exact match or regex string). */
  toolName: string
  /** Check function. Receives tool arguments if available. Return { blocked: true } to block this tool. */
  check: (args?: Record<string, unknown>) => BlockerCheckResult | Promise<BlockerCheckResult>
  /** Human-readable description of why this tool is blocked. */
  description: string
}

const blockers: ToolBlocker[] = []

/**
 * Register a tool blocker. All blockers are checked before each tool execution.
 * If ANY blocker returns { blocked: true }, the tool is removed from the
 * available list and the model cannot call it.
 */
export function registerBlocker(blocker: ToolBlocker): void {
  const existing = blockers.findIndex((b) => b.toolName === blocker.toolName)
  if (existing >= 0) blockers[existing] = blocker
  else blockers.push(blocker)
}

/**
 * Check if a tool is blocked by any registered blocker.
 * Returns the first blocking result, or { blocked: false } if all pass.
 */
export async function isToolBlocked(toolName: string, args?: Record<string, unknown>): Promise<BlockerCheckResult> {
  for (const blocker of blockers) {
    // Check if tool name matches (exact or regex)
    const matches = blocker.toolName.startsWith("/")
      ? new RegExp(blocker.toolName.slice(1, -1)).test(toolName)
      : blocker.toolName === toolName

    if (!matches) continue

    const result = await blocker.check(args)
    if (result.blocked) return result
  }
  return { blocked: false }
}

/**
 * List all registered blockers (for debugging / `/blockers` command).
 */
export function listBlockers(): ToolBlocker[] {
  return [...blockers]
}

// ── Bash firewall: опасные команды ───────────────────────────────────

const DANGEROUS_BASH_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+-rf\s+\/\s*$/, reason: "rm -rf / — удаление всей файловой системы" },
  { pattern: /\brm\s+-rf\s+\/\s+\-/, reason: "rm -rf / — удаление всей файловой системы" },
  { pattern: /\bdd\s+if=.*\s+of=\/dev\//, reason: "dd of=/dev/ — может уничтожить диск" },
  { pattern: /\bdd\s+of=\/dev\/(sda|sdb|sdc|nvme|mmcblk)/, reason: "dd на системный диск" },
  { pattern: /\b:\(\)\s*\{/, reason: "Fork bomb (:(){ :|:& };:)" },
  { pattern: /\bchmod\s+-R\s+777\s+\//, reason: "chmod -R 777 / — открывает всю ФС" },
  { pattern: /\bchown\s+-R\s+\/\/\s*$/, reason: "chown всего корня" },
  { pattern: /\bmv\s+\/\s+\/dev\/null/, reason: "mv / в /dev/null" },
  { pattern: /\bwget\s+-O\s*-\s+.*\s*\|.*\s*bash/, reason: "wget pipe to bash — опасный паттерн" },
  { pattern: /\bcurl\s+.*\s*\|.*\s*bash/, reason: "curl pipe to bash — опасный паттерн" },
  { pattern: /\bmkfs\.\w+\s+\/dev\/(sda|sdb|nvme)/, reason: "форматирование системного диска" },
  { pattern: /\b>\s*\/dev\/(sda|sdb|nvme)/, reason: "прямая запись в устройство" },
]

registerBlocker({
  toolName: "bash",
  description: "Bash firewall: блокирует опасные команды (rm -rf /, dd, fork bomb, curl|bash, ...)",
  check: (args) => {
    const command = ((args?.command as string) ?? "").trim()
    if (!command) return { blocked: false }

    // Проверяем только первые 200 символов (достаточно для определения опасности)
    const snippet = command.slice(0, 200).toLowerCase()

    for (const { pattern, reason } of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(snippet)) {
        return { blocked: true, reason }
      }
    }
    return { blocked: false }
  },
})

// ── Built-in blockers ────────────────────────────────────────────────

/**
 * nutausik_task_done: агент должен использовать complete_task (с верификацией).
 *
 * Причина: complete_task запускает LSP diagnostics, Constitution и только
 * потом вызывает nutausik_task_done. Прямой вызов nutausik_task_done
 * обходит верификацию и может привести к коммиту сломанного кода.
 */
registerBlocker({
  toolName: "nutausik_task_done",
  description:
    "BLOCKED: use `complete_task` instead. nutausik_task_done bypasses verification.",
  check: () => ({ blocked: true, reason: "Use `complete_task` instead of nutausik_task_done" }),
})

// ── Task gate: code tool calls без активного task ────────────────────
//
// Блокирует code-modifying tools если нет ни одного активного NUTAUSIK task.
// Проверяет только если проект использует roadmap.json (есть planned features).
// Если roadmap.json нет — gate не срабатывает (проект не использует NUTAUSIK).
function hasReadyTasks(): boolean {
  try {
    const { homedir } = require("os") as typeof import("os")
    const { join } = require("path") as typeof import("path")
    const { existsSync } = require("fs") as typeof import("fs")
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")

    // Проверяем roadmap.json в текущей директории
    const cwd = process.cwd()
    const roadmapPath = join(cwd, "docs", "roadmap.json")
    if (!existsSync(roadmapPath)) return true // Нет roadmap — не блокируем

    const dbPath = join(homedir(), ".local/share/nocowboy/storage/nocowboy.db")
    if (!existsSync(dbPath)) return true // Нет БД — не блокируем

    const db = new Database(dbPath)
    try {
      const row = db.query("SELECT COUNT(*) as cnt FROM task WHERE status IN ('open', 'in_progress')").get() as { cnt: number } | undefined
      return row !== undefined && row.cnt > 0
    } finally {
      db.close()
    }
  } catch {
    return true // Если ошибка — не блокируем (fail open)
  }
}

const CODE_TOOLS = ["edit", "write", "apply_patch", "search_replace"]

for (const tool of CODE_TOOLS) {
  registerBlocker({
    toolName: tool,
    description: `Task gate: ${tool} requires an active NUTAUSIK task when project uses roadmap.json.`,
    check: () => {
      if (!hasReadyTasks()) {
        return { blocked: true, reason: `No active NUTAUSIK task found. Use \`task create\` or \`to-spec\` to start a task before making code changes.` }
      }
      return { blocked: false }
    },
  })
}
