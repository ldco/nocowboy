/**
 * Spec contract for delegation.
 *
 * When an orchestrator hands work to another agent, the receiving agent has none
 * of the conversation context — the prompt IS the spec. A five-part contract
 * makes the delegation context-independent: goal, constraints, acceptance
 * criteria, files to touch, files to NOT touch. Inspired by Fable Advisor.
 *
 * Pure: render/validate are deterministic, so the same spec always renders
 * identically and the contract can be unit-tested without the engine. The task
 * tool consults `missingSpecContractSections` to warn (never block) when a
 * delegation prompt arrives without the five parts.
 */

export const SPEC_CONTRACT_SECTIONS = [
  { key: "goal", label: "Goal" },
  { key: "constraints", label: "Constraints" },
  { key: "acceptance_criteria", label: "Acceptance criteria" },
  { key: "files_to_touch", label: "Files to touch" },
  { key: "files_to_not_touch", label: "Files to NOT touch" },
] as const

export type SpecContractKey = (typeof SPEC_CONTRACT_SECTIONS)[number]["key"]

export interface SpecContract {
  /** What must be built, in one or two sentences. */
  goal: string
  /** Hard boundaries: stack, dependencies, things not to change. */
  constraints: string[]
  /** Concrete, verifiable statements that define "done". */
  acceptanceCriteria: string[]
  /** Files/modules the worker may change. */
  filesToTouch: string[]
  /** Files/modules the worker must NOT change (write "none" explicitly if empty). */
  filesToNotTouch: string[]
}

/** The `### <label>` heading a rendered contract writes for a section. */
export function sectionHeading(key: SpecContractKey): string {
  const section = SPEC_CONTRACT_SECTIONS.find((s) => s.key === key)
  return `### ${section?.label ?? key}`
}

function bullets(items: string[]): string[] {
  const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0)
  return cleaned.length ? cleaned.map((item) => `- ${item}`) : ["- (none)"]
}

/**
 * Render the five-part contract. Every section is always present (empty lists
 * render as `- (none)`) so the receiving agent never silently lacks a part.
 */
export function renderSpecContract(contract: SpecContract): string {
  return [
    "## Spec contract",
    "",
    "### Goal",
    contract.goal.trim() || "(none)",
    "",
    "### Constraints",
    ...bullets(contract.constraints),
    "",
    "### Acceptance criteria",
    ...bullets(contract.acceptanceCriteria),
    "",
    "### Files to touch",
    ...bullets(contract.filesToTouch),
    "",
    "### Files to NOT touch",
    ...bullets(contract.filesToNotTouch),
  ].join("\n")
}

/**
 * Validate a contract before delegating. Returns one problem string per missing
 * or empty part (empty array = complete). All five parts are required — an empty
 * part must be stated explicitly as "(none)", never omitted.
 */
export function validateSpecContract(contract: SpecContract): string[] {
  const problems: string[] = []
  if (!contract.goal.trim()) problems.push("goal is empty")
  if (contract.constraints.length === 0) problems.push("constraints is empty (state 'none' explicitly)")
  if (contract.acceptanceCriteria.length === 0) problems.push("acceptance criteria is empty")
  if (contract.filesToTouch.length === 0) problems.push("files to touch is empty")
  if (contract.filesToNotTouch.length === 0) problems.push("files to NOT touch is empty (state 'none' explicitly)")
  return problems
}

/**
 * Which contract sections a delegation prompt is missing, matched by the
 * rendered `### <label>` headings. Empty array = the prompt carries all five.
 */
export function missingSpecContractSections(text: string): SpecContractKey[] {
  return SPEC_CONTRACT_SECTIONS.filter((section) => !text.includes(sectionHeading(section.key))).map(
    (section) => section.key,
  )
}

/** True when a delegation prompt already carries all five contract sections. */
export function hasSpecContract(text: string): boolean {
  return missingSpecContractSections(text).length === 0
}
