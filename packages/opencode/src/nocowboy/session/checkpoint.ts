import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Token } from "@/util/token"
import {
  checkpointPath,
  memoryPath,
  notesPath,
  tasksDir,
  globalMemoryPath,
  metaDir,
} from "./checkpoint-paths"
import { readBudgeted, readBudgetedSectionAware } from "./budgeted-read"
import { CHECKPOINT_SECTION_BUDGETS } from "./checkpoint-templates"
import { extractTitlesFromLearning } from "./checkpoint-validator"

// ---------------------------------------------------------------------------
// Token estimation helpers
// ---------------------------------------------------------------------------

function estimateMessageTokens(m: { parts: Array<{ type: string; [k: string]: unknown }> }): number {
  let sum = 0
  for (const p of m.parts) {
    try {
      sum += Token.estimate(JSON.stringify(p))
    } catch {
      sum += 1000
    }
  }
  return sum
}

function hasTextBlocks(m: { parts: Array<{ type: string }> }): boolean {
  return m.parts.some((p) => p.type === "text" || p.type === "reasoning")
}

// ---------------------------------------------------------------------------
// Tail preservation budget constants
// ---------------------------------------------------------------------------

const TAIL_MIN_TOKENS = 10_000
const TAIL_MAX_TOKENS = 20_000
const TAIL_MIN_TEXT_BLOCK_MESSAGES = 5

// ---------------------------------------------------------------------------
// Boundary computation
// ---------------------------------------------------------------------------

export function computeBoundary(
  msgs: ReadonlyArray<{
    info: { id: string; role: "user" | "assistant"; finish?: string }
    parts: Array<{ type: string; [k: string]: unknown }>
  }>,
): string {
  if (msgs.length === 0) return ""
  const lastAsstIdx = msgs.findLastIndex(
    (m) => m.info.role === "assistant" && m.info.finish !== undefined,
  )
  if (lastAsstIdx <= 0) return msgs[lastAsstIdx >= 0 ? lastAsstIdx : 0].info.id

  const tokens = msgs.map((m) => estimateMessageTokens(m))
  let startIdx = lastAsstIdx - 1
  let tailSum = 0
  let textBlockCount = 0
  for (let i = startIdx; i < msgs.length; i++) {
    tailSum += tokens[i]
    if (hasTextBlocks(msgs[i])) textBlockCount += 1
  }

  if (tailSum >= TAIL_MAX_TOKENS) {
    return msgs[startIdx].info.id
  }

  while (
    startIdx > 0 &&
    tailSum < TAIL_MAX_TOKENS &&
    (tailSum < TAIL_MIN_TOKENS || textBlockCount < TAIL_MIN_TEXT_BLOCK_MESSAGES)
  ) {
    startIdx -= 1
    tailSum += tokens[startIdx]
    if (hasTextBlocks(msgs[startIdx])) textBlockCount += 1
  }
  return msgs[startIdx].info.id
}

// ---------------------------------------------------------------------------
// User message utilities
// ---------------------------------------------------------------------------

export function userMsgText(
  parts: Array<{ type: string; text?: string; synthetic?: boolean }>,
): string {
  return parts
    .filter((p) => p.type === "text" && !p.synthetic && typeof p.text === "string" && p.text.length > 0)
    .map((p) => p.text!)
    .join("\n")
}

