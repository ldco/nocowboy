import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test"
import * as path from "path"
import * as os from "os"
import fs from "fs/promises"
import { TeamTaskList } from "@/nocowboy/agent-teams/task-list"
import { AgentMailbox } from "@/nocowboy/agent-teams/mailbox"
import { TeamLead } from "@/nocowboy/agent-teams/team-lead"

const TEAM = "test-team-p2"
const root = path.join(os.homedir(), ".nocowboy", "teams", TEAM)

async function cleanup() {
  await fs.rm(root, { recursive: true, force: true })
}

beforeAll(cleanup)
afterAll(cleanup)
beforeEach(cleanup)

describe("TeamTaskList", () => {
  it("creates and reads a task", async () => {
    await TeamTaskList.create({
      teamID: TEAM,
      id: "T1",
      title: "Fix auth",
      description: "Fix the auth module",
    })
    const task = await TeamTaskList.get(TEAM, "T1")
    expect(task?.title).toBe("Fix auth")
    expect(task?.status).toBe("pending")
  })

  it("lists tasks in creation order", async () => {
    await TeamTaskList.create({ teamID: TEAM, id: "T1", title: "one", description: "1" })
    await TeamTaskList.create({ teamID: TEAM, id: "T2", title: "two", description: "2" })
    const tasks = await TeamTaskList.list(TEAM)
    expect(tasks.map((t) => t.id)).toEqual(["T1", "T2"])
  })

  it("does not claim a task with unresolved dependencies", async () => {
    await TeamTaskList.create({ teamID: TEAM, id: "T1", title: "parent", description: "p" })
    await TeamTaskList.create({
      teamID: TEAM,
      id: "T2",
      title: "child",
      description: "c",
      dependsOn: ["T1"],
    })
    // claim should pick T1 (no deps), not T2
    const claimed = await TeamTaskList.claim({ teamID: TEAM, agentID: "worker" })
    expect(claimed?.id).toBe("T1")
    const remaining = await TeamTaskList.claim({ teamID: TEAM, agentID: "worker" })
    expect(remaining).toBeUndefined()
  })

  it("claims a dependency once the parent completes", async () => {
    await TeamTaskList.create({ teamID: TEAM, id: "T1", title: "parent", description: "p" })
    await TeamTaskList.create({
      teamID: TEAM,
      id: "T2",
      title: "child",
      description: "c",
      dependsOn: ["T1"],
    })
    const claimed = await TeamTaskList.claim({ teamID: TEAM, agentID: "worker" })
    await TeamTaskList.complete({ teamID: TEAM, taskID: claimed!.id, agentID: "worker" })
    const child = await TeamTaskList.claim({ teamID: TEAM, agentID: "worker" })
    expect(child?.id).toBe("T2")
  })

  it("assigns only one agent per claim", async () => {
    await TeamTaskList.create({ teamID: TEAM, id: "T1", title: "one", description: "1" })
    const a = await TeamTaskList.claim({ teamID: TEAM, agentID: "agent-a" })
    const b = await TeamTaskList.claim({ teamID: TEAM, agentID: "agent-b" })
    expect(a?.id).toBe("T1")
    expect(b).toBeUndefined()
  })
})

describe("AgentMailbox", () => {
  it("sends and drains messages", async () => {
    await AgentMailbox.send({ teamID: TEAM, from: "lead", to: "worker", content: "start T1" })
    await AgentMailbox.send({ teamID: TEAM, from: "lead", to: "worker", content: "start T2" })
    const msgs = await AgentMailbox.read(TEAM, "worker")
    expect(msgs.map((m) => m.content)).toEqual(["start T1", "start T2"])
    // drained after read
    expect(await AgentMailbox.read(TEAM, "worker")).toEqual([])
  })

  it("drops malformed entries on read", async () => {
    await AgentMailbox.send({ teamID: TEAM, from: "lead", to: "worker", content: "valid" })
    const file = AgentMailbox.inboxPath(TEAM, "worker")
    const raw = JSON.parse(await fs.readFile(file, "utf8"))
    raw.push({ junk: true })
    await fs.writeFile(file, JSON.stringify(raw), "utf8")
    const msgs = await AgentMailbox.read(TEAM, "worker")
    expect(msgs).toHaveLength(1)
    expect(msgs[0]?.content).toBe("valid")
  })

  it("peek does not drain", async () => {
    await AgentMailbox.send({ teamID: TEAM, from: "lead", to: "worker", content: "keep me" })
    const peeked = await AgentMailbox.peek(TEAM, "worker")
    expect(peeked).toHaveLength(1)
    const again = await AgentMailbox.peek(TEAM, "worker")
    expect(again).toHaveLength(1)
  })
})

describe("TeamLead", () => {
  it("creates a team and breaks down a goal", async () => {
    await TeamLead.createTeam({
      id: TEAM,
      name: "Test Team",
      members: [
        { id: "lead", role: "lead" },
        { id: "worker", role: "code" },
      ],
    })
    const tasks = await TeamLead.breakDown({
      teamID: TEAM,
      goal: "fix all tests",
      tasks: [
        { id: "T1", title: "fix auth", description: "a" },
        { id: "T2", title: "fix db", description: "b", dependsOn: ["T1"] },
      ],
    })
    expect(tasks).toHaveLength(2)
    const p = await TeamLead.progress(TEAM)
    expect(p.total).toBe(2)
    expect(p.pending).toBe(2)
  })

  it("workLoop completes all claimable tasks", async () => {
    await TeamLead.createTeam({ id: TEAM, name: "T", members: [{ id: "worker", role: "code" }] })
    await TeamLead.breakDown({
      teamID: TEAM,
      goal: "g",
      tasks: [
        { id: "T1", title: "one", description: "1" },
        { id: "T2", title: "two", description: "2" },
      ],
    })
    const done = await TeamLead.workLoop({
      teamID: TEAM,
      agentID: "worker",
      work: async (task) => ({ ok: true, result: `${task.id} done` }),
    })
    expect(done).toHaveLength(2)
    const p = await TeamLead.progress(TEAM)
    expect(p.completed).toBe(2)
    expect(p.incomplete).toHaveLength(0)
  })

  it("waitForCompletion returns when everything is terminal", async () => {
    await TeamLead.createTeam({ id: TEAM, name: "T", members: [{ id: "worker", role: "code" }] })
    await TeamLead.breakDown({
      teamID: TEAM,
      goal: "g",
      tasks: [{ id: "T1", title: "one", description: "1" }],
    })
    const waiting = TeamLead.waitForCompletion({ teamID: TEAM, timeoutMs: 3000 })
    await new Promise((resolve) => setTimeout(resolve, 50))
    await TeamLead.workLoop({ teamID: TEAM, agentID: "worker", work: async () => ({ ok: true }) })
    const p = await waiting
    expect(p.completed).toBe(1)
  })

  it("broadcast delivers to all members except sender", async () => {
    await TeamLead.createTeam({
      id: TEAM,
      name: "T",
      members: [
        { id: "lead", role: "lead" },
        { id: "w1", role: "code" },
        { id: "w2", role: "code" },
      ],
    })
    await TeamLead.broadcast({ teamID: TEAM, from: "lead", content: "hello" })
    expect(await AgentMailbox.read(TEAM, "w1")).toHaveLength(1)
    expect(await AgentMailbox.read(TEAM, "w2")).toHaveLength(1)
    expect(await AgentMailbox.peek(TEAM, "lead")).toHaveLength(0)
  })
})
