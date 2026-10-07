import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer, Option, Schema } from "effect"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import path from "path"
import { Global } from "@nocowboy/core/global"
import { AppFileSystem } from "@nocowboy/core/filesystem"
import { EffectFlock } from "@nocowboy/core/util/effect-flock"
import * as CrossSpawnSpawner from "@nocowboy/core/cross-spawn-spawner"
import { Npm } from "@nocowboy/core/npm"
import { Account } from "../../../src/account/account"
import { Auth } from "../../../src/auth"
import { Config } from "../../../src/config/config"
import { ConfigMarkdown } from "../../../src/config/markdown"
import { ConfigParse } from "../../../src/config/parse"
import { ConfigVariable } from "../../../src/config/variable"
import { Env } from "../../../src/env"
import { KiloIndexing } from "../../../src/nocowboy/indexing"
import { NoCowboyConfig } from "../../../src/nocowboy/config/config"
import { provideTestInstance } from "../../fixture/fixture"
import { Filesystem } from "../../../src/util/filesystem"
import { disposeAllInstances, tmpdir } from "../../fixture/fixture"

const infra = CrossSpawnSpawner.defaultLayer.pipe(
  Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)),
)
const emptyAccount = Layer.mock(Account.Service)({
  active: () => Effect.succeed(Option.none()),
  activeOrg: () => Effect.succeed(Option.none()),
})
const emptyAuth = Layer.mock(Auth.Service)({
  all: () => Effect.succeed({}),
})
const noopNpm = Layer.mock(Npm.Service)({
  install: () => Effect.void,
  add: () => Effect.die("not implemented"),
  which: () => Effect.succeed(Option.none()),
})
const layer = Config.layer.pipe(
  Layer.provide(EffectFlock.defaultLayer),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(Env.defaultLayer),
  Layer.provide(emptyAuth),
  Layer.provide(emptyAccount),
  Layer.provideMerge(infra),
  Layer.provide(noopNpm),
)

const load = () => Effect.runPromise(Config.Service.use((svc) => svc.get()).pipe(Effect.scoped, Effect.provide(layer)))
const clear = () =>
  Effect.runPromise(Config.Service.use((svc) => svc.invalidate()).pipe(Effect.scoped, Effect.provide(layer)))
const saveGlobal = (config: Config.Info) =>
  Effect.runPromise(Config.Service.use((svc) => svc.updateGlobal(config)).pipe(Effect.scoped, Effect.provide(layer)))
const saveProject = (config: Config.Info) =>
  Effect.runPromise(Config.Service.use((svc) => svc.update(config)).pipe(Effect.scoped, Effect.provide(layer)))

async function writeConfig(dir: string, config: object, name = "nocowboy.json") {
  await Filesystem.write(path.join(dir, name), JSON.stringify(config))
}

function decode(input: unknown): Config.Info {
  const config = Schema.decodeUnknownSync(Config.Info)(input)
  return {
    ...config,
    skills: config.skills && {
      paths: config.skills.paths && [...config.skills.paths],
      urls: config.skills.urls && [...config.skills.urls],
    },
  }
}

const cfg: Partial<Config.Info> = {
  plugin: ["@nocowboy/indexing"],
  indexing: {
    provider: "ollama",
    vectorStore: "qdrant",
    ollama: {
      baseUrl: "http://127.0.0.1:1",
    },
  },
}

afterEach(async () => {
  delete process.env.KILO_MD_TEST
  await clear()
  await disposeAllInstances()
})

describe("markdown substitutions", () => {
  test("applies file and env substitutions to parsed markdown body", async () => {
    process.env.KILO_MD_TEST = "env content"
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Filesystem.write(path.join(dir, "body.md"), "file content")
        await Filesystem.write(
          path.join(dir, "SKILL.md"),
          ["---", "name: test", "description: Test", "---", "{file:body.md}", "{env:KILO_MD_TEST}"].join("\n"),
        )
      },
    })

    const md = await ConfigMarkdown.parse(path.join(tmp.path, "SKILL.md"), { trusted: true })

    expect(md.content).toContain("file content")
    expect(md.content).toContain("env content")
  })
})

