// kilocode_change - new file
import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Auth } from "../../src/auth"
import { Bus } from "../../src/bus"
import type { Config } from "../../src/config/config"
import { clearInFlightCache } from "../../src/nocowboy-sessions/inflight-cache"
import { Sessions } from "../../src/nocowboy-sessions/sessions"
import { ProjectID } from "../../src/project/schema"
import { Session } from "../../src/session/session"
import { SessionID } from "../../src/session/schema"
import { TestConfig } from "../fixture/config"
import { testEffect } from "../lib/effect"

const it = testEffect(CrossSpawnSpawner.defaultLayer)

function layer(overrides: Partial<Config.Interface> = {}) {
  return Layer.merge(
    Sessions.layer.pipe(
      Layer.provideMerge(Bus.layer),
      Layer.provide(TestConfig.layer(overrides)),
      Layer.provide(Session.defaultLayer),
    ),
    Auth.defaultLayer,
  )
}

function reset(...tokens: string[]) {
  clearInFlightCache("nocowboy-sessions:token")
  clearInFlightCache("nocowboy-sessions:client")
  for (const token of tokens) clearInFlightCache(`nocowboy-sessions:token-valid:${token}`)
}

it.instance("initializes once per instance through Config.Service", () => {
  let reads = 0

  return Effect.gen(function* () {
    const sessions = yield* Sessions.Service
    yield* sessions.init()
    yield* sessions.init()
    expect(reads).toBe(1)
  }).pipe(
    Effect.provide(
      layer({
        getGlobal: () =>
          Effect.sync(() => {
            reads += 1
            return {}
          }),
      }),
    ),
  )
})

test("bootstraps session ingest from NOCOWBOY_API_KEY without stored auth", async () => {
  const originalKey = process.env.NOCOWBOY_API_KEY
  const fetchOriginal = globalThis.fetch
  const calls: string[] = []

  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/api/user")) {
        calls.push(new Headers(init?.headers).get("Authorization") ?? "")
        return new Response("{}", { status: 200 })
      }
      if (url.endsWith("/api/session")) {
        calls.push(new Headers(init?.headers).get("Authorization") ?? "")
        return Response.json({ id: "remote-env", ingestPath: "/api/ingest/env" })
      }
      return new Response("{}", { status: 200 })
    },
    { preconnect: fetchOriginal.preconnect },
  ) as typeof globalThis.fetch

  process.env.NOCOWBOY_API_KEY = "env-token"
  reset("env-token")

  try {
    await Sessions.bootstrap("session-env")
    expect(calls).toEqual(["Bearer env-token", "Bearer env-token"])
  } finally {
    if (originalKey === undefined) delete process.env.NOCOWBOY_API_KEY
    else process.env.NOCOWBOY_API_KEY = originalKey
    globalThis.fetch = fetchOriginal
    reset("env-token")
  }
})

test("prefers stored auth over NOCOWBOY_API_KEY for session ingest", async () => {
  const originalKey = process.env.NOCOWBOY_API_KEY
  const originalAuthContent = process.env.NOCOWBOY_AUTH_CONTENT
  const fetchOriginal = globalThis.fetch
  const calls: string[] = []

  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/api/user")) {
        calls.push(new Headers(init?.headers).get("Authorization") ?? "")
        return new Response("{}", { status: 200 })
      }
      if (url.endsWith("/api/session")) {
        calls.push(new Headers(init?.headers).get("Authorization") ?? "")
        return Response.json({ id: "remote-auth", ingestPath: "/api/ingest/auth" })
      }
      return new Response("{}", { status: 200 })
    },
    { preconnect: fetchOriginal.preconnect },
  ) as typeof globalThis.fetch

  process.env.NOCOWBOY_API_KEY = "env-token"
  process.env.NOCOWBOY_AUTH_CONTENT = JSON.stringify({ kilo: { type: "api", key: "stored-token" } })
  reset("env-token", "stored-token")

  try {
    await Sessions.bootstrap("session-auth")
    expect(calls).toEqual(["Bearer stored-token", "Bearer stored-token"])
  } finally {
    if (originalKey === undefined) delete process.env.NOCOWBOY_API_KEY
    else process.env.NOCOWBOY_API_KEY = originalKey
    if (originalAuthContent === undefined) delete process.env.NOCOWBOY_AUTH_CONTENT
    else process.env.NOCOWBOY_AUTH_CONTENT = originalAuthContent
    globalThis.fetch = fetchOriginal
    reset("env-token", "stored-token")
  }
})

it.instance("does not duplicate created-session subscribers when init is repeated", () => {
  const fetchOriginal = globalThis.fetch
  const calls: string[] = []

  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/user")) return new Response("{}", { status: 200 })
      if (url.endsWith("/api/session")) {
        calls.push(url)
        return Response.json({ id: "remote-1", ingestPath: "/api/ingest/session-1" })
      }
      return new Response("{}", { status: 200 })
    },
    { preconnect: fetchOriginal.preconnect },
  ) as typeof globalThis.fetch

  reset("test-token")
  const id = SessionID.descending("session-created")

  return Effect.gen(function* () {
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        const auth = yield* Auth.Service
        yield* auth.remove("kilo").pipe(Effect.orDie)
        globalThis.fetch = fetchOriginal
        reset("test-token")
      }),
    )

    const auth = yield* Auth.Service
    const bus = yield* Bus.Service
    const sessions = yield* Sessions.Service
    yield* auth.set("kilo", { type: "api", key: "test-token" })
    yield* sessions.init()
    yield* sessions.init()
    yield* Effect.sleep(100)
    yield* bus.publish(Session.Event.Created, {
      sessionID: id,
      info: {
        id,
        slug: "test",
        projectID: ProjectID.make("project-test"),
        directory: "/tmp/test",
        title: "test",
        version: "test",
        time: { created: Date.now(), updated: Date.now() },
      },
    })
    yield* Effect.sleep(500)
    expect(calls).toHaveLength(1)
  }).pipe(Effect.provide(layer()))
})
