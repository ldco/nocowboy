import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "@/server/routes/instance/httpapi/middleware/authorization"
import { InstanceContextMiddleware } from "@/server/routes/instance/httpapi/middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
} from "@/server/routes/instance/httpapi/middleware/workspace-routing"
import { described } from "@/server/routes/instance/httpapi/groups/metadata"

const root = "/kilo"

export const KiloGatewayPaths = {
  authStatus: `${root}/auth-status`,
  cloudSessions: `${root}/cloud-sessions`,
  cloudSession: `${root}/cloud-session/:id`,
  cloudSessionImport: `${root}/cloud-sessions/import`,
  clawStatus: `${root}/claw/status`,
  clawChatCredentials: `${root}/claw/chat-credentials`,
  profile: `${root}/profile`,
  organization: `${root}/organization`,
  audioTranscriptions: `${root}/audio/transcriptions`,
  edit: `${root}/edit`,
} as const

export const TextPartDataSchema = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
})

const Part = Schema.Struct({
  id: Schema.String,
  sessionID: Schema.String,
  messageID: Schema.String,
  type: Schema.Literal("text"),
  text: Schema.optional(Schema.String),
})

const MessageInfo = Schema.Struct({
  id: Schema.String,
  sessionID: Schema.String,
  role: Schema.Union([Schema.Literal("user"), Schema.Literal("assistant")]),
  agent: Schema.String,
  time: Schema.Struct({
    created: Schema.Finite,
  }),
})

const Message = Schema.Struct({
  info: MessageInfo,
  parts: Schema.Array(Part),
})

const SessionInfo = Schema.Struct({
  id: Schema.String,
  title: Schema.optional(Schema.NullOr(Schema.String)),
  slug: Schema.String,
  time: Schema.Struct({
    created: Schema.Finite,
    updated: Schema.optional(Schema.Finite),
  }),
})

export const CloudSessionData = Schema.Struct({
  info: SessionInfo,
  messages: Schema.Array(Message),
})

const Health = Schema.Struct({
  authenticated: Schema.Boolean,
  type: Schema.String,
})

const HealthResponse = Schema.Struct({
  authenticated: Schema.Boolean,
  type: Schema.String,
})

const CloudSessionList = Schema.Struct({
  cliSessions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.optional(Schema.NullOr(Schema.String)),
      slug: Schema.String,
      timeCreated: Schema.String,
      timeUpdated: Schema.String,
    }),
  ),
  nextCursor: Schema.optional(Schema.NullOr(Schema.String)),
})

const ClawStatusResponse = Schema.Struct({
  status: Schema.optional(Schema.NullOr(Schema.String)),
  openclawVersion: Schema.optional(Schema.NullOr(Schema.String)),
  lastStartedAt: Schema.optional(Schema.NullOr(Schema.String)),
  lastStoppedAt: Schema.optional(Schema.NullOr(Schema.String)),
  botName: Schema.optional(Schema.NullOr(Schema.String)),
})

export const KiloGatewayApi = HttpApi.make("kilo-gateway")
  .add(
    HttpApiGroup.make("kilo-gateway")
      .add(
        HttpApiEndpoint.get("authStatus", KiloGatewayPaths.authStatus, {
          query: WorkspaceRoutingQuery,
          success: described(HealthResponse, "Auth status"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "kilo.authStatus",
            summary: "Auth status",
            description: "Returns the authentication status for the Kilo Gateway.",
          }),
        ),
        HttpApiEndpoint.get("cloudSessions", KiloGatewayPaths.cloudSessions, {
          query: WorkspaceRoutingQuery,
          success: described(CloudSessionList, "Cloud session list"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "kilo.cloudSessions",
            summary: "Cloud sessions",
            description: "Returns the list of cloud sessions.",
          }),
        ),
        HttpApiEndpoint.get("cloudSession", KiloGatewayPaths.cloudSession, {
          query: WorkspaceRoutingQuery,
          success: described(CloudSessionData, "Cloud session data"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "kilo.cloudSession",
            summary: "Cloud session",
            description: "Returns a specific cloud session.",
          }),
        ),
        HttpApiEndpoint.post("cloudSessionImport", KiloGatewayPaths.cloudSessionImport, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.String, "Import result"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "kilo.cloudSessionImport",
            summary: "Import cloud session",
            description: "Import a cloud session into the local instance.",
          }),
        ),
        HttpApiEndpoint.get("clawStatus", KiloGatewayPaths.clawStatus, {
          query: WorkspaceRoutingQuery,
          success: described(ClawStatusResponse, "Claw status"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "kilo.clawStatus",
            summary: "Claw status",
            description: "Returns the status of the KiloClaw worker.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "kilo-gateway",
          description: "Kilo Gateway routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "kilo HttpApi",
      version: "0.0.1",
      description: "Kilo HttpApi surface.",
    }),
  )
