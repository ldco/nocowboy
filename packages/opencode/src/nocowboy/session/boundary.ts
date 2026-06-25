type AnyMessage = {
  role: string
  content?: unknown[]
  id?: string
}

function getToolResultIds(msg: AnyMessage): string[] {
  if (!Array.isArray(msg.content)) return []
  const ids: string[] = []
  for (const block of msg.content as Array<Record<string, unknown>>) {
    if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
      ids.push(block.tool_use_id)
    }
  }
  return ids
}

function getToolUseIds(msg: AnyMessage): string[] {
  if (!Array.isArray(msg.content)) return []
  const ids: string[] = []
  for (const block of msg.content as Array<Record<string, unknown>>) {
    if (block.type === "tool_use" && typeof block.id === "string") {
      ids.push(block.id)
    }
  }
  return ids
}

/**
 * Walk the boundary backward to ensure tool_use/tool_result pairs are not
 * split across the summary/tail divide, and that thinking blocks sharing
 * a message.id with kept assistants are included.
 */
export function adjustBoundaryForApiInvariants(
  messages: AnyMessage[],
  candidateBoundary: number,
): number {
  if (candidateBoundary <= 0 || candidateBoundary >= messages.length) {
    return candidateBoundary
  }

  let idx = candidateBoundary

  // Step 1: tool_use/tool_result pairing.
  const tailToolResults: string[] = []
  const tailToolUses = new Set<string>()
  for (let i = idx; i < messages.length; i++) {
    tailToolResults.push(...getToolResultIds(messages[i]))
    for (const useId of getToolUseIds(messages[i])) tailToolUses.add(useId)
  }
  let orphans = tailToolResults.filter((id) => !tailToolUses.has(id))

  for (let i = idx - 1; i >= 0 && orphans.length > 0; i--) {
    const m = messages[i]
    if (m.role !== "assistant") continue
    const useIds = getToolUseIds(m)
    const matched = useIds.filter((id) => orphans.includes(id))
    if (matched.length > 0) {
      idx = i
      orphans = orphans.filter((id) => !matched.includes(id))
    }
  }

  // Step 2: same message.id walk-back (thinking blocks share id with sibling).
  const boundaryMsgId = messages[idx]?.id
  if (boundaryMsgId) {
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].id === boundaryMsgId) {
        idx = i
      } else {
        break
      }
    }
  }

  return idx
}

type AlignMsg = {
  readonly info: { readonly role: "user" | "assistant" }
  readonly parts: ReadonlyArray<{ readonly type: string }>
}

/**
 * Walk backwards from `idx` to find the nearest user message that is not
 * entirely composed of tool_result parts. Used to align a delta slice's
 * start so the LLM does not see an orphan tool_result.
 */
export function alignToNonToolResultUser(msgs: ReadonlyArray<AlignMsg>, idx: number): number {
  if (idx >= msgs.length) return idx
  for (let i = idx; i >= 0; i--) {
    const m = msgs[i]
    if (m.info.role !== "user") continue
    const allToolResult = m.parts.length > 0 && m.parts.every((p) => p.type === "tool_result")
    if (!allToolResult) return i
  }
  return 0
}