// Upstream b793bf788f / 032f3bb: untrusted project config must not resolve env references, and file
// references must be confined to the project scope. Regression guard for the credential/file exfil gap.
describe("config substitution trust boundary", () => {
  test("rejects {env:} references in untrusted project config", async () => {
    await expect(
      ConfigVariable.substitute({ text: "{env:HOME}", type: "path", path: "/tmp/nocowboy.json", trusted: false }),
    ).rejects.toThrow()
  })

  test("rejects {file:} references without a project scope", async () => {
    await expect(
      ConfigVariable.substitute({ text: "{file:body.md}", type: "path", path: "/tmp/nocowboy.json", trusted: false }),
    ).rejects.toThrow()
  })

  test("blocks server credential env references even in trusted config", async () => {
    await expect(
      ConfigVariable.substitute({
        text: "{env:NOCOWBOY_SERVER_PASSWORD}",
        type: "path",
        path: "/tmp/nocowboy.json",
        trusted: true,
      }),
    ).rejects.toThrow()
  })

  test("resolves {env:} in trusted config", async () => {
    process.env.KILO_MD_TEST = "env content"
    const out = await ConfigVariable.substitute({
      text: "{env:KILO_MD_TEST}",
      type: "path",
      path: "/tmp/nocowboy.json",
      trusted: true,
    })
    expect(out).toBe("env content")
  })

  test("confines untrusted {file:} to the project scope", async () => {
    await using root = await tmpdir({
      init: async (dir) => {
        await Filesystem.write(path.join(dir, "inside.md"), "inside content")
      },
    })
    await using outside = await tmpdir({
      init: async (dir) => {
        await Filesystem.write(path.join(dir, "secret.md"), "TOP SECRET")
      },
    })
    const cfgPath = path.join(root.path, "nocowboy.json")
    const fileScope = { root: root.path, source: cfgPath }

    const ok = await ConfigVariable.substitute({
      text: "{file:inside.md}",
      type: "path",
      path: cfgPath,
      trusted: false,
      fileScope,
    })
    expect(ok).toContain("inside content")

    await expect(
      ConfigVariable.substitute({
        text: `{file:${path.join(outside.path, "secret.md")}}`,
        type: "path",
        path: cfgPath,
        trusted: false,
        fileScope,
      }),
    ).rejects.toThrow()
  })
})

