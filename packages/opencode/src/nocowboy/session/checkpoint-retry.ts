import * as fs from "node:fs/promises"
import * as path from "node:path"
import { checkpointPath, memoryPath, metaDir } from "./checkpoint-paths"
import {
  validateSnapshot,
  validateLearning,
  validateMemory,
  validateProgress,
  validateBudget,
  validateBudgetSections,
  extractTitlesFromLearning,
  type Violation,
} from "./checkpoint-validator"
import { CHECKPOINT_SECTION_BUDGETS, MEMORY_SECTION_BUDGETS } from "./checkpoint-templates"

export async function loadPriorDiscoveredTitles(sessionID: string): Promise<Set<string>> {
  let text: string
  try {
    text = await fs.readFile(checkpointPath(sessionID), "utf-8")
  } catch {
    return new Set()
  }
  if (!text) return new Set()
  return new Set(extractTitlesFromLearning(text))
}

export async function runValidatorsForCkpt(
  sessionID: string,
  injected: {
    priorTitles: Set<string>
    expectedRevisions: { id: string; expectedText: string }[]
    projectID: string
    budgets?: { checkpoint: number; memory: number }
  },
): Promise<Violation[]> {
  let checkpointContent: string
  try {
    checkpointContent = await fs.readFile(checkpointPath(sessionID), "utf-8")
  } catch {
    checkpointContent = ""
  }
  let memoryContent: string
  try {
    memoryContent = await fs.readFile(memoryPath(injected.projectID), "utf-8")
  } catch {
    memoryContent = ""
  }

  const violations: Violation[] = []

  if (checkpointContent) {
    violations.push(...validateSnapshot(checkpointContent, "checkpoint.md"))
    violations.push(...validateLearning(checkpointContent, "checkpoint.md", injected.priorTitles))
  } else {
    violations.push({
      file: "checkpoint.md",
      rule: "topic-missing",
      severity: "error",
      detail: "checkpoint file did not exist after writer finished",
    })
  }

  if (memoryContent && injected.expectedRevisions.length > 0) {
    violations.push(...validateMemory(memoryContent, injected.expectedRevisions))
  }

  const budgets = injected.budgets ?? { checkpoint: 11_000, memory: 10_000 }

  if (checkpointContent) {
    violations.push(...validateBudget(checkpointContent, budgets.checkpoint, "checkpoint.md"))
    violations.push(...validateBudgetSections(checkpointContent, "checkpoint.md"))
  }
  if (memoryContent) {
    violations.push(...validateBudget(memoryContent, budgets.memory, "MEMORY.md"))
    violations.push(...validateBudgetSections(memoryContent, "MEMORY.md"))
  }

  return violations
}

export async function runTaskProgressValidators(sessionID: string): Promise<Violation[]> {
  const violations: Violation[] = []
  const taskMemRoot = path.join(metaDir(sessionID), "tasks")
  let taskDirs: string[]
  try {
    taskDirs = await fs.readdir(taskMemRoot)
  } catch {
    return []
  }
  for (const tid of taskDirs) {
    let prog: string
    try {
      prog = await fs.readFile(path.join(taskMemRoot, tid, "progress.md"), "utf-8")
    } catch {
      continue
    }
    if (prog) {
      violations.push(...validateProgress(prog, `tasks/${tid}/progress.md`))
    }
  }
  return violations
}

export async function quarantineCheckpoint(sessionID: string): Promise<void> {
  const dir = metaDir(sessionID)
  const from = path.join(dir, "checkpoint.md")
  const to = path.join(dir, "checkpoint.invalid.md")
  await fs.rename(from, to).catch(() => {})
}

export function buildReflectionMessage(
  errors: Violation[],
  paths: { checkpoint: string; memory: string },
): string {
  const grouped = new Map<string, string[]>()
  for (const e of errors) {
    const list = grouped.get(e.file) ?? []
    list.push(`- ${e.detail}`)
    grouped.set(e.file, list)
  }
  const sections = [...grouped.entries()].map(
    ([file, lines]) => `${file}:\n${lines.join("\n")}`,
  )
  return [
    "<system-reminder>",
    "The previous attempt had validation errors. Read your output at the absolute paths below, fix only the issues listed, and write again.",
    "",
    sections.join("\n\n"),
    "",
    `CHECKPOINT_PATH = ${paths.checkpoint}`,
    `MEMORY_PATH     = ${paths.memory}`,
    "</system-reminder>",
  ].join("\n")
}

export function buildExtractionReflection(violations: Violation[]): string {
  const overBudget = violations.filter((v) => v.severity === "extract-required")
  const files = overBudget.map((v) => `${v.file} (${v.detail})`).join(", ")
  return [
    `EXTRACTION REQUIRED: The following files exceed their budget: ${files}.`,
    "",
    "Extract the LESS-IMPORTANT topic cluster into a new spillover file:",
    "  - Checkpoint spillover: checkpoint-<topic>.md",
    "  - Memory spillover: MEMORY-<topic>.md",
    "",
    "After extraction, edit the main file to remove extracted lines",
    'and insert an index line: "- See <spillover>.md (N entries)".',
  ].join("\n")
}
