/**
 * The one project/session seam for every NUTAUSIK call, whichever transport
 * reaches it.
 *
 * NUTAUSIK runs as a single MCP server shared by every NoCowboy instance, so a
 * call must name the project it belongs to — otherwise a session on project A
 * reads or writes project B's database. That rule used to live in two places:
 * `withProjectDir` (the MCP SDK transport) and an inline spread in the
 * MemoryAdapter's `call` (the direct JSON-RPC path). Two copies drift. Both now
 * build their params through {@link withMemoryScope}.
 */

export const PROJECT_SCOPED_SERVERS = new Set(["nutausik"])

/** True when a server keeps per-project state and must be told the project. */
export function isProjectScopedServer(serverName: string): boolean {
  return PROJECT_SCOPED_SERVERS.has(serverName)
}

export interface MemoryScope {
  /** The project a call belongs to. */
  project?: string
  /** The session, when the operation is session-scoped. */
  session?: string
}

export interface WithMemoryScopeOptions {
  /**
   * When true the scope WINS over an explicit argument — the MemoryAdapter's
   * contract: the namespace is authoritative, so a stray `projectDir` in args
   * can never cross two projects. When false (default) a caller-supplied
   * `projectDir`/`sessionID` wins — the MCP transport's contract.
   */
  override?: boolean
}

/** Attach the project (and session, when set) to a call's arguments. */
export function withMemoryScope(
  args: Record<string, unknown> | undefined,
  scope: MemoryScope,
  options: WithMemoryScopeOptions = {},
): Record<string, unknown> {
  const params = { ...(args ?? {}) }
  if (scope.project && (options.override || params.projectDir === undefined)) params.projectDir = scope.project
  if (scope.session && (options.override || params.sessionID === undefined)) params.sessionID = scope.session
  return params
}
