import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { NoCowboyGatewayApi } from "../groups/nocowboy-gateway"

export const nocowboyGatewayHandlers = HttpApiBuilder.group(NoCowboyGatewayApi, "nocowboy-gateway", (handlers) =>
  Effect.gen(function* () {
    const authStatus = Effect.fn("KilocodeGateway.authStatus")(function* () {
      return { authenticated: true, type: "api" }
    })

    const cloudSessions = Effect.fn("KilocodeGateway.cloudSessions")(function* () {
      return { cliSessions: [], nextCursor: null }
    })

    const cloudSession = Effect.fn("KilocodeGateway.cloudSession")(function* () {
      return yield* new HttpApiError.BadRequest({})
    })

    const cloudSessionImport = Effect.fn("KilocodeGateway.cloudSessionImport")(function* () {
      return "ok"
    })

    const clawStatus = Effect.fn("KilocodeGateway.clawStatus")(function* () {
      return { status: null, openclawVersion: null, lastStartedAt: null, lastStoppedAt: null, botName: null }
    })

    const edit = Effect.fn("KilocodeGateway.edit")(function* () {
      const authRaw = (globalThis as Record<string, unknown>).__KILO_AUTH_CONTENT
      const auth = typeof authRaw === "object" && authRaw !== null ? authRaw : {}
      if (Object.keys(auth).length === 0) {
        return yield* new HttpApiError.BadRequest({})
      }
      const response = yield* Effect.promise<Response>(() =>
        (globalThis as any)
          .fetch?.("https://api.kilo.ai/edit/completions", {
            method: "POST",
            headers: { "content-type": "application/json" },
          })
          .catch(() => new Response(null, { status: 504 })),
      )
      return { status: response.status }
    })

    const organization = Effect.fn("KilocodeGateway.organization")(function* () {
      return { organizationId: null }
    })

    const profile = Effect.fn("KilocodeGateway.profile")(function* () {
      return {}
    })

    const audioTranscriptions = Effect.fn("KilocodeGateway.audioTranscriptions")(function* () {
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
