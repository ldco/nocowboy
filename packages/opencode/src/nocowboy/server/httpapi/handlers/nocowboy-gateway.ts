import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { NoCowboyGatewayApi } from "../groups/nocowboy-gateway"

export const nocowboyGatewayHandlers = HttpApiBuilder.group(NoCowboyGatewayApi, "nocowboy-gateway", (handlers) =>
  Effect.gen(function* () {
    const authStatus = Effect.fn("NoCowboyGateway.authStatus")(function* () {
      return { authenticated: true, type: "api" }
    })

    const cloudSessions = Effect.fn("NoCowboyGateway.cloudSessions")(function* () {
      return { cliSessions: [], nextCursor: null }
    })

    const cloudSession = Effect.fn("NoCowboyGateway.cloudSession")(function* () {
      return yield* new HttpApiError.BadRequest({})
    })

    const cloudSessionImport = Effect.fn("NoCowboyGateway.cloudSessionImport")(function* () {
      return "ok"
    })

    const clawStatus = Effect.fn("NoCowboyGateway.clawStatus")(function* () {
      return { status: null, openclawVersion: null, lastStartedAt: null, lastStoppedAt: null, botName: null }
    })

    const edit = Effect.fn("NoCowboyGateway.edit")(function* () {
      const authRaw = (globalThis as Record<string, unknown>).__KILO_AUTH_CONTENT
      const auth = typeof authRaw === "object" && authRaw !== null ? authRaw : {}
      if (Object.keys(auth).length === 0) {
        return yield* new HttpApiError.BadRequest({})
      }
      // TODO: replace with own nocowboy.dev service
      const response = yield* Effect.promise<Response>(() =>
        (globalThis as any)
          .fetch?.("", {
            method: "POST",
            headers: { "content-type": "application/json" },
          })
          .catch(() => new Response(null, { status: 504 })),
      )
      return { status: response.status }
    })

    const organization = Effect.fn("NoCowboyGateway.organization")(function* () {
      return { organizationId: null }
    })

    const profile = Effect.fn("NoCowboyGateway.profile")(function* () {
      return {}
    })

    const audioTranscriptions = Effect.fn("NoCowboyGateway.audioTranscriptions")(function* () {
      return {}
    })

    return handlers
      .handle("authStatus", authStatus)
      .handle("cloudSessions", cloudSessions)
      .handle("cloudSession", cloudSession)
      .handle("cloudSessionImport", cloudSessionImport)
      .handle("clawStatus", clawStatus)
      .handle("edit", edit)
      .handle("organization", organization)
      .handle("profile", profile)
      .handle("audioTranscriptions", audioTranscriptions)
  }),
)
