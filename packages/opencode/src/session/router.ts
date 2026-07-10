// nocowboy_change — automatic agent router

/**
 * Auto-router: intercepts #route: directives in assistant output
 * and delegates to the appropriate agent via the task system.
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
