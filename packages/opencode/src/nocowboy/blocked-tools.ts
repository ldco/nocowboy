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
  /** Check function. Return { blocked: true } to block this tool. */
  check: () => BlockerCheckResult | Promise<BlockerCheckResult>
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
export async function isToolBlocked(toolName: string): Promise<BlockerCheckResult> {
  for (const blocker of blockers) {
    // Check if tool name matches (exact or regex)
    const matches = blocker.toolName.startsWith("/")
      ? new RegExp(blocker.toolName.slice(1, -1)).test(toolName)
      : blocker.toolName === toolName

    if (!matches) continue

    const result = await blocker.check()
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
