
/**
 * Each agent declares what it excels at.
 * The router uses this to match tasks to agents.
 */
export interface AgentCapability {
  domains: string[]
  description: string
}

export const AGENT_CAPABILITIES: Record<string, AgentCapability> = {
  worker: {
    domains: ["implementation", "refactoring", "testing", "debugging"],
    description: "Primary engineer — implements, refactors, tests, debugs production code",
  },
  planner: {
    domains: ["planning", "specification", "acceptance-criteria"],
    description: "Designs plans and specs before code is written. Read-only.",
  },
  reviewer: {
    domains: ["review", "verification", "quality"],
    description: "Verifies work against acceptance criteria. Read-only, different model.",
  },
  nocowboy: {
    domains: ["conversation", "ideas", "questions"],
    description: "Companion — chat, brainstorming, questions, conversations",
  },
}

/** Format capabilities as a prompt block for system prompt injection */
export function formatCapabilities(): string {
  const lines: string[] = ["## Available Agents", ""]
  for (const [name, cap] of Object.entries(AGENT_CAPABILITIES)) {
    lines.push(`- **${name}**: ${cap.description}`)
    lines.push(`  Domains: ${cap.domains.join(", ")}`)
  }
  return lines.join("\n")
}
