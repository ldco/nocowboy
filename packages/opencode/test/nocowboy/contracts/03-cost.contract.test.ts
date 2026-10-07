/**
 * Migration contract — subagent cost accounting.
 *
 * Each child propagates its total into the parent assistant message; `childCost`
 * sums a session's assistant costs. Two parallel children must add up, and a
 * resumed child must not be counted twice (cost is read, not accumulated).
 */
import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { KiloCostPropagation } from "@/nocowboy/session/cost-propagation"
import type { Session } from "@/session/session"

function stub(costs: Record<string, number[]>): Session.Interface {
  return {
    messages: ({ sessionID }: { sessionID: string }) =>
      Effect.succeed((costs[sessionID] ?? []).map((cost) => ({ info: { role: "assistant", cost } }))),
  } as unknown as Session.Interface
}

const cost = (sessions: Session.Interface, id: string) =>
  Effect.runPromise(KiloCostPropagation.childCost(sessions, id as never))

describe("subagent cost accounting", () => {
  test("two parallel children add up on the parent", async () => {
    const sessions = stub({ parent: [10, 5], childA: [7], childB: [3] })
    expect(await cost(sessions, "parent")).toBe(15)
    expect(await cost(sessions, "childA")).toBe(7)
    expect(await cost(sessions, "childB")).toBe(3)
  })

  test("a resumed child is not double-counted", async () => {
    const sessions = stub({ child: [4] })
    const first = await cost(sessions, "child")
    const second = await cost(sessions, "child")
    expect(first).toBe(4)
    expect(second).toBe(4)
  })

  test("an empty session has zero cost", async () => {
    expect(await cost(stub({}), "none")).toBe(0)
  })
})