describe("NoCowboy indexing config", () => {
  test("ignores retired semantic indexing flags in existing configs", async () => {
    await using tmp = await tmpdir({ git: true })
    await writeConfig(tmp.path, {
      experimental: { semantic_indexing: true, batch_tool: true },
    })

    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const config = await load()
        expect(config.experimental?.batch_tool).toBe(true)
        expect(config.experimental).not.toHaveProperty("semantic_indexing")
      },
    })
  })

  test("keeps global indexing enabled in global config", async () => {
    await using globalTmp = await tmpdir()
    await using tmp = await tmpdir()

    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = globalTmp.path
    await clear()
    await disposeAllInstances()

    try {
      await writeConfig(globalTmp.path, {
        $schema: "https://app.kilo.ai/config.json",
        indexing: {
          enabled: true,
          provider: "ollama",
        },
      })

      await provideTestInstance({
        directory: tmp.path,
        fn: async () => {
          const config = await load()
          const global = await Effect.runPromise(
            Config.Service.use((svc) => svc.getGlobal()).pipe(Effect.scoped, Effect.provide(layer)),
          )
          expect(config.indexing?.provider).toBe("ollama")
          expect(config.indexing?.enabled).toBeUndefined()
          expect(global.indexing?.enabled).toBe(true)
        },
      })
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await clear()
      await disposeAllInstances()
    }
  })

  test("uses global indexing enabled when project enablement is unset", async () => {
    await using globalTmp = await tmpdir()
    await using tmp = await tmpdir({ git: true, config: cfg })

    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = globalTmp.path
    await clear()
    await disposeAllInstances()

    try {
      await writeConfig(globalTmp.path, {
        $schema: "https://app.kilo.ai/config.json",
        indexing: {
          enabled: true,
        },
      })

      await provideTestInstance({
        directory: tmp.path,
        fn: async () => {
          const global = await Effect.runPromise(
            Config.Service.use((svc) => svc.getGlobal()).pipe(Effect.scoped, Effect.provide(layer)),
          )
          const config = await load()
          const input = KiloIndexing.input(config.indexing, global.indexing)
          expect(input.enabled).toBe(true)
        },
      })
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await clear()
      await disposeAllInstances()
    }
  })

  test("project indexing enabled overrides global enablement", async () => {
    const input = KiloIndexing.input({ enabled: false }, { enabled: true })
    expect(input.enabled).toBe(false)
    expect(KiloIndexing.input(undefined, { enabled: true }).enabled).toBe(true)
    expect(KiloIndexing.input({ enabled: true }, { enabled: false }).enabled).toBe(true)
  })

  test("creates missing project config as .nocowboy/nocowboy.jsonc", async () => {
    await using tmp = await tmpdir({ git: true })

    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        await saveProject({ indexing: { enabled: true } })
      },
    })

    expect(await Bun.file(path.join(tmp.path, ".nocowboy", "nocowboy.jsonc")).exists()).toBe(true)
    expect(await Bun.file(path.join(tmp.path, ".nocowboy", "nocowboy.json")).exists()).toBe(false)
  })

  test("accepts delete sentinels for indexing model overrides", () => {
    const patch = decode({ indexing: { model: null, dimension: null } })
    const merged = NoCowboyConfig.mergeConfig(
      {
        indexing: {
          provider: "openai",
          model: "text-embedding-3-large",
          dimension: 3072,
        },
      },
      patch,
    )
    const input = KiloIndexing.input(patch.indexing)

    expect(merged.indexing).toEqual({ provider: "openai" })
    expect(input.modelId).toBeUndefined()
    expect(input.modelDimension).toBeUndefined()
  })
})

describe("custom provider model config", () => {
  test("persists and removes reasoning across a global config reload", async () => {
    await using globalTmp = await tmpdir()
    const file = path.join(globalTmp.path, "nocowboy.json")
    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = globalTmp.path
    await clear()
    await disposeAllInstances()

    try {
      await writeConfig(globalTmp.path, {
        provider: {
          custom: {
            name: "Custom",
            models: { model: { name: "Model" } },
          },
        },
      })
      await saveGlobal(
        decode({
          provider: {
            custom: {
              models: { model: { reasoning: true } },
            },
          },
        }),
      )
      const added = JSON.parse(await Bun.file(file).text())
      expect(added.provider.custom.models.model.reasoning).toBe(true)

      await saveGlobal(
        decode({
          provider: {
            custom: {
              models: { model: { reasoning: null } },
            },
          },
        }),
      )
      const written = JSON.parse(await Bun.file(file).text())
      expect(written.provider.custom.models.model).not.toHaveProperty("reasoning")

      await clear()
      const reloaded = await Effect.runPromise(
        Config.Service.use((svc) => svc.getGlobal()).pipe(Effect.scoped, Effect.provide(layer)),
      )
      expect(reloaded.provider?.custom?.models?.model?.reasoning).toBeUndefined()
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await clear()
      await disposeAllInstances()
    }
  })
})

