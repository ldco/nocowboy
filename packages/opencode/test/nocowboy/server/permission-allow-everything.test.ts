// kilocode_change - new file
import { describe, expect, test } from "bun:test"
import { Cause, Effect, Exit, Fiber, Layer } from "effect"
import { CrossSpawnSpawner } from "@nocowboy/core/cross-spawn-spawner"
import { Bus } from "../../../src/bus"
import * as Config from "../../../src/config/config"
import { AllowEverythingPermission } from "../../../src/nocowboy/permission/allow-everything"
import { isAllowEverythingConfig } from "../../../src/nocowboy/permission/allow-everything-config"
import { Permission } from "../../../src/permission"
import { PermissionID } from "../../../src/permission/schema"
import { provideTestInstance } from "../../fixture/fixture"
import { Server } from "../../../src/server/server"
import { Session } from "../../../src/session/session"
import { provideTmpdirInstance, tmpdir } from "../../fixture/fixture"
import { testEffect } from "../../lib/effect"

const bus = Bus.layer
const env = Layer.mergeAll(
  Permission.layer.pipe(Layer.provide(bus), Layer.provide(Config.defaultLayer)),
  Config.defaultLayer,
  Session.defaultLayer,
  bus,
  CrossSpawnSpawner.defaultLayer,
)
const it = testEffect(env)

const ask = (input: Permission.AskInput) =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.ask(input)
  })

const reply = (input: Permission.ReplyInput) =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.reply(input)
  })

const wait = () =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    for (let i = 0; i < 100; i++) {
      if ((yield* permission.list()).length > 0) return
      yield* Effect.sleep("10 millis")
    }
    return yield* Effect.fail(new Error("timed out waiting for pending permission request"))
  })

