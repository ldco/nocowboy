import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { EffectBridge } from "@/effect/bridge"
import { Sessions } from "@/nocowboy-sessions/sessions"
import { InstanceHttpApi } from "@/server/routes/instance/httpapi/api"

export const remoteHandlers = HttpApiBuilder.group(InstanceHttpApi, "remote", (handlers) =>
  Effect.gen(function* () {
    const enable = Effect.fn("RemoteHttpApi.enable")(function* () {
      yield* EffectBridge.fromPromise(() => Sessions.enableRemote()).pipe(
        Effect.catchCause(() => Effect.fail(new HttpApiError.Unauthorized())),
      )
      return Sessions.remoteStatus()
    })

    const disable = Effect.fn("RemoteHttpApi.disable")(function* () {
      yield* Effect.sync(() => Sessions.disableRemote())
      return Sessions.remoteStatus()
    })

    const status = Effect.fn("RemoteHttpApi.status")(function* () {
      return yield* Effect.sync(() => Sessions.remoteStatus())
    })

    return handlers.handle("enable", enable).handle("disable", disable).handle("status", status)
  }),
)
