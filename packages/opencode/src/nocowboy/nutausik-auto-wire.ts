// nocowboy_change — NUTAUSIK session auto-wiring
//
// Replaces the manual nutausik-hooks.sh with native code wired into
// the NoCowboy session lifecycle:
//   - SessionStart → auto-create NUTAUSIK session + task (onSessionCreated)
//   - PostToolUse  → log tool calls to the task (via hooks MCP registration)
//   - SessionEnd   → close NUTAUSIK session + save handoff + compact memory
//
// All MCP communication is delegated to nutausik-client.ts.

import { autoCreateTask, autoEndSession } from "./nutausik-client"

/**
 * Called when a NoCowboy session is created.
 * Auto-creates a NUTAUSIK task and starts a NUTAUSIK session.
 * Replaces the manual nutausik-hooks.sh SessionStart handler.
 */
export function onSessionCreated(sessionID: string, title: string, directory: string): void {
  autoCreateTask(sessionID, title, directory)
}

/**
 * Called when a NoCowboy session is removed/ended.
 * Auto-ends the NUTAUSIK session, saves handoff, compacts memory.
 * Replaces the manual nutausik-hooks.sh SessionEnd handler.
 */
export function onSessionEnded(sessionID: string, directory: string): void {
  autoEndSession(sessionID, directory)
}
