/**
 * Structured agent handoff.
 *
 * The auto-router used to carry an agent switch as free text: an assistant wrote
 * `#route: <agent> <description>` and the session loop scraped it. That is
 * brittle — the agent, the reason and the carried context are all prose. This
 * module gives the handoff a typed shape (`Handoff`) and keeps the textual
 * `#route:` directive as a **compatibility adapter** so nothing that emits the
 * old form breaks.
 *
 * The module is pure: parse/render/resolve are deterministic and unit-testable
 * without the engine.
 */

import { hasRouteDirective, parseRoute, type RouteDirective } from "@/session/router"

/**
 * An internal agent-to-agent handoff.
 */
export interface Handoff {
  /** The agent to hand the turn to. */
  target: string
  /** Why the turn is being handed off. */
  reason: string
  /** The context/prompt the target agent starts with. */
  context: string
  /** Files or references the target should look at. */
  artifacts: string[]
}

/** The structured directive prefix, e.g. `#handoff: {"target":"worker"}`. */
export const HANDOFF_DIRECTIVE = "#handoff:"

/**
 * Parse a structured `#handoff:` directive (`#handoff: {json}`) from assistant
 * text. Returns null when the directive is absent or malformed.
 */
export function parseHandoff(text: string): Handoff | null {
  const line = text.split("\n").find((candidate) => candidate.trimStart().startsWith(HANDOFF_DIRECTIVE))
  if (!line) return null
  const payload = line.trimStart().slice(HANDOFF_DIRECTIVE.length).trim()
  if (!payload) return null

  let raw: unknown
  try {
    raw = JSON.parse(payload)
  } catch {
    return null
  }
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>
  if (typeof record.target !== "string" || record.target.trim().length === 0) return null

  return {
    target: record.target.trim(),
    reason: typeof record.reason === "string" ? record.reason : "",
    context: typeof record.context === "string" ? record.context : "",
    artifacts: Array.isArray(record.artifacts)
      ? record.artifacts.filter((item): item is string => typeof item === "string")
      : [],
  }
}

/** Render a Handoff as the structured directive (deterministic key order). */
export function renderHandoff(handoff: Handoff): string {
  return `${HANDOFF_DIRECTIVE} ${JSON.stringify({
    target: handoff.target,
    reason: handoff.reason,
    context: handoff.context,
    artifacts: handoff.artifacts,
  })}`
}

/**
 * Compatibility adapter: an existing `#route:` directive becomes a Handoff, so
 * the legacy textual form keeps working unchanged.
 */
export function handoffFromRoute(route: RouteDirective): Handoff {
  return {
    target: route.agent,
    reason: route.description || `routed to ${route.agent}`,
    context: route.prompt,
    artifacts: [],
  }
}

/**
 * Resolve the handoff from assistant text. The structured `#handoff:` directive
 * wins; otherwise the legacy `#route:` directive is adapted.
 */
export function resolveHandoff(text: string): Handoff | null {
  const structured = parseHandoff(text)
  if (structured) return structured
  const route = parseRoute(text)
  return route ? handoffFromRoute(route) : null
}

/** True when the text carries either a structured handoff or a legacy route. */
export function hasHandoff(text: string): boolean {
  return parseHandoff(text) !== null || hasRouteDirective(text)
}
