import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Config } from "../../../src/config/config"
import { it } from "../../lib/effect"
import { filterPromptTrainingModels } from "../../../src/nocowboy/provider/model-filter"
import { ProviderID, ModelID } from "../../../src/provider/schema"

function model(id: string, training?: boolean) {
  return {
    id: ModelID.make(id),
    providerID: ProviderID.nocowboy,
    api: { id: "kilo", url: "https://api.kilo.ai", npm: "@nocowboy/gateway" },
    name: id,
    capabilities: {
      temperature: true,
      reasoning: false,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 128000, output: 4096 },
    status: "active" as const,
    options: {},
    headers: {},
    release_date: "2026-01-01",
    mayTrainOnYourPrompts: training,
  }
}

function provider(id: string, models: Record<string, any>) {
  return {
    id: ProviderID.make(id),
    name: id,
    source: "api" as const,
    env: [],
    options: {},
    models,
  }
}

describe("filters prompt-training models from both provider catalogs", () => {
  test("filters nocowboy but not other providers", () => {
    const providers = {
      [ProviderID.nocowboy]: provider(ProviderID.nocowboy, {
        "test/training": model("test/training", true),
        "test/private": model("test/private", false),
      }),
      [ProviderID.make("other")]: provider("other", {
        "test/training": { ...model("test/training", true), providerID: ProviderID.make("other") },
        "test/private": { ...model("test/private"), providerID: ProviderID.make("other") },
      }),
    }

    const result = filterPromptTrainingModels(providers, true)

    expect(Object.keys(result[ProviderID.nocowboy].models)).toEqual(["test/private"])
    expect(Object.keys(result["other"].models)).toEqual(["test/training", "test/private"])
  })

  test("returns empty object when nocowboy has only training models", () => {
    const providers = {
      [ProviderID.nocowboy]: provider(ProviderID.nocowboy, {
        "test/training": model("test/training", true),
      }),
    }

    const result = filterPromptTrainingModels(providers, true)
    expect(Object.keys(result[ProviderID.nocowboy].models)).toEqual([])
  })
})
