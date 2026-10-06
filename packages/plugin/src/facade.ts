/**
 * Plugin hook facade — the versioned, supported subset of the plugin hook
 * surface.
 *
 * The `Hooks` interface in `./index` is broad and partly experimental: some
 * entries are upstream opencode hooks we inherit, some are NoCowboy additions.
 * A plugin author should not have to guess which of them the engine actually
 * dispatches. This facade pins the hooks we guarantee, with a version to bump on
 * a breaking change, and a contract test (`test/plugin/hook-facade.test.ts`)
 * that proves each one is wired in the engine.
 *
 * `session.stop` is called out separately: it is an **adapter seam**. Blocking a
 * turn needs the harness half (a synthetic continuation), so a generic upstream
 * engine without that half cannot honour it — it must never be assumed.
 */

import type { Hooks } from "./index.js"

/** Bump on a breaking change to the supported hook surface. */
export const HOOK_FACADE_VERSION = "1.0.0"

/**
 * The hook surface the facade officially supports. Every entry is dispatched by
 * the engine and covered by the facade contract test; anything absent is out of
 * contract and may change without notice.
 */
export const SUPPORTED_HOOKS = [
  "tool.definition",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.chat.system.transform",
  "experimental.session.compacting",
  "experimental.compaction.autocontinue",
  "session.stop",
] as const satisfies readonly (keyof Hooks)[]

export type SupportedHook = (typeof SUPPORTED_HOOKS)[number]

/**
 * Hooks that are an explicit NoCowboy adapter seam: the engine guarantees to
 * dispatch them, so plugins must not assume any generic upstream engine does.
 *
 * `session.stop` needs the harness half (the synthetic continuation in
 * `nocowboy/session/stop-hooks`) to have any effect — it is a seam of our adapter,
 * not a free-standing upstream hook.
 */
export const ADAPTER_SEAM_HOOKS = ["session.stop"] as const satisfies readonly SupportedHook[]

/** True when `name` is part of the supported hook surface. */
export function isSupportedHook(name: string): name is SupportedHook {
  return (SUPPORTED_HOOKS as readonly string[]).includes(name)
}
