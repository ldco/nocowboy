/**
 * Spec Contract for Delegation — the 5-part delegation template.
 *
 * A subagent never sees the conversation that spawned it, so the prompt *is* the
 * spec. This module defines the canonical five parts (goal, constraints,
 * acceptance criteria, files to touch, files to NOT touch), renders them to a
 * stable markdown block, and validates that no part was silently dropped — an
 * empty part must be written as the explicit word `none`, not omitted. The task
 * tool logs a warning when a delegation arrives without a contract.
 *
 * Pure: no engine, no Effect, no filesystem.
 */

export const SPEC_CONTRACT_PARTS = [
  "goal",
  "constraints",
  "acceptanceCriteria",
  "filesToTouch",
  "filesToNotTouch",
] as const
export type SpecContractPart = (typeof SPEC_CONTRACT_PARTS)[number]

export interface SpecContract {
  goal: string
  constraints: string | readonly string[]
  acceptanceCriteria: string | readonly string[]
  filesToTouch: string | readonly string[]
  filesToNotTouch: string | readonly string[]
}

const HEADINGS: Record<SpecContractPart, string> = {
  goal: "Goal",
  constraints: "Constraints",
  acceptanceCriteria: "Acceptance Criteria",
  filesToTouch: "Files to touch",
  filesToNotTouch: "Files to NOT touch",
}

/** The explicit "nothing here" marker — an empty part must say this, not vanish. */
export const NONE = "none"

function toLines(value: string | readonly string[] | undefined): string[] {
  const raw = typeof value === "string" ? [value] : (value ?? [])
  return raw.map((item) => String(item).trim()).filter((item) => item.length > 0)
}

/**
 * Validate a contract. Returns one problem per missing/empty part (empty array =
 * valid). A part written as the explicit `none` is present; an empty string or an
 * empty array is a missing part.
 */
export function validateSpecContract(contract: Partial<SpecContract>): string[] {
  const problems: string[] = []
  for (const part of SPEC_CONTRACT_PARTS) {
    const lines = toLines(contract[part])
    if (lines.length === 0) {
      problems.push(`missing ${HEADINGS[part]} (write "${NONE}" to state it explicitly)`)
    }
  }
  return problems
}

/** Render the contract as a stable markdown block for a delegation prompt. */
export function renderSpecContract(contract: Partial<SpecContract>): string {
  const sections: string[] = []
  for (const part of SPEC_CONTRACT_PARTS) {
    const lines = toLines(contract[part])
    sections.push(`## ${HEADINGS[part]}`)
    if (part === "goal") {
      sections.push(lines[0] ?? NONE)
    } else {
      const items = lines.length > 0 ? lines : [NONE]
      sections.push(items.map((item) => `- ${item}`).join("\n"))
    }
  }
  return sections.join("\n\n")
}

/**
 * True when a prompt already carries a rendered spec contract (all five headings
 * present). Used to warn, not block — the contract is discipline, not a barrier.
 */
export function hasSpecContract(prompt: string): boolean {
  return SPEC_CONTRACT_PARTS.every((part) => prompt.includes(`## ${HEADINGS[part]}`))
}

/** A warning message when a delegation lacks a spec contract, else undefined. */
export function contractWarning(prompt: string): string | undefined {
  if (hasSpecContract(prompt)) return undefined
  return (
    "Delegation without a spec contract: include the five parts " +
    "(Goal, Constraints, Acceptance Criteria, Files to touch, Files to NOT touch)."
  )
}
