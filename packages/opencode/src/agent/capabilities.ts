
/**
 * Each agent declares what it excels at.
 * The router uses this to match tasks to agents.
 */
export interface AgentCapability {
  domains: string[]
  description: string
}

export const AGENT_CAPABILITIES: Record<string, AgentCapability> = {
  code: {
    domains: ["implementation", "refactoring", "testing", "debugging"],
    description: "Primary engineer — writes, refactors, tests, debugs production code",
  },
  debug: {
    domains: ["diagnosis", "root-cause-analysis", "stacktrace"],
    description: "Systematic bug diagnosis and root cause analysis",
  },
  overseer: {
    domains: ["review", "orchestration", "quality"],
    description: "Orchestrates agents + cross-model review. Read-only.",
  },
  nocowboy: {
    domains: ["automation", "browser", "shell", "filesystem"],
    description: "Browser, filesystem, shell — full system automation",
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
