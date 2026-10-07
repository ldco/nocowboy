/**
 * InputPort — a testable button-propagation and navigation contract for the
 * own TUI buttons.
 *
 * The bottom bar used to inline each button's navigation (`setScreen(key)`) and
 * its mouse handling (`evt.preventDefault?.(); onClick()`) across the upstream
 * component, so the propagation/navigation rules lived inside JSX and could not
 * be tested. This port centralizes them: the screen order, wrap-around
 * navigation, which mouse buttons count as a click, and the active/select rules
 * are plain functions.
 *
 * Pure and injectable: `createButtonPort` takes the current screen and a setter,
 * so behaviour is unit-testable without the renderer.
 */

export const BUILTIN_SCREENS = ["chat"] as const
export const APP_SCREENS = ["api", "git", "db", "files", "edit"] as const
export const SCREEN_ORDER = [...BUILTIN_SCREENS, ...APP_SCREENS] as const
export type ScreenKey = (typeof SCREEN_ORDER)[number]

/** Human labels for the bottom-bar buttons. */
export const SCREEN_LABELS: Record<ScreenKey, string> = {
  chat: "Chat",
  api: "API",
  git: "Git",
  db: "DB",
  files: "Files",
  edit: "Edit",
}

/** A mouse button: the renderer reports a number (0=left,1=middle,2=right); a name is also accepted. */
export type MouseButton = number | string | undefined

/** Only the primary (left) button is a click; anything else propagates. */
export function isClick(button: MouseButton): boolean {
  return button === undefined || button === 0 || button === "left"
}

export function screenIndex(current: ScreenKey, order: readonly ScreenKey[] = SCREEN_ORDER): number {
  return order.indexOf(current)
}

/** The next screen, wrapping at the end. */
export function nextScreen(current: ScreenKey, order: readonly ScreenKey[] = SCREEN_ORDER): ScreenKey {
  const index = screenIndex(current, order)
  if (index < 0) return order[0] ?? current
  return order[(index + 1) % order.length]!
}

/** The previous screen, wrapping at the start. */
export function prevScreen(current: ScreenKey, order: readonly ScreenKey[] = SCREEN_ORDER): ScreenKey {
  const index = screenIndex(current, order)
  if (index < 0) return order[0] ?? current
  return order[(index - 1 + order.length) % order.length]!
}

export interface ButtonPort {
  readonly order: readonly ScreenKey[]
  /** Is this the screen currently shown? */
  active(key: ScreenKey): boolean
  /** Switch to `key` (no-op when already active). */
  select(key: ScreenKey): void
  /** Move to the next/previous screen. */
  move(direction: "next" | "prev"): void
  /**
   * Handle a mouse-down. Returns whether the event was consumed — the caller
   * calls `preventDefault` only when consumed, so right/middle clicks propagate.
   */
  click(input: { button?: MouseButton; key: ScreenKey }): { handled: boolean }
}

export function createButtonPort(input: {
  screen: () => ScreenKey
  setScreen: (screen: ScreenKey) => void
  order?: readonly ScreenKey[]
}): ButtonPort {
  const order = input.order ?? SCREEN_ORDER
  return {
    order,
    active(key) {
      return input.screen() === key
    },
    select(key) {
      if (input.screen() === key) return
      input.setScreen(key)
    },
    move(direction) {
      const current = input.screen()
      input.setScreen(direction === "next" ? nextScreen(current, order) : prevScreen(current, order))
    },
    click({ button, key }) {
      if (!isClick(button)) return { handled: false }
      if (input.screen() !== key) input.setScreen(key)
      return { handled: true }
    },
  }
}
