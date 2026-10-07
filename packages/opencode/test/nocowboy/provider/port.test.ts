import { describe, expect, test } from "bun:test"
import {
  INSECURE_TLS_ENV,
  billingInfoOf,
  generationProtocolOf,
  joinURL,
  normalizeBaseURL,
  requestInit,
  resolveProviderPort,
  toModelDescriptor,
  toModelDescriptors,
} from "../../../src/nocowboy/provider/port"

describe("provider port — transport policy", () => {
  test("normalizeBaseURL strips whitespace and trailing slashes, empties become undefined", () => {
    expect(normalizeBaseURL("https://api.deepseek.com/")).toBe("https://api.deepseek.com")
    expect(normalizeBaseURL("https://x/v1///")).toBe("https://x/v1")
    expect(normalizeBaseURL("  https://x  ")).toBe("https://x")
    expect(normalizeBaseURL("")).toBeUndefined()
    expect(normalizeBaseURL("   ")).toBeUndefined()
    expect(normalizeBaseURL(undefined)).toBeUndefined()
  })

  test("resolveProviderPort preserves the baseURL policy through the port", () => {
    const port = resolveProviderPort({ id: "deepseek", baseURL: "https://proxy.internal/v1/", env: {} })
    expect(port.id).toBe("deepseek")
    expect(port.transport.baseURL).toBe("https://proxy.internal/v1")
  })

  test("proxy precedence: explicit > NOCOWBOY_PROXY > HTTPS_PROXY > HTTP_PROXY", () => {
    expect(
      resolveProviderPort({
        id: "x",
        proxy: "http://explicit:1",
        env: { NOCOWBOY_PROXY: "http://nc:2", HTTPS_PROXY: "http://https:3", HTTP_PROXY: "http://http:4" },
      }).transport.proxy,
    ).toBe("http://explicit:1")
    expect(
      resolveProviderPort({ id: "x", env: { NOCOWBOY_PROXY: "http://nc:2", HTTPS_PROXY: "http://https:3" } }).transport
        .proxy,
    ).toBe("http://nc:2")
    expect(resolveProviderPort({ id: "x", env: { HTTPS_PROXY: "http://https:3" } }).transport.proxy).toBe(
      "http://https:3",
    )
    expect(resolveProviderPort({ id: "x", env: { HTTP_PROXY: "http://http:4" } }).transport.proxy).toBe("http://http:4")
    expect(resolveProviderPort({ id: "x", env: {} }).transport.proxy).toBeUndefined()
  })

  test("insecureTLS is an explicit opt-in, never the default", () => {
    expect(resolveProviderPort({ id: "x", env: {} }).transport.insecureTLS).toBeUndefined()
    expect(resolveProviderPort({ id: "x", insecureTLS: true, env: {} }).transport.insecureTLS).toBe(true)
    expect(resolveProviderPort({ id: "x", env: { [INSECURE_TLS_ENV]: "1" } }).transport.insecureTLS).toBe(true)
    // "0" and any other value do NOT opt in.
    expect(resolveProviderPort({ id: "x", env: { [INSECURE_TLS_ENV]: "0" } }).transport.insecureTLS).toBeUndefined()
  })

  test("requestInit carries no tls override by default (certificate verification stays on)", () => {
    const init = requestInit(resolveProviderPort({ id: "x", env: {} }), { Authorization: "Bearer k" })
    expect(Object.keys(init)).not.toContain("tls")
    expect(init.tls).toBeUndefined()
    expect(init.headers).toEqual({ Authorization: "Bearer k" })
  })

  test("requestInit attaches rejectUnauthorized:false ONLY on explicit opt-in", () => {
    const init = requestInit(resolveProviderPort({ id: "x", insecureTLS: true, env: {} }), {})
    expect(init.tls).toEqual({ rejectUnauthorized: false })
  })

  test("requestInit forwards the proxy when the port has one", () => {
    const init = requestInit(resolveProviderPort({ id: "x", env: { HTTPS_PROXY: "http://p:1" } }), {})
    expect(init.proxy).toBe("http://p:1")
    expect(Object.keys(init)).not.toContain("tls")
  })

  test("joinURL uses the port base when set, else the fallback host", () => {
    expect(joinURL("https://proxy.internal/v1", "https://api.deepseek.com", "/user/balance")).toBe(
      "https://proxy.internal/v1/user/balance",
    )
    expect(joinURL(undefined, "https://api.deepseek.com/", "/user/balance")).toBe(
      "https://api.deepseek.com/user/balance",
    )
    expect(joinURL(undefined, "https://api.x", "no-slash")).toBe("https://api.x/no-slash")
  })
})

describe("provider port — shared schema converted at the boundary", () => {
  test("generationProtocolOf maps a wire api to a protocol", () => {
    expect(generationProtocolOf("https://api.anthropic.com")).toBe("anthropic")
    expect(generationProtocolOf("@ai-sdk/anthropic")).toBe("anthropic")
    expect(generationProtocolOf("https://generativelanguage.googleapis.com")).toBe("google")
    expect(generationProtocolOf("https://openrouter.ai/api/v1")).toBe("openai")
    expect(generationProtocolOf("@ai-sdk/openai-compatible")).toBe("openai")
    expect(generationProtocolOf("https://api.deepseek.com")).toBe("unknown")
    expect(generationProtocolOf(undefined)).toBe("unknown")
  })

  test("billingInfoOf separates currency/status from a shared cost block", () => {
    expect(billingInfoOf({ cost: { input: 0.5, output: 1.5 } })).toEqual({ currency: "USD", status: "ok", amount: 0.5 })
    expect(billingInfoOf({ cost: { input: 0.5 }, currency: "CNY" })).toEqual({
      currency: "CNY",
      status: "ok",
      amount: 0.5,
    })
    expect(billingInfoOf({})).toEqual({ currency: "USD", status: "unknown", reason: "no cost in shared schema" })
  })

  test("toModelDescriptor converts one shared entry into separated domain fields", () => {
    const shared = {
      id: "claude-test",
      name: "Claude Test",
      family: "claude",
      reasoning: true,
      tool_call: true,
      attachment: false,
      temperature: true,
      cost: { input: 3, output: 15 },
      limit: { context: 200_000, output: 8_192 },
    }
    expect(toModelDescriptor(shared, "https://api.anthropic.com")).toEqual({
      id: "claude-test",
      name: "Claude Test",
      family: "claude",
      capabilities: { toolCall: true, reasoning: true, attachment: false, temperature: true },
      protocol: "anthropic",
      billing: { currency: "USD", status: "ok", amount: 3 },
      contextLimit: 200_000,
      outputLimit: 8_192,
    })
  })

  test("toModelDescriptor validates at the boundary (malformed entries throw)", () => {
    expect(() => toModelDescriptor({ name: "x" })).toThrow("model.id")
    expect(() => toModelDescriptor({ id: "x" })).toThrow("model.name")
  })

  test("toModelDescriptors walks a whole snapshot and skips malformed entries", () => {
    const snapshot = {
      anthropic: {
        api: "https://api.anthropic.com",
        models: {
          good: { id: "good", name: "Good", limit: { context: 1000, output: 100 } },
          broken: { name: "no id" },
        },
      },
      malformedProvider: "not-an-object",
    }
    const out = toModelDescriptors(snapshot)
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe("good")
    expect(out[0]!.protocol).toBe("anthropic")
    // The shared shape does not leak: every field is a domain type, not `unknown`.
    expect(out[0]!.capabilities).toEqual({ toolCall: false, reasoning: false, attachment: false, temperature: false })
  })
})
