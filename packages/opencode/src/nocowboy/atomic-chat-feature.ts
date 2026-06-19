// NoCowboy: removed @kilocode/plugin-atomic-chat dependency. Stubbed out.
type PluginSpec = string | [string, Record<string, unknown>]

export function isAtomicChatPlugin(_item: PluginSpec): boolean {
  return false
}

export function hasAtomicChatPlugin(_plugins: readonly PluginSpec[]): boolean {
  return false
}

export function ensureAtomicChatPlugin(items: readonly PluginSpec[]): PluginSpec[] {
  return [...items]
}
