/**
 * Surface test for the gateway stub.
 *
 * The package is intentionally a stub (version 0.0.0-stub): it exists so the
 * provider adapter can import a stable set of symbols. The previous suite tested
 * a full implementation that no longer exists, so it was removed rather than
 * left failing — this test pins the contract the rest of the workspace relies on.
 */
import { describe, expect, test } from "bun:test"
import * as Gateway from "../src/index"
import { createNoCowboy, createNoCowboyDebug } from "../src/provider"
import { fetchNoCowboyModels } from "../src/api/models"
import { resolveNoCowboyGatewayBaseUrl, resolveNoCowboyOpenRouterBaseUrl } from "../src/api/url"
import { sanitizeResponsesBody } from "../src/responses"
import { validAutocompleteModel, validAutocompleteProvider } from "../src/autocomplete"
import { createNoCowboyRoutes } from "../src/server/routes"

describe("gateway stub surface", () => {
  test("the provider factories return an SDK-shaped object", async () => {
    expect(await createNoCowboy()).toEqual({ models: [] })
    expect(await createNoCowboyDebug()).toEqual({ models: [] })
  })

  test("the models endpoint returns the published shape", async () => {
    expect(await fetchNoCowboyModels()).toEqual({ models: {} })
  })

  test("base URL resolvers are exported under the NoCowboy names", () => {
    expect(typeof resolveNoCowboyGatewayBaseUrl()).toBe("string")
    expect(typeof resolveNoCowboyOpenRouterBaseUrl()).toBe("string")
  })

  test("route factory and helpers exist with the stub contract", () => {
    expect(createNoCowboyRoutes()).toEqual({})
    expect(validAutocompleteModel()).toBe(false)
    expect(validAutocompleteProvider()).toBe(false)
    expect(typeof sanitizeResponsesBody).toBe("function")
  })

  test("the entrypoint re-exports the surface the provider imports", () => {
    for (const key of [
      "createNoCowboy",
      "createNoCowboyDebug",
      "fetchNoCowboyModels",
      "createNoCowboyRoutes",
      "resolveNoCowboyGatewayBaseUrl",
      "resolveNoCowboyOpenRouterBaseUrl",
    ] as const) {
      expect(key in Gateway).toBe(true)
    }
  })
})
