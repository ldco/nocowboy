import { describe, expect, test } from "bun:test"
import {
  hasNoCowboyIndexingAuth,
  resolveNoCowboyIndexingAuth,
  shouldDefaultIndexingToNoCowboy,
} from "../../src/nocowboy/indexing-auth"

describe("Kilo indexing auth resolution", () => {
  test("detects auth from explicit indexing Kilo config", () => {
    const auth = resolveNoCowboyIndexingAuth({
      config: { indexing: { kilo: { apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" } } },
    })

    expect(auth).toEqual({ apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" })
    expect(hasNoCowboyIndexingAuth({ config: { indexing: { kilo: { apiKey: "idx-token" } } } })).toBe(true)
  })

  test("detects auth from provider config, provider state, auth storage, and env", () => {
    expect(
      resolveNoCowboyIndexingAuth({ config: { provider: { kilo: { options: { apiKey: "cfg-token" } } } } }).apiKey,
    ).toBe("cfg-token")
    expect(resolveNoCowboyIndexingAuth({ provider: { options: { kilocodeToken: "provider-token" } } }).apiKey).toBe(
      "provider-token",
    )
    expect(resolveNoCowboyIndexingAuth({ auth: { type: "oauth", access: "oauth-token", accountId: "org_oauth" } })).toEqual(
      {
        apiKey: "oauth-token",
        organizationId: "org_oauth",
      },
    )
    expect(resolveNoCowboyIndexingAuth({ env: { KILO_API_KEY: "env-token", KILO_ORG_ID: "org_env" } })).toEqual({
      apiKey: "env-token",
      organizationId: "org_env",
    })
  })

  test("defaults to Kilo only when no provider or other embedder config is present", () => {
    const auth = { apiKey: "kilo-token" }

    expect(shouldDefaultIndexingToNoCowboy({}, auth)).toBe(true)
    expect(shouldDefaultIndexingToNoCowboy({ provider: "openai" }, auth)).toBe(false)
    expect(shouldDefaultIndexingToNoCowboy({ openai: { apiKey: "openai-key" } }, auth)).toBe(false)
    expect(shouldDefaultIndexingToNoCowboy({ ollama: { baseUrl: "http://localhost:11434" } }, auth)).toBe(false)
  })
})
