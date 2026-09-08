// kilocode_change - new file
import { expect } from "bun:test"
import { Effect } from "effect"
import { testEffect } from "../lib/effect"
import { Agent } from "../../src/agent/agent"
import { Permission } from "../../src/permission"
import { Global } from "@nocowboy/core/global"

const it = testEffect(Agent.defaultLayer)

it.instance("worker agent allows global config directory reads by default", () =>
  Effect.gen(function* () {
    const agent = yield* Agent.Service
    const worker = yield* agent.get("worker")
    expect(worker).toBeDefined()
    expect(Permission.evaluate("external_directory", `${Global.Path.config}/*`, worker!.permission).action).toBe("allow")
  }),
)
