// kilocode_change - new file
import { createNoCowboy, NOCOWBOY_OPENROUTER_BASE } from "@nocowboy/gateway"
import { Effect } from "effect"
import { PluginV2 } from "../../plugin"
import { ProviderV2 } from "../../provider"

const id = ProviderV2.ID.make("kilo")

export const KiloPlugin = PluginV2.define({
  id: PluginV2.ID.make("kilo"),
  effect: Effect.gen(function* () {
    return {
      "provider.update": Effect.fn(function* (evt) {
        if (evt.provider.id !== id) return

        const options = evt.provider.options.aisdk.provider
        const token = options.nocowboyToken ?? options.apiKey ?? process.env.NOCOWBOY_API_KEY
        const org = process.env.NOCOWBOY_ORG_ID ?? options.nocowboyOrganizationId

        evt.provider.endpoint = {
          type: "aisdk",
          package: "@nocowboy/gateway",
          url: NOCOWBOY_OPENROUTER_BASE,
        }
        evt.provider.options.headers["HTTP-Referer"] = "https://nocowboy.ai/"
        evt.provider.options.headers["X-Title"] = "NoCowboy"
        options.nocowboyToken = token ?? "anonymous"
        if (org) options.nocowboyOrganizationId = org
        if (!evt.provider.enabled) evt.provider.enabled = { via: "custom", data: { anonymous: true } }
      }),
      "aisdk.sdk": Effect.fn(function* (evt) {
        if (evt.model.providerID !== id) return
        evt.sdk = createNoCowboy()
      }),
    }
  }),
})
