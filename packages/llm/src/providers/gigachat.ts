import { Effect, Redacted } from "effect"
import { Headers } from "effect/unstable/http"
import { Auth } from "../route/auth"
import { Route } from "../route/client"
import type { ModelInput } from "../llm"
import { Provider } from "../provider"
import { ProviderID, type ModelID } from "../schema"
import * as OpenAIChat from "../protocols/openai-chat"

export const id = ProviderID.make("gigachat")

// ── Auth: Bearer (from apiKey) + RqUID header ────────────────────────────

const gigachatAuth = Auth.remove("authorization").andThen(
  Auth.custom(({ request, headers }) => {
    let h = headers
    const key = request.model.apiKey
    if (key) {
      const secret = typeof key === "string" ? key : Redacted.value(key)
      h = Headers.set(h, "authorization", `Bearer ${secret}`)
    }
    h = Headers.set(h, "RqUID", crypto.randomUUID())
    return Effect.succeed(h)
  }),
)

// ── Route ────────────────────────────────────────────────────────────────

const chatRoute = OpenAIChat.route.with({
  id: "gigachat-chat",
  provider: id,
  transport: OpenAIChat.httpTransport.with({ auth: gigachatAuth }),
})

export const routes = [chatRoute]

// ── Model options ───────────────────────────────────────────────────────

export type ModelOptions = Omit<ModelInput, "id" | "provider" | "route" | "baseURL"> & {
  readonly baseURL?: string
}

type GigaChatModelInput = ModelOptions & Pick<ModelInput, "id">

const mapInput = (input: GigaChatModelInput) => ({
  ...input,
  provider: id,
  baseURL: input.baseURL ?? "https://gigachat.devices.sberbank.ru/api/v1",
  auth: gigachatAuth,
})

const chatModel = Route.model<GigaChatModelInput>(chatRoute, {}, { mapInput })

// ── Provider shape ──────────────────────────────────────────────────────

export const model = (modelID: string | ModelID, options: ModelOptions = {}) =>
  chatModel({ ...options, id: modelID })

export const provider = Provider.make({
  id,
  model,
})

// ── OAuth token helper (опционально, для предварительного получения токена) ──

interface GigaChatOAuthResponse {
  access_token: string
  expires_at: number
}

/**
 * Получить access_token через OAuth 2.0 Client Credentials.
 * Токен живёт ~30 минут. Можно использовать как apiKey в model().
 *
 * @example
 * ```ts
 * const { access_token } = await Effect.runPromise(
 *   getAccessToken("my-client-id", "my-client-secret")
 * )
 * const giga = GigaChat.model("GigaChat-Pro", { apiKey: access_token })
 * ```
 */
export const getAccessToken = (
  clientId: string,
  clientSecret: string,
  scope = "GIGACHAT_API_PERS",
): Effect.Effect<GigaChatOAuthResponse, Error> =>
  Effect.tryPromise(async () => {
    const basic = btoa(`${clientId}:${clientSecret}`)
    const rqUid = crypto.randomUUID()

    const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        RqUID: rqUid,
        Accept: "application/json",
      },
      body: `scope=${scope}`,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown")
      throw new Error(`GigaChat OAuth failed (${res.status}): ${text}`)
    }

    return (await res.json()) as GigaChatOAuthResponse
  })

export * as GigaChat from "./gigachat"