describe("subagent variant overrides", () => {
  test("removes one model override without removing sibling models", () => {
    const patch = decode({
      subagent_variant_overrides: {
        "anthropic/claude-sonnet-4-6": null,
      },
    })
    const merged = NoCowboyConfig.mergeConfig(
      {
        subagent_variant_overrides: {
          "anthropic/claude-sonnet-4-6": "high",
          "openai/gpt-5": "xhigh",
        },
      },
      patch,
    )

    expect(patch.subagent_variant_overrides?.["anthropic/claude-sonnet-4-6"]).toBeNull()
    expect(merged.subagent_variant_overrides).toEqual({ "openai/gpt-5": "xhigh" })
  })

  test("accepts a delete sentinel for the complete override map", () => {
    const patch = decode({ subagent_variant_overrides: null })
    const merged = NoCowboyConfig.mergeConfig(
      {
        subagent_variant_overrides: {
          "anthropic/claude-sonnet-4-6": "high",
        },
      },
      patch,
    )

    expect(patch.subagent_variant_overrides).toBeNull()
    expect(merged.subagent_variant_overrides).toBeUndefined()
  })
})

describe("agent config", () => {
  test("accepts delete sentinels for agent model and variant overrides", () => {
    const patch = decode({ agent: { explore: { model: null, variant: null } } })
    const merged = NoCowboyConfig.mergeConfig(
      {
        agent: {
          explore: {
            model: "kilo/anthropic/claude-sonnet-4-6",
            variant: "high",
          },
        },
      },
      patch,
    )

    expect(patch.agent?.explore?.model).toBeNull()
    expect(patch.agent?.explore?.variant).toBeNull()
    expect(merged.agent).toBeUndefined()
  })

  test("removes an agent variant override without removing its model", () => {
    const patch = decode({ agent: { explore: { variant: null } } })
    const merged = NoCowboyConfig.mergeConfig(
      {
        agent: {
          explore: {
            model: "kilo/anthropic/claude-sonnet-4-6",
            variant: "high",
          },
        },
      },
      patch,
    )

    expect(patch.agent?.explore?.variant).toBeNull()
    expect(merged.agent?.explore).toEqual({ model: "kilo/anthropic/claude-sonnet-4-6" })
  })

  test("removes agent model and variant overrides from global JSONC config", async () => {
    await using globalTmp = await tmpdir()
    const file = path.join(globalTmp.path, "nocowboy.jsonc")
    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = globalTmp.path
    await clear()
    await disposeAllInstances()

    try {
      await Filesystem.write(
        file,
        [
          "{",
          "  // Preserve this comment while clearing overrides.",
          '  "agent": {',
          '    "explore": {',
          '      "model": "kilo/anthropic/claude-sonnet-4-6",',
          '      "variant": "high",',
          '      "description": "Keep me"',
          "    }",
          "  }",
          "}",
        ].join("\n"),
      )
      const patch = decode({ agent: { explore: { model: null, variant: null } } })

      await saveGlobal(patch)

      const written = await Bun.file(file).text()
      expect(written).toContain("// Preserve this comment while clearing overrides.")
      expect(written).not.toContain('"model"')
      expect(written).not.toContain('"variant"')
      expect(written).toContain('"description": "Keep me"')
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await clear()
      await disposeAllInstances()
    }
  })
})

