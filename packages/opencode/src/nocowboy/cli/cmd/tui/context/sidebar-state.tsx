import { createSignal } from "solid-js"

// Module-level signal — no component owner needed for simple state.
// Consumers: TopBar (no useScreen), app.tsx overlay (inside ScreenProvider).
// BottomBar cannot read this signal (has useScreen, loses context on ownerless re-render).
export const [sidebarOpen, setSidebarOpen] = createSignal(false)

export function toggle(): void {
  setSidebarOpen((prev) => !prev)
}
