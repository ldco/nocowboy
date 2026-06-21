import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { KiloGatewayApi } from "../groups/kilo-gateway"

export const kiloGatewayHandlers = HttpApiBuilder.group(KiloGatewayApi, "nocowboy-gateway", (handlers) =>
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

    return handlers
      .handle("authStatus", authStatus)
      .handle("cloudSessions", cloudSessions)
      .handle("cloudSession", cloudSession)
      .handle("cloudSessionImport", cloudSessionImport)
      .handle("clawStatus", clawStatus)
  }),
)
