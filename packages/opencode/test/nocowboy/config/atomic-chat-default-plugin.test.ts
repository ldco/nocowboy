import { describe, expect, spyOn, test } from "bun:test"
import { Npm } from "@opencode-ai/core/npm"
import type { ConfigPlugin } from "@/config/plugin"
import { hasAtomicChatPlugin } from "@/nocowboy/atomic-chat-feature"
import { NoCowboyDefaultPlugins } from "@/nocowboy/config/default-plugins"
import { PluginLoader } from "@/plugin/loader"

const atomic = "@nocowboy/plugin-atomic-chat"

describe("kilocode default atomic chat plugin", () => {
  test("does not inject atomic chat as a bundled plugin", () => {
    const external: ConfigPlugin.Origin = { spec: "global-plugin", source: "global", scope: "global" }
    const cfg = { plugin: [external.spec], plugin_origins: [external] }

    NoCowboyDefaultPlugins.apply(cfg, { disabled: false })

    expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
    expect(cfg.plugin).toEqual([external.spec])
    expect(cfg.plugin_origins).toEqual([external])
  })

  test("does not add atomic chat plugin when default plugins are disabled", () => {
    const cfg = { plugin: ["global-plugin-1"] }
    NoCowboyDefaultPlugins.apply(cfg, { disabled: true })
    expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
    expect(cfg.plugin).toEqual(["global-plugin-1"])
  })

  test("keeps a persisted atomic chat marker in external plugin origins", () => {
    const external: ConfigPlugin.Origin = { spec: "global-plugin", source: "global", scope: "global" }
    const marker: ConfigPlugin.Origin = { spec: atomic, source: "builtin", scope: "global" }
    const cfg = {
      plugin: [atomic, external.spec],
      plugin_origins: [marker, external],
    }

    NoCowboyDefaultPlugins.apply(cfg, { disabled: true })

    expect(cfg.plugin).toEqual([atomic, external.spec])
    expect(cfg.plugin_origins).toEqual([marker, external])
  })

  test("does not recognize an existing atomic chat spec as bundled", () => {
    const cfg = { plugin: [atomic] }
    NoCowboyDefaultPlugins.apply(cfg, { disabled: false })
    expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
    expect(cfg.plugin).toEqual([atomic])
  })

  test("does not treat a versioned atomic chat package as bundled", () => {
    const spec = `${atomic}@7.3.46`
    const origin: ConfigPlugin.Origin = { spec, source: "global", scope: "global" }
    const cfg = {
      plugin: [spec],
      plugin_origins: [origin],
    }

    NoCowboyDefaultPlugins.apply(cfg, { disabled: false })

    expect(cfg.plugin).toEqual([spec])
    expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
    expect(cfg.plugin_origins).toEqual([origin])
  })

  test("does not treat npm aliases as bundled", () => {
    for (const spec of [
      `npm:${atomic}`,
      `npm:${atomic}@7.3.46`,
      `atomic@npm:${atomic}`,
      `atomic@npm:${atomic}@7.3.46`,
    ]) {
      const origin: ConfigPlugin.Origin = { spec, source: "global", scope: "global" }
      const cfg = {
        plugin: [spec],
        plugin_origins: [origin],
      }

      NoCowboyDefaultPlugins.apply(cfg, { disabled: false })

      expect(cfg.plugin).toEqual([spec])
      expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
      expect(cfg.plugin_origins).toEqual([origin])
    }
  })

  test("keeps aliases named atomic chat with another target external", () => {
    const spec = `${atomic}@npm:other-plugin`
    const origin: ConfigPlugin.Origin = { spec, source: "global", scope: "global" }
    const cfg = { plugin: [spec], plugin_origins: [origin] }

    NoCowboyDefaultPlugins.apply(cfg, { disabled: false })

    expect(cfg.plugin).toEqual([spec])
    expect(cfg.plugin_origins).toEqual([origin])
  })

  test("keeps similarly named file plugins external", () => {
    const spec = "file:///tmp/custom-plugin-atomic-chat.ts"
    const origin: ConfigPlugin.Origin = { spec, source: "project", scope: "local" }
    const cfg = { plugin: [spec], plugin_origins: [origin] }

    NoCowboyDefaultPlugins.apply(cfg, { disabled: false })

    expect(cfg.plugin).toEqual([spec])
    expect(hasAtomicChatPlugin(cfg.plugin)).toBe(false)
    expect(cfg.plugin_origins).toEqual([origin])
  })

  test("external loader no longer skips atomic chat specs as bundled", async () => {
    const install = spyOn(Npm, "add").mockRejectedValue(new Error("install attempted"))
    const specs = [atomic, `${atomic}@7.3.46`, `npm:${atomic}`, `atomic@npm:${atomic}@7.3.46`]

    try {
      const loaded = await PluginLoader.loadExternal({
        items: specs.map((spec) => ({ spec, source: "test", scope: "global" as const })),
        kind: "server",
      })

      expect(loaded).toEqual([])
      expect(install).toHaveBeenCalled()
    } finally {
      install.mockRestore()
    }
  })
})