describe("AllowEverythingPermission", () => {
  test("handles disable requests through the HTTP endpoint", async () => {
    await using tmp = await tmpdir({ git: true })
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const enable = await Server.Default().app.request("/permission/allow-everything", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-nocowboy-directory": tmp.path },
          body: JSON.stringify({ enable: true }),
        })
        expect(enable.status).toBe(200)

        const disable = await Server.Default().app.request("/permission/allow-everything", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-nocowboy-directory": tmp.path },
          body: JSON.stringify({ enable: false }),
        })
        expect(disable.status).toBe(200)
        expect(await disable.json()).toBe(true)
      },
    })
  })

  it.live("disables global allow-all and restores permission prompts", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          expect(yield* AllowEverythingPermission.effect({ enable: true })).toBe(true)
          expect(yield* AllowEverythingPermission.effect({ enable: false })).toBe(true)

          const session = yield* sessions.create({})
          const pending = yield* ask({
            id: PermissionID.make("permission_global_disable"),
            sessionID: session.id,
            permission: "bash",
            patterns: ["ls"],
            metadata: {},
            always: [],
            ruleset: [],
          }).pipe(Effect.forkScoped)

          yield* wait()
          yield* reply({
            requestID: PermissionID.make("permission_global_disable"),
            reply: "reject",
          })

          const exit = yield* Fiber.await(pending)
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.RejectedError)
          }
        }),
      { git: true },
    ),
  )

  it.live("disables session-scoped allow-all without affecting other sessions", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const session = yield* sessions.create({
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })

          expect(yield* AllowEverythingPermission.effect({ enable: true, sessionID: session.id })).toBe(true)
          expect(yield* AllowEverythingPermission.effect({ enable: false, sessionID: session.id })).toBe(true)

          const next = yield* sessions.get(session.id)
          expect(next.permission ?? []).toEqual([])

          const pending = yield* ask({
            id: PermissionID.make("permission_session_disable"),
            sessionID: session.id,
            permission: "bash",
            patterns: ["ls"],
            metadata: {},
            always: [],
            ruleset: [],
          }).pipe(Effect.forkScoped)

          yield* wait()
          yield* reply({
            requestID: PermissionID.make("permission_session_disable"),
            reply: "reject",
          })

          const exit = yield* Fiber.await(pending)
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.RejectedError)
          }

          const other = yield* sessions.create({})
          const blocked = yield* ask({
            id: PermissionID.make("permission_other_session"),
            sessionID: other.id,
            permission: "bash",
            patterns: ["pwd"],
            metadata: {},
            always: [],
            ruleset: [],
          }).pipe(Effect.forkScoped)

          yield* wait()
          yield* reply({
            requestID: PermissionID.make("permission_other_session"),
            reply: "reject",
          })

          const blockedExit = yield* Fiber.await(blocked)
          expect(Exit.isFailure(blockedExit)).toBe(true)
          if (Exit.isFailure(blockedExit)) {
            expect(Cause.squash(blockedExit.cause)).toBeInstanceOf(Permission.RejectedError)
          }
        }),
      { git: true },
    ),
  )

  it.live("global enable suppresses prompts even when the agent ruleset asks", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const permission = yield* Permission.Service
          expect(yield* AllowEverythingPermission.effect({ enable: true })).toBe(true)
          const session = yield* sessions.create({})
          // With YOLO on the ask resolves immediately; without it the effect
          // parks on the pending deferred and the timeout turns it into a failure.
          const exit = yield* permission
            .ask({
              id: PermissionID.make("permission_yolo_ruleset"),
              sessionID: session.id,
              permission: "bash",
              patterns: ["rm -rf /tmp/nope"],
              metadata: {},
              always: [],
              ruleset: [{ permission: "bash", pattern: "*", action: "ask" }],
            })
            .pipe(Effect.timeout("2 seconds"), Effect.exit)
          expect(Exit.isSuccess(exit)).toBe(true)
          expect(yield* AllowEverythingPermission.effect({ enable: false })).toBe(true)
        }),
      { git: true },
    ),
  )

  it.live("YOLO lifts an agent/read-only deny rule (the architect ceiling)", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const permission = yield* Permission.Service
          expect(yield* AllowEverythingPermission.effect({ enable: true })).toBe(true)

          const session = yield* sessions.create({})
          // Mirrors the read-only architect ceiling (readOnlyBash): the agent
          // ruleset denies `git add`/`nocowboy *`, and the hard ruleset makes it
          // a ceiling. In YOLO the user explicitly allowed everything, so both
          // must be lifted instead of dead-ending the run.
          const exit = yield* permission
            .ask({
              id: PermissionID.make("permission_yolo_lifts_deny"),
              sessionID: session.id,
              permission: "bash",
              patterns: ["git add -A"],
              metadata: {},
              always: [],
              ruleset: [{ permission: "bash", pattern: "*", action: "deny" }],
              hardRuleset: [
                { permission: "bash", pattern: "*", action: "deny" },
                { permission: "bash", pattern: "git *", action: "deny" },
              ],
            })
            .pipe(Effect.timeout("2 seconds"), Effect.exit)
          expect(Exit.isSuccess(exit)).toBe(true)
          expect(yield* AllowEverythingPermission.effect({ enable: false })).toBe(true)
        }),
      { git: true },
    ),
  )

  it.live("YOLO does not lift config-path protection", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          expect(yield* AllowEverythingPermission.effect({ enable: true })).toBe(true)

          const session = yield* sessions.create({})
          // Editing the tool's own config is protected: even in YOLO it asks,
          // and a reject is still honoured.
          const pending = yield* ask({
            id: PermissionID.make("permission_yolo_config_protected"),
            sessionID: session.id,
            permission: "edit",
            patterns: ["nocowboy.json"],
            metadata: { filepath: "nocowboy.json" },
            always: [],
            ruleset: [{ permission: "edit", pattern: "*", action: "allow" }],
          }).pipe(Effect.forkScoped)

          yield* wait()
          yield* reply({
            requestID: PermissionID.make("permission_yolo_config_protected"),
            reply: "reject",
          })

          const exit = yield* Fiber.await(pending)
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.RejectedError)
          }
          expect(yield* AllowEverythingPermission.effect({ enable: false })).toBe(true)
        }),
      { git: true },
    ),
  )

  it.live("YOLO still honours an external-directory hard veto", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const permission = yield* Permission.Service
          expect(yield* AllowEverythingPermission.effect({ enable: true })).toBe(true)

          const session = yield* sessions.create({})
          const exit = yield* permission
            .ask({
              id: PermissionID.make("permission_yolo_external_veto"),
              sessionID: session.id,
              permission: "external_directory",
              patterns: ["/some/other/dir/*"],
              metadata: {},
              always: [],
              ruleset: [{ permission: "external_directory", pattern: "*", action: "ask" }],
              hardRuleset: [{ permission: "external_directory", pattern: "*", action: "deny" }],
            })
            .pipe(Effect.exit)

          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.DeniedError)
          }
          expect(yield* AllowEverythingPermission.effect({ enable: false })).toBe(true)
        }),
      { git: true },
    ),
  )
})

describe("isAllowEverythingConfig", () => {
  test("recognises the object form", () => {
    expect(isAllowEverythingConfig({ "*": { "*": "allow" } })).toBe(true)
  })
  test("recognises the scalar shorthand", () => {
    expect(isAllowEverythingConfig({ "*": "allow" })).toBe(true)
  })
  test("rejects the disabled null form", () => {
    expect(isAllowEverythingConfig({ "*": { "*": null } })).toBe(false)
  })
  test("rejects partial grants and non-objects", () => {
    expect(isAllowEverythingConfig({ bash: "allow" })).toBe(false)
    expect(isAllowEverythingConfig({ "*": { bash: "allow" } })).toBe(false)
    expect(isAllowEverythingConfig(undefined)).toBe(false)
    expect(isAllowEverythingConfig(null)).toBe(false)
  })
})
