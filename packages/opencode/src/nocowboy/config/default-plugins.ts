import { createRequire } from "module"
import { ConfigPlugin } from "@/config/plugin"
import { ensureAtomicChatPlugin, isAtomicChatPlugin } from "@/nocowboy/atomic-chat-feature"

type Log = {
  debug: (msg: string, data?: Record<string, unknown>) => void
}

const req = createRequire(import.meta.url)

export namespace NoCowboyDefaultPlugins {
  export function apply<T extends { plugin?: ConfigPlugin.Spec[]; plugin_origins?: ConfigPlugin.Origin[] }>(
    cfg: T,
    opts: { disabled: boolean; log?: Log },
  ): T {
    let plugins = cfg.plugin ?? []

    if (!opts.disabled) {
      plugins = ensureAtomicChatPlugin(plugins)
    }

    cfg.plugin = plugins
    // Built-in plugins are not loaded externally and must not wait for external plugin setup.
    const origins = cfg.plugin_origins?.filter((item) => !isAtomicChatPlugin(item.spec))
    if (!origins) return cfg
    if (opts.disabled) {
      cfg.plugin_origins = origins
      return cfg
    }
    const known = new Set(origins.map((item) => ConfigPlugin.pluginSpecifier(item.spec)))
    cfg.plugin_origins = [
      ...origins,
      ...plugins
        .filter((spec) => !isAtomicChatPlugin(spec))
        .filter((spec) => !known.has(ConfigPlugin.pluginSpecifier(spec)))
        .map((spec) => ({ spec, source: "builtin", scope: "global" as const })),
    ]
    return cfg
  }
}
