/**
 * Inter-Agent Mailbox for Agent Teams.
 *
 * Each agent has a JSON inbox at ~/.nocowboy/teams/{team-id}/inboxes/{agent-id}.json.
 * Agents send messages to each other and read their own inbox. Messages are
 * validated on read; malformed entries are removed so one bad write cannot
 * poison an inbox (Claude Code parity).
 */
import * as path from "path"
import fs from "fs/promises"
import os from "os"

export type TeamMessageType = "text" | "task-update" | "idle" | "request"

export type TeamMessage = {
  id: string
  from: string
  to: string
  type: TeamMessageType
  content: string
  timestamp: number
}

const teamsRoot = () => path.join(os.homedir(), ".nocowboy", "teams")

export namespace AgentMailbox {
  export function inboxPath(teamID: string, agentID: string): string {
    return path.join(teamsRoot(), teamID, "inboxes", `${agentID}.json`)
  }

  export async function ensureInbox(teamID: string, agentID: string): Promise<string> {
    const file = inboxPath(teamID, agentID)
    await fs.mkdir(path.dirname(file), { recursive: true })
    return file
  }

  function isValidMessage(value: unknown): value is TeamMessage {
    if (typeof value !== "object" || value === null) return false
    const msg = value as Record<string, unknown>
    return (
      typeof msg.id === "string" &&
      typeof msg.from === "string" &&
      typeof msg.to === "string" &&
      typeof msg.content === "string" &&
      typeof msg.timestamp === "number" &&
      (msg.type === "text" || msg.type === "task-update" || msg.type === "idle" || msg.type === "request")
    )
  }

  export async function send(input: {
    teamID: string
    from: string
    to: string
    type?: TeamMessageType
    content: string
  }): Promise<TeamMessage> {
    const file = await ensureInbox(input.teamID, input.to)
    const message: TeamMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: input.from,
      to: input.to,
      type: input.type ?? "text",
      content: input.content,
      timestamp: Date.now(),
    }
    const raw = await fs.readFile(file, "utf8").catch(() => "[]")
    let messages: unknown[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) messages = parsed
    } catch {
      // reset corrupt inbox
    }
    messages.push(message)
    await fs.writeFile(file, JSON.stringify(messages, null, 2), "utf8")
    return message
  }

  /** Read and clear the inbox. Malformed entries are dropped. */
  export async function read(teamID: string, agentID: string): Promise<TeamMessage[]> {
    const file = await ensureInbox(teamID, agentID)
    const raw = await fs.readFile(file, "utf8").catch(() => "[]")
    let parsed: unknown[] = []
    try {
      const value = JSON.parse(raw)
      if (Array.isArray(value)) parsed = value
    } catch {
      await fs.writeFile(file, "[]", "utf8")
      return []
    }
    const valid = parsed.filter(isValidMessage)
    if (valid.length !== parsed.length) {
      await fs.writeFile(file, "[]", "utf8")
      return valid
    }
    // Clear the inbox after read (drain semantics)
    await fs.writeFile(file, "[]", "utf8")
    return valid
  }

  export async function peek(teamID: string, agentID: string): Promise<TeamMessage[]> {
    const file = await ensureInbox(teamID, agentID)
    const raw = await fs.readFile(file, "utf8").catch(() => "[]")
    try {
      const value = JSON.parse(raw)
      if (!Array.isArray(value)) return []
      return value.filter(isValidMessage)
    } catch {
      return []
    }
  }

  export async function clear(teamID: string, agentID: string): Promise<void> {
    const file = await ensureInbox(teamID, agentID)
    await fs.writeFile(file, "[]", "utf8")
  }
}
