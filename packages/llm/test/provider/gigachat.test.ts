import { describe, expect } from "bun:test"
import { Effect, Schema } from "effect"
import { HttpClientRequest } from "effect/unstable/http"
import { LLM, Message, ToolCallPart } from "../../src"
import { LLMClient } from "../../src/route"
import * as GigaChat from "../../src/providers/gigachat"
import { it } from "../lib/effect"
import { dynamicResponse } from "../lib/http"
import { sseEvents } from "../lib/sse"

const Json = Schema.fromJsonString(Schema.Unknown)
const decodeJson = Schema.decodeUnknownSync(Json)

const model = GigaChat.model("GigaChat-Pro", { apiKey: "test-giga-token" })

const request = LLM.request({
  id: "req_giga_1",
  model,
  system: "Ты полезный ассистент.",
  prompt: "Привет!",
  generation: { maxTokens: 20, temperature: 0 },
})

const deltaChunk = (delta: object, finishReason: string | null = null) => ({
  id: "chatcmpl_giga",
  choices: [{ delta, finish_reason: finishReason }],
  usage: null,
})

const usageChunk = (usage: object) => ({
  id: "chatcmpl_giga",
  choices: [],
  usage,
})

describe("GigaChat provider", () => {
  it.effect("prepares basic chat request with RqUID and Bearer auth", () =>
    Effect.gen(function* () {
      const prepared = yield* LLMClient.prepare(request)

      expect(prepared.route).toBe("gigachat-chat")
      expect(prepared.model).toMatchObject({
        id: "GigaChat-Pro",
        provider: "gigachat",
        route: "gigachat-chat",
        baseURL: "https://gigachat.devices.sberbank.ru/api/v1",
        apiKey: "test-giga-token",
      })
      expect(prepared.body).toEqual({
        model: "GigaChat-Pro",
        messages: [
          { role: "system", content: "Ты полезный ассистент." },
          { role: "user", content: "Привет!" },
        ],
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 20,
        temperature: 0,
      })
    }),
  )

  it.effect("sends RqUID and Bearer Authorization headers", () =>
    Effect.gen(function* () {
      const response = yield* LLMClient.generate(request).pipe(
        Effect.provide(
          dynamicResponse((input) =>
            Effect.gen(function* () {
              const web = yield* HttpClientRequest.toWeb(input.request).pipe(Effect.orDie)

              // Проверяем URL
              expect(web.url).toBe("https://gigachat.devices.sberbank.ru/api/v1/chat/completions")

              // Проверяем auth — должен быть Bearer + RqUID
              expect(web.headers.get("authorization")).toBe("Bearer test-giga-token")
              const rqUid = web.headers.get("RqUID")
              expect(rqUid).toBeTruthy()
              expect(rqUid!.length).toBeGreaterThan(0)

              // Проверяем тело
              expect(decodeJson(input.text)).toMatchObject({
                model: "GigaChat-Pro",
                stream: true,
                messages: [
                  { role: "system", content: "Ты полезный ассистент." },
                  { role: "user", content: "Привет!" },
                ],
              })

              return input.respond(
                sseEvents(
                  deltaChunk({ role: "assistant", content: "Здравствуйте" }),
                  deltaChunk({ content: "!" }),
                  deltaChunk({}, "stop"),
                  usageChunk({ prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }),
                ),
                { headers: { "content-type": "text/event-stream" } },
              )
            }),
          ),
        ),
      )

      expect(response.text).toBe("Здравствуйте!")
      expect(response.usage).toMatchObject({ inputTokens: 10, outputTokens: 2, totalTokens: 12 })
      expect(response.events.at(-1)).toMatchObject({ type: "finish", reason: "stop" })
    }),
  )

  it.effect("supports tools in request", () =>
    Effect.gen(function* () {
      const prepared = yield* LLMClient.prepare(
        LLM.request({
          id: "req_giga_tool",
          model,
          tools: [
            {
              name: "get_weather",
              description: "Get weather for city",
              inputSchema: {
                type: "object",
                properties: { city: { type: "string" } },
                required: ["city"],
              },
            },
          ],
          toolChoice: "get_weather",
          messages: [
            Message.user("What is the weather in Moscow?"),
            Message.assistant([
              ToolCallPart.make({
                id: "call_1",
                name: "get_weather",
                input: { city: "Moscow" },
              }),
            ]),
            Message.tool({ id: "call_1", name: "get_weather", result: { temperature: 20 } }),
          ],
        }),
      )

      expect(prepared.body).toMatchObject({
        model: "GigaChat-Pro",
        messages: [
          { role: "user", content: "What is the weather in Moscow?" },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "get_weather", arguments: '{"city":"Moscow"}' },
              },
            ],
          },
          { role: "tool", tool_call_id: "call_1", content: '{"temperature":20}' },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather for city",
              parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "get_weather" } },
      })
    }),
  )

  it.effect("uses custom baseURL when provided", () =>
    Effect.gen(function* () {
      const customModel = GigaChat.model("GigaChat-Pro", {
        apiKey: "test",
        baseURL: "https://custom.gigachat.test/api/v1",
      })
      expect(customModel).toMatchObject({
        provider: "gigachat",
        baseURL: "https://custom.gigachat.test/api/v1",
      })
    }),
  )
})