function truncateVerbatimUserMsg(text: string, capTokens: number, messageID: string): string {
  if (Token.estimate(text) <= capTokens) return text
  const head = text.slice(0, Math.floor(capTokens * 0.6) * 4)
    .replace(/[\uD800-\uDBFF]$/, "")
  const tail = text.slice(-Math.floor(capTokens * 0.3) * 4)
    .replace(/^[\uDC00-\uDFFF]/, "")
  const elidedTokens = Token.estimate(text) - Token.estimate(head) - Token.estimate(tail)
  return [
    head,
    `[elided ${elidedTokens} tokens; messageID=${messageID}; use the history tool with operation=around to fetch full content]`,
    tail,
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Writer prompt composition
// ---------------------------------------------------------------------------

function renderSectionBudgets(budgets: Record<string, number>): string {
  const entries = Object.entries(budgets)
  const cols = 3
  const lines: string[] = ["Section budgets (~tokens):"]
  for (let i = 0; i < entries.length; i += cols) {
    const row = entries.slice(i, i + cols)
      .map(([k, v]) => `${k}: ${v}`)
      .join("    ")
    lines.push(`   ${row}`)
  }
  return lines.join("\n")
}

export function composeWriterPrompt(input: {
  checkpointFile: string
  memoryFile: string
  notesFile: string
  rangeDesc: string
  progressDiff: string
  taskMemDir: string
}): string {
  return [
    "<system-reminder>",
    "You are now operating in checkpoint-writer mode. Ignore the general coding-assistant framing in the system prompt above. The read, write, edit, glob, grep, and task tools are available; do not invoke others.",
    "",
    "=========================================================================",
    "ABSOLUTE PATHS — USE THESE VERBATIM. NEVER COMPUTE, INFER, OR MODIFY.",
    "=========================================================================",
    "",
    `CHECKPOINT_PATH = ${input.checkpointFile}`,
    `MEMORY_PATH     = ${input.memoryFile}`,
    `TASK_MEM_DIR    = ${input.taskMemDir}`,
    `NOTES_PATH      = ${input.notesFile}`,
    "",
    "When using the Write tool, the first arg MUST be one of these literal",
    "absolute paths. Do NOT abbreviate. Do NOT change parent directories.",
    "=========================================================================",
    "",
    input.progressDiff,
    "",
    renderSectionBudgets(CHECKPOINT_SECTION_BUDGETS),
    "</system-reminder>",
    "",
    `Write the next checkpoint for this session.`,
    "",
    input.rangeDesc,
    "",
    "After all writes and tool calls, stop immediately.",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Checkpoint index / rebuild context
// ---------------------------------------------------------------------------

export async function renderIndex(sessionID: string): Promise<string> {
  const snapFile = checkpointPath(sessionID)
  let exists: boolean
  try {
    await fs.access(snapFile)
    exists = true
  } catch {
    exists = false
  }
  if (!exists) return "No checkpoints yet for this session."

  let content: string
  try {
    content = await fs.readFile(snapFile, "utf-8")
  } catch {
    return "No checkpoints yet for this session."
  }
  const topicMatch = content.match(/^Topic:\s*(.+)$/m)
  const topic = topicMatch ? topicMatch[1].trim() : "(unknown)"
  const dir = metaDir(sessionID)

  return [
    "## Checkpoint",
    "",
    `Directory: ${dir}/`,
    "",
    `Current checkpoint (${topic}): checkpoint.md [shown below]`,
    "",
    `Use read("${snapFile}") to access the full checkpoint.`,
  ].join("\n")
}

export async function renderRebuildContext(
  sessionID: string,
  opts?: {
    agentID?: string
  },
): Promise<string> {
  if (opts?.agentID && opts.agentID !== "main") return ""

  const snapFile = checkpointPath(sessionID)
  const memFile = memoryPath("global")
  const notesFile = notesPath(sessionID)

  const checkpointResult = await readBudgetedSectionAware(snapFile, 11_000)
  const checkpointText = checkpointResult?.text ?? ""

  const memoryResult = await readBudgetedSectionAware(memFile, 10_000)
  const memoryText = memoryResult?.text ?? ""

  const notesResult = await readBudgeted(notesFile, 6_000)
  const notesText = notesResult?.text ?? ""

  const hasContent = checkpointText || memoryText || notesText
  if (!hasContent) return ""

  const sections: string[] = [
    "<system-reminder>",
    "The following context was reconstructed from prior checkpoints and memory.",
    "Verify the information is still relevant before acting on it.",
    "</system-reminder>",
  ]

  if (checkpointText) {
    sections.push("", "## Accumulated learnings from checkpoints", "", checkpointText)
  }

  if (memoryText) {
    sections.push("", "## Project context from MEMORY.md", "", memoryText)
  }

  if (notesText) {
    sections.push("", "## Session notes", "", notesText)
  }

  return sections.join("\n")
}
