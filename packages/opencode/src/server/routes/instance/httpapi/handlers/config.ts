import { Config } from "@/config/config"
// nocowboy_change start - preserve Kilo API default model overlay
// nocowboy_change - gateway removed
const fetchDefaultModel = async () => null
import { Auth } from "@/auth"
import { ModelID, ProviderID } from "@/provider/schema"
import { filterPromptTrainingModels, nonEmptyProviders } from "@/nocowboy/provider/model-filter"
// nocowboy_change end
import { Provider } from "@/provider/provider"
import * as InstanceState from "@/effect/instance-state"
import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi" // nocowboy_change
import { InstanceHttpApi } from "../api"
import { markInstanceForDisposal } from "../lifecycle"

export const configHandlers = HttpApiBuilder.group(InstanceHttpApi, "config", (handlers) =>
  Effect.gen(function* () {
    const providerSvc = yield* Provider.Service
    const configSvc = yield* Config.Service

    const get = Effect.fn("ConfigHttpApi.get")(function* () {
      return yield* configSvc.get()
    })

    const update = Effect.fn("ConfigHttpApi.update")(function* (ctx) {
      yield* configSvc.update(ctx.payload)
      yield* markInstanceForDisposal(yield* InstanceState.context)
      return ctx.payload
    })

    // nocowboy_change start
    const warnings = Effect.fn("ConfigHttpApi.warnings")(function* () {
      return yield* configSvc.warnings()
    })
    // nocowboy_change end

    const providers = Effect.fn("ConfigHttpApi.providers")(function* () {
      // nocowboy_change start
      const config = yield* configSvc.get()
      const providers = filterPromptTrainingModels(
        yield* providerSvc.list(),
        config.hide_prompt_training_models === true,
      )
      const defaults = Provider.defaultModelIDs(nonEmptyProviders(providers))
      // nocowboy_change end

      // nocowboy_change start - Fetch default model from Kilo API when the kilo provider is available.
      if (providers[ProviderID.kilo]) {
        const auth = yield* Auth.Service
        const info = yield* auth.get("kilo").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({}))) // nocowboy_change
        const token = info?.type === "oauth" ? info.access : info?.key
        const organizationId = info?.type === "oauth" ? info.accountId : undefined
        const model = yield* Effect.promise(() => fetchDefaultModel())
        if (model && providers[ProviderID.kilo]?.models[model]) defaults[ProviderID.kilo] = ModelID.make(model)
      }
      // nocowboy_change end

      return {
        providers: Object.values(providers).map(Provider.toPublicInfo),
        default: defaults,
      }
    })

    return handlers
      .handle("get", get)
      .handle("update", update)
      .handle("warnings", warnings)
      .handle("providers", providers) // nocowboy_change
  }),
)