describe("bash permission migration", () => {
  for (const action of ["allow", "ask", "deny"] as const) {
    test(`preserves string-form ${action} permission in jsonc`, async () => {
      const input = `{
  "$schema": "https://app.kilo.ai/config.json",
  "permission": "${action}"
}`
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Filesystem.write(path.join(dir, "nocowboy.jsonc"), input)
        },
      })

      const prev = Global.Path.config
      ;(Global.Path as { config: string }).config = tmp.path
      await clear()
      await disposeAllInstances()

      try {
        await NoCowboyConfig.migrateBashPermission()

        const file = path.join(tmp.path, "nocowboy.jsonc")
        const text = await Filesystem.readText(file)
        const parsed = ConfigParse.schema(Config.Info, ConfigParse.jsonc(text, file), file)
        expect(text).toBe(input)
        expect(parsed.permission?.["*"]).toBe(action)
        expect(parsed.permission?.bash).toBeUndefined()
      } finally {
        ;(Global.Path as { config: string }).config = prev
        await clear()
        await disposeAllInstances()
      }
    })

    test(`preserves string-form ${action} permission in json`, async () => {
      const input = JSON.stringify({
        $schema: "https://app.kilo.ai/config.json",
        permission: action,
      })
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Filesystem.write(path.join(dir, "nocowboy.json"), input)
        },
      })

      const prev = Global.Path.config
      ;(Global.Path as { config: string }).config = tmp.path
      await clear()
      await disposeAllInstances()

      try {
        await NoCowboyConfig.migrateBashPermission()

        const file = path.join(tmp.path, "nocowboy.json")
        const text = await Filesystem.readText(file)
        const parsed = ConfigParse.schema(Config.Info, ConfigParse.jsonc(text, file), file)
        expect(text).toBe(input)
        expect(parsed.permission?.["*"]).toBe(action)
        expect(parsed.permission?.bash).toBeUndefined()
      } finally {
        ;(Global.Path as { config: string }).config = prev
        await clear()
        await disposeAllInstances()
      }
    })
  }

  test("migrates object-form global permission in jsonc", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Filesystem.write(
          path.join(dir, "nocowboy.jsonc"),
          `{
  "$schema": "https://app.kilo.ai/config.json",
  "permission": {
    "read": "allow"
  }
}`,
        )
      },
    })

    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = tmp.path
    await clear()
    await disposeAllInstances()

    try {
      await NoCowboyConfig.migrateBashPermission()

      const file = path.join(tmp.path, "nocowboy.jsonc")
      const text = await Filesystem.readText(file)
      const parsed = ConfigParse.schema(Config.Info, ConfigParse.jsonc(text, file), file)
      expect(parsed.permission?.read).toBe("allow")
      expect(parsed.permission?.bash).toBe("allow")
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await clear()
      await disposeAllInstances()
    }
  })
})

// nocowboy_change — subagent hang watchdog config surface
describe("subagent hang watchdog config", () => {
  test("decodes the watchdog timeouts and accepts 0 to disable", () => {
    const config = decode({
      experimental: {
        stream_idle_timeout_ms: 1234,
        subagent_stall_timeout_ms: 0,
        subagent_max_runtime_ms: 60000,
      },
    })

    expect(config.experimental?.stream_idle_timeout_ms).toBe(1234)
    expect(config.experimental?.subagent_stall_timeout_ms).toBe(0)
    expect(config.experimental?.subagent_max_runtime_ms).toBe(60000)
  })

  test("rejects negative timeouts", () => {
    expect(() => decode({ experimental: { subagent_stall_timeout_ms: -1 } })).toThrow()
  })
})

// nocowboy_change — context profile config surface (deep-context-2m)
describe("context_profile config", () => {
  test("accepts compact|standard|deep", () => {
    expect(decode({ context_profile: "compact" }).context_profile).toBe("compact")
    expect(decode({ context_profile: "standard" }).context_profile).toBe("standard")
    expect(decode({ context_profile: "deep", budget: { max_tokens: 2_000_000 } }).context_profile).toBe("deep")
  })

  test("rejects an unknown profile", () => {
    expect(() => decode({ context_profile: "huge" })).toThrow()
  })
})

describe("provider model entry tolerance", () => {
  test("a malformed provider model entry does not break config load", async () => {
    await using tmp = await tmpdir({ git: true })
    await writeConfig(tmp.path, {
      provider: {
        local: {
          models: {
            good: { name: "Good Model" },
            bad: { cost: { input: "not-a-number" } },
          },
        },
      },
    })
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const config = await load()
        const models = (config.provider?.local as { models?: Record<string, unknown> } | undefined)?.models
        expect(models?.good).toBeDefined()
        expect(models?.bad).toBeUndefined()
      },
    })
  })
})
