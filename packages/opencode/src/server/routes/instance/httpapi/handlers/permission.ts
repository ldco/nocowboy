import { AllowEverythingPermission } from "@/nocowboy/permission/allow-everything" // nocowboy_change
import { Permission } from "@/permission"
import { PermissionID } from "@/permission/schema"
// nocowboy_change start
import { SessionID } from "@/session/schema"
import { Effect, Schema } from "effect"
// nocowboy_change end
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
// nocowboy_change start
import { notFound } from "../errors"
import { AllowEverythingBody, SaveAlwaysRulesBody } from "../groups/permission"
// nocowboy_change end

export const permissionHandlers = HttpApiBuilder.group(InstanceHttpApi, "permission", (handlers) =>
  Effect.gen(function* () {
    const svc = yield* Permission.Service

    const list = Effect.fn("PermissionHttpApi.list")(function* () {
      return yield* svc.list()
    })

    const reply = Effect.fn("PermissionHttpApi.reply")(function* (ctx: {
      params: { requestID: PermissionID }
      payload: Permission.ReplyBody
    }) {
      const ok = yield* svc.reply({
        // nocowboy_change
        requestID: ctx.params.requestID,
        reply: ctx.payload.reply,
        message: ctx.payload.message,
      })
      if (!ok) return yield* notFound(`Permission request not found: ${ctx.params.requestID}`) // nocowboy_change
      return true
    })

    // nocowboy_change start
    const saveAlwaysRules = Effect.fn("PermissionHttpApi.saveAlwaysRules")(function* (ctx: {
      params: { requestID: PermissionID }
      payload: Schema.Schema.Type<typeof SaveAlwaysRulesBody>
    }) {
      const ok = yield* svc.saveAlwaysRules({
        requestID: ctx.params.requestID,
        approvedAlways: ctx.payload.approvedAlways ? [...ctx.payload.approvedAlways] : undefined,
        deniedAlways: ctx.payload.deniedAlways ? [...ctx.payload.deniedAlways] : undefined,
      })
      if (!ok) return yield* notFound(`Permission request not found: ${ctx.params.requestID}`)
      return true
    })

    const allowEverything = Effect.fn("PermissionHttpApi.allowEverything")(function* (ctx: {
      payload: Schema.Schema.Type<typeof AllowEverythingBody>
    }) {
      return yield* AllowEverythingPermission.effect({
        enable: ctx.payload.enable,
        requestID: ctx.payload.requestID ? PermissionID.make(ctx.payload.requestID) : undefined,
        sessionID: ctx.payload.sessionID?.startsWith("ses") ? SessionID.make(ctx.payload.sessionID) : undefined,
      })
    })

    return handlers
      .handle("list", list)
      .handle("reply", reply)
      .handle("saveAlwaysRules", saveAlwaysRules)
      .handle("allowEverything", allowEverything)
    // nocowboy_change end
  }),
)
