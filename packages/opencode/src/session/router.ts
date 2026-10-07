
/**
 * Auto-router: intercepts handoff directives in assistant output and delegates
 * to the appropriate agent.
 *
 * The internal representation is now a typed `Handoff
 * { target, reason, context, artifacts }`. The legacy textual `#route:`
 * directive is kept as a compatibility adapter (`parseRoute` + `routeToHandoff`)
 * and `parseHandoffAny` prefers a structured `handoff` block when present.
 */

export interface RouteDirective {
  agent: string
  description: string
  prompt: string
}

/**
 * Parse a #route: directive from assistant text.
 *
 * Format:
 *   #route: <agent> <short description>
 *   <detailed prompt body>
 *
 * Returns null if no route directive is found.
 */
export function parseRoute(text: string): RouteDirective | null {
  const lines = text.split("\n")
  const routeIdx = lines.findIndex(
    (line) => line.trimStart().startsWith("#route:"),
  )
  if (routeIdx === -1) return null

  const header = lines[routeIdx].trimStart()
  const rest = header.slice("#route:".length).trim()
  const spaceIdx = rest.indexOf(" ")
  if (spaceIdx === -1) {
    // Single line: "#route: agent" (use description as prompt)
    const agent = rest.trim()
    if (!agent) return null
    return { agent, description: "", prompt: `Route to ${agent}.` }
  }

  const agent = rest.slice(0, spaceIdx)
  const description = rest.slice(spaceIdx + 1)
  const prompt = lines.slice(routeIdx + 1).join("\n").trim()

  // If no body lines, use the description itself as the prompt
  if (!prompt) {
    return { agent, description: description || "", prompt: description || `Route to ${agent}.` }
  }

  return { agent, description, prompt }
}

/**
 * Check if a route directive is present. This is a lightweight check
 * before doing the full parse — the LLM may include #route: anywhere.
 */
export function hasRouteDirective(text: string): boolean {
  return /^#route:\s+\S+/m.test(text)
}

/**
 * Remove the route directive from the text so the user only sees
 * the clean response after routing completes.
 */
export function stripRouteDirective(text: string): string {
  return text.replace(/^#route:\s+\S+.*(\n|$)/m, "").trim()
}

// ---------------------------------------------------------------------------
// Structured handoff
// ---------------------------------------------------------------------------

/** The internal handoff: a typed replacement for the textual `#route:` directive. */
export interface Handoff {
  /** The agent to hand off to. */
  target: string
  /** Why the handoff is happening. */
  reason: string
  /** The context/prompt passed to the next agent. */
  context: string
  /** Files/artifacts the next agent should look at. */
  artifacts: string[]
}

const HANDOFF_BLOCK = /```handoff\s*\n([\s\S]*?)```/
const HANDOFF_INLINE = /#handoff:\s*(\{[\s\S]*?\})\s*$/m

/** Coerce an unknown value into a Handoff, or null when it is not one. */
export function normalizeHandoff(value: unknown): Handoff | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (typeof v.target !== "string" || v.target.trim().length === 0) return null
  const artifacts = Array.isArray(v.artifacts)
    ? v.artifacts.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : []
  return {
    target: v.target.trim(),
    reason: typeof v.reason === "string" ? v.reason : "",
    context: typeof v.context === "string" ? v.context : "",
    artifacts,
  }
}

/**
 * Parse a structured handoff from assistant text — a ```handoff fenced JSON
 * block or an inline `#handoff: { … }`. Returns null when absent or malformed;
 * it never throws.
 */
export function parseHandoff(text: string): Handoff | null {
  const block = HANDOFF_BLOCK.exec(text)
  const inline = block ? undefined : HANDOFF_INLINE.exec(text)
  const json = block?.[1] ?? inline?.[1]
  if (!json) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  return normalizeHandoff(parsed)
}

/** Compatibility adapter: map a legacy `#route:` directive to a Handoff. */
export function routeToHandoff(route: RouteDirective): Handoff {
  return { target: route.agent, reason: route.description, context: route.prompt, artifacts: [] }
}

/**
 * The one entry point the session loop uses: a structured handoff if present,
 * else the legacy `#route:` directive adapted to a Handoff, else null.
 */
export function parseHandoffAny(text: string): Handoff | null {
  const structured = parseHandoff(text)
  if (structured) return structured
  const route = parseRoute(text)
  return route ? routeToHandoff(route) : null
}

/** Render a handoff as the canonical structured block (inverse of parseHandoff). */
export function renderHandoff(handoff: Handoff): string {
  return ["```handoff", JSON.stringify(handoff, null, 2), "```"].join("\n")
}
