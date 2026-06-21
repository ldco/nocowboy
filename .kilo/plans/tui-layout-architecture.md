# TUI Layout Architecture — Deep Technical Reference

**Status:** Architecture Analysis  
**Scope:** Popup windows, sidebar, screen system, plugin slots, state management  
**Goal:** Enable framework-level reuse of layout components in custom screens without dirty hacks

---

## Table of Contents

1. [Rendering Framework](#1-rendering-framework)
2. [Component Tree & Provider Hierarchy](#2-component-tree--provider-hierarchy)
3. [Layout Composition (App Component)](#3-layout-composition-app-component)
4. [Screen System](#4-screen-system)
5. [Route System (Within Chat Screen)](#5-route-system-within-chat-screen)
6. [Dialog / Popup System](#6-dialog--popup-system)
7. [Sidebar System](#7-sidebar-system)
8. [Plugin Slot System](#8-plugin-slot-system)
9. [State Management Patterns](#9-state-management-patterns)
10. [Focus Management](#10-focus-management)
11. [Z-Ordering / Layering](#11-z-ordering--layering)
12. [UI Primitives Catalog](#12-ui-primitives-catalog)
13. [Data Access Patterns](#13-data-access-patterns)
14. [HOW-TO: Create a New Screen](#14-how-to-create-a-new-screen)
15. [HOW-TO: Create a New Dialog/Popup](#15-how-to-create-a-new-dialogpopup)
16. [HOW-TO: Add Sidebar Content via Plugin](#16-how-to-add-sidebar-content-via-plugin)
17. [HOW-TO: Embed Sidebar Data in a Custom Screen](#17-how-to-embed-sidebar-data-in-a-custom-screen)
18. [HOW-TO: Toggle Sidebar Programmatically](#18-how-to-toggle-sidebar-programmatically)
19. [Complete File Index](#19-complete-file-index)
20. [Anti-Patterns to Avoid](#20-anti-patterns-to-avoid)

---

## 1. Rendering Framework

| Property | Value |
|---|---|
| Framework | **OpenTUI** (`@opentui/core` + `@opentui/solid`) |
| Reactive layer | **SolidJS** (not React) |
| Keymap system | `@opentui/keymap` + `@opentui/keymap/solid` |
| NOT Ink/React | Despite `keywords: ["ink"]` in package.json, this is **OpenTUI + SolidJS** |

JSX renders to terminal elements (`<box>`, `<text>`, `<scrollbox>`, `<input>`, `<textarea>`). The renderer is created via `createCliRenderer()` from `@opentui/core` and mounted via `render()` from `@opentui/solid`.

```
Entry point: packages/opencode/src/cli/cmd/tui/app.tsx

  const renderer = await createCliRenderer(rendererConfig(input.config))
  render(<ErrorBoundary fallback={...}><App /></ErrorBoundary>, renderer)
```

**Key implications:**
- Components are SolidJS functional components (no classes, no React hooks)
- Reactivity via `createSignal()`, `createMemo()`, `createStore()`, `createEffect()`
- Conditional rendering via `<Show>`, `<Switch>/<Match>`, `<For>`
- No CSS — all styling is via props (`flexDirection`, `backgroundColor`, `fg`, `attributes`)
- Colors are `RGBA` objects, not CSS strings

---

## 2. Component Tree & Provider Hierarchy

The TUI has a deeply nested provider tree (17+ layers). Understanding this is critical because **every context is available to any component below it**.

```
tui()  →  createCliRenderer  →  render()
  └── ErrorBoundary
      └── OpencodeKeymapProvider          ← Keybinding system
          └── ArgsProvider                ← CLI arguments (--continue, --model, etc.)
              └── ExitProvider            ← Application exit lifecycle
                  └── KVProvider          ← Persistent key-value store (file-backed)
                      └── ToastProvider   ← Toast notifications (non-modal)
                          └── RouteProvider   ← Screen navigation (home/session/plugin)
                              └── TuiConfigProvider  ← Resolved tui.json config
                                  └── SDKProvider      ← HTTP client to backend
                                      └── ProjectProvider  ← Project/workspace info
                                          └── SyncProvider     ← ALL backend data (reactive)
                                              └── SyncProviderV2  ← V2 event sync
                                                  └── ThemeProvider     ← Colors, themes
                                                      └── LocalProvider     ← User preferences
                                                          └── PromptStashProvider
                                                              └── DialogProvider     ← POPUP SYSTEM
                                                                  └── CommandPaletteProvider
                                                                      └── FrecencyProvider
                                                                          └── PromptHistoryProvider
                                                                              └── PromptRefProvider
                                                                                  └── EditorContextProvider
                                                                                      └── ScreenProvider   ← NoCowboy screen tabs
                                                                                          └── <App />
```

**Key takeaway:** Any component rendered inside `<App />` has access to ALL contexts via their respective `use*()` hooks.

---

## 3. Layout Composition (App Component)

**File:** `app.tsx:923–978`

The `<App />` component defines the visual layout:

```
┌────────────────────────────────────────────────────┐
│  <TopBar />                                  (h=1) │
├────────────────────────────────────────────────────┤
│                                                    │
│  <box flexGrow=1>  ← main content area             │
│                                                    │
│    IF screen === "chat":                           │
│      route.type === "home"    → <Home />           │
│      route.type === "session" → <Session />        │
│      (+ plugin routes)                             │
│                                                    │
│    IF screen === "info":                           │
│      → <InfoScreen />                              │
│                                                    │
│    ELSE:                                           │
│      → placeholder text: "{Screen} view"           │
│                                                    │
├────────────────────────────────────────────────────┤
│  <BottomBar />                               (h=1) │
└────────────────────────────────────────────────────┘
│  <TuiPluginRuntime.Slot name="app" />              │  ← plugin extension point
│  <StartupLoading />                                │  ← loading overlay
└────────────────────────────────────────────────────┘
```

**Actual JSX structure:**

```tsx
<box width={dimensions().width} height={dimensions().height}
     flexDirection="column" backgroundColor={theme.background}>
  <Show when={ready()}>
    <box flexGrow={1} minHeight={0} flexDirection="column">
      <ScreenProvider>
        <TopBar />
        <box flexGrow={1} minHeight={0} flexDirection="column">
          <Show when={screen() === "chat"}>
            <Switch>
              <Match when={route.data.type === "home"}><Home /></Match>
              <Match when={route.data.type === "session"}><Session /></Match>
            </Switch>
            {plugin()}
          </Show>
          <Show when={screen() !== "chat"}>
            <Show when={screen() === "info"}>
              <InfoScreen />
            </Show>
            <Show when={screen() !== "info"}>
              {/* placeholder */}
            </Show>
          </Show>
        </box>
        <BottomBar />
      </ScreenProvider>
    </box>
    <TuiPluginRuntime.Slot name="app" />
  </Show>
  <StartupLoading ready={ready} />
</box>
```

---

## 4. Screen System

**Files:**
- `packages/opencode/src/nocowboy/components/nocowboy-bars.tsx` — ScreenProvider, TopBar, BottomBar
- `packages/opencode/src/cli/cmd/tui/app.tsx` — Screen rendering logic

### Architecture

The screen system is a NoCowboy addition that adds **tab-based navigation** on top of OpenCode's route system.

**State:**
```ts
// nocowboy-bars.tsx:68
const [screen, setScreen] = createSignal<Screen>("chat")
```

**Type:**
```ts
export type Screen = string  // "chat" | "api" | "git" | "db" | "files" | "edit" | "settings" | "info" | "history"
```

**Available screens (tab buttons):**
```ts
const buttons = [
  { key: "chat",     label: "Chat" },
  { key: "api",      label: "API" },
  { key: "git",      label: "Git" },
  { key: "db",       label: "DB" },
  { key: "files",    label: "Files" },
  { key: "edit",     label: "Edit" },
  { key: "settings", label: "Settings" },
  { key: "info",     label: "Info" },
  { key: "history",  label: "History" },
]
```

**Context access:**
```ts
const { screen, setScreen } = useScreen()
// Read: screen() → "chat"
// Write: setScreen("info")
```

**Global access (from outside component tree):**
```ts
import { setScreenFromModule } from "@/nocowboy/components/nocowboy-bars"
setScreenFromModule("info")
```

**Currently implemented screens:**
| Screen Key | Implementation | Status |
|---|---|---|
| `chat` | `<Home />` or `<Session />` via route | ✅ Full |
| `info` | `<InfoScreen />` | ✅ Basic (3 rows of metadata) |
| `api` | Placeholder text | ❌ Not implemented |
| `git` | Placeholder text | ❌ Not implemented |
| `db` | Placeholder text | ❌ Not implemented |
| `files` | Placeholder text | ❌ Not implemented |
| `edit` | Placeholder text | ❌ Not implemented |
| `settings` | Placeholder text | ❌ Not implemented |
| `history` | Placeholder text | ❌ Not implemented |

### Adding a New Screen

1. Add to `buttons[]` array in `nocowboy-bars.tsx`
2. Add a `<Show when={useScreen().screen() === "myscreen"}>` block in `app.tsx:958–968`
3. Render your component inside the `<Show>`

---

## 5. Route System (Within Chat Screen)

**File:** `packages/opencode/src/cli/cmd/tui/context/route.tsx`

The route system handles **within-screen** navigation for the chat screen. It's independent of the screen tabs.

**Route types:**
```ts
type Route = HomeRoute | SessionRoute | PluginRoute | KiloClawRoute

type HomeRoute    = { type: "home"; prompt?: PromptInfo }
type SessionRoute = { type: "session"; sessionID: string; prompt?: PromptInfo }
type PluginRoute  = { type: "plugin"; id: string; data?: Record<string, unknown> }
type KiloClawRoute = { type: "kilo-claw" }
```

**Access:**
```ts
const route = useRoute()
route.data          // reactive Route object
route.navigate({ type: "session", sessionID: "abc123" })
route.back()        // NoCowboy addition: returns to previous route
```

**Plugin routes:** Plugins can register custom routes via `api.route.register(name, renderFn)`. These appear within the chat screen when `route.data.type === "plugin"`.

---

## 6. Dialog / Popup System

**File:** `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx`

### Architecture

The dialog system is a **stack-based modal overlay**. One dialog can be open at a time (replace semantics), with focus save/restore.

### State

```ts
const [store, setStore] = createStore({
  stack: [] as { element: JSX.Element; onClose?: () => void }[],
  size: "medium" as "medium" | "large" | "xlarge",
})
```

### API (`useDialog()`)

| Method | Purpose |
|---|---|
| `dialog.replace(element, onClose?)` | Clear stack, push one dialog. Saves & blurs current focus. |
| `dialog.clear()` | Close all dialogs, fire all `onClose` callbacks, restore focus. |
| `dialog.setSize(size)` | Set dialog width: `"medium"` (60 cols), `"large"` (88 cols), `"xlarge"` (116 cols). |
| `dialog.stack` | Reactive read of the dialog stack. `stack.length > 0` means a dialog is open. |
| `dialog.size` | Reactive read of current size setting. |

### Visual Rendering

```
┌─────────────────────── full screen ───────────────────────┐
│                                                           │
│  Semi-transparent overlay: RGBA(0, 0, 0, 150)            │
│  position="absolute", zIndex={3000}                      │
│                                                           │
│       ┌──────── dialog panel ─────────┐                   │
│       │ backgroundColor: theme.       │                   │
│       │   backgroundPanel             │                   │
│       │ width: 60 | 88 | 116          │                   │
│       │ maxWidth: terminal.width - 2  │                   │
│       │ paddingTop: 1                 │                   │
│       │                               │                   │
│       │  {children — your content}    │                   │
│       │                               │                   │
│       └───────────────────────────────┘                   │
│                                                           │
│  Click outside panel → dialog.clear()                    │
│  Escape / Ctrl+C → pop top dialog, restore focus         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Available Dialog Components

#### Primitive Dialogs (in `ui/`)

| Component | File | Purpose | Static helper |
|---|---|---|---|
| `Dialog` | `ui/dialog.tsx` | Base container (overlay + panel) | — |
| `DialogSelect` | `ui/dialog-select.tsx` | Fuzzy-searchable list picker | — |
| `DialogConfirm` | `ui/dialog-confirm.tsx` | Yes/No confirmation | `DialogConfirm.show(dialog, title, msg) → Promise<boolean|undefined>` |
| `DialogPrompt` | `ui/dialog-prompt.tsx` | Text input | `DialogPrompt.show(dialog, title, placeholder) → Promise<string|null>` |
| `DialogAlert` | `ui/dialog-alert.tsx` | Information display with OK | — |
| `DialogExportOptions` | `ui/dialog-export-options.tsx` | Export config | — |
| `DialogHelp` | `ui/dialog-help.tsx` | Keybinding reference | — |

#### Feature Dialogs (in `component/`)

| Component | File | Purpose |
|---|---|---|
| `DialogModel` | `component/dialog-model.tsx` | Model selection |
| `DialogAgent` | `component/dialog-agent.tsx` | Agent selection |
| `DialogMcp` | `component/dialog-mcp.tsx` | MCP server toggles |
| `DialogSessionList` | `component/dialog-session-list.tsx` | Session browser |
| `DialogSessionRename` | `component/dialog-session-rename.tsx` | Rename session |
| `DialogStatus` | `component/dialog-status.tsx` | System status |
| `DialogThemeList` | `component/dialog-theme-list.tsx` | Theme picker |
| `DialogProvider` | `component/dialog-provider.tsx` | Provider connection |
| `DialogVariant` | `component/dialog-variant.tsx` | Model variant picker |
| `DialogConsoleOrg` | `component/dialog-console-org.tsx` | Org switcher |
| `DialogRetryAction` | `component/dialog-retry-action.tsx` | Rate limit retry |
| `DialogWorkspaceCreate` | `component/dialog-workspace-create.tsx` | Create workspace |
| `DialogWorkspaceFileChanges` | `component/dialog-workspace-file-changes.tsx` | File changes |
| `DialogStash` | `component/dialog-stash.tsx` | Prompt stash |
| `DialogTag` | `component/dialog-tag.tsx` | Tag management |
| `DialogSkill` | `component/dialog-skill.tsx` | Skill picker |

#### Session Dialogs (in `routes/session/`)

| Component | File | Purpose |
|---|---|---|
| `DialogMessage` | `routes/session/dialog-message.tsx` | Message actions |
| `DialogSubagent` | `routes/session/dialog-subagent.tsx` | Subagent viewer |
| `DialogTimeline` | `routes/session/dialog-timeline.tsx` | Timeline jump |
| `DialogForkFromTimeline` | `routes/session/dialog-fork-from-timeline.tsx` | Fork from timeline |

### Opening Patterns

```ts
// Pattern 1: Simple replace
const dialog = useDialog()
dialog.replace(() => <MyCustomDialog />)

// Pattern 2: With cleanup callback
dialog.replace(() => <MyDialog />, () => {
  console.log("dialog closed")
})

// Pattern 3: Promise-based (blocking)
const confirmed = await DialogConfirm.show(dialog, "Delete?", "This cannot be undone")
if (confirmed) { /* proceed */ }

// Pattern 4: With size
dialog.setSize("large")
dialog.replace(() => <MyWideDialog />)
```

### Toast System (non-modal notifications)

**File:** `ui/toast.tsx`

```ts
const toast = useToast()
toast.show({ message: "Saved!", variant: "success", duration: 3000 })
toast.show({ message: "Error!", variant: "error" })
toast.dismiss()
```

Renders at `position="absolute"`, `top=2`, `right=2`. Auto-dismisses after `duration`.

---

## 7. Sidebar System

**Files:**
- `routes/session/sidebar.tsx` — Sidebar component shell
- `routes/session/index.tsx:270–297` — Visibility logic
- `routes/session/index.tsx:757–769` — Toggle command
- `routes/session/index.tsx:1439–1458` — Rendering

### Architecture

The sidebar is a **42-column panel** attached to the right side of the Session view. It is **only available within the Session screen** — it does NOT render on Home or other screens.

### Visibility Logic

```ts
// session/index.tsx:274-295
const [sidebar, setSidebar] = kv.signal<"auto" | "hide">("sidebar", "hide")     // persisted
const [sidebarOpen, setSidebarOpen] = createSignal(false)                         // transient

const wide = createMemo(() => dimensions().width > 120)

const sidebarVisible = createMemo(() => {
  if (session()?.parentID) return false        // Hidden for subagent sessions
  if (sidebarOpen()) return true               // Explicitly toggled open
  if (sidebar() === "auto" && wide()) return false  // NoCowboy: never auto-shows
  return false
})
```

**Default:** Hidden. User toggles via command palette or keybind.

### Rendering Modes

**Wide terminal (>120 columns):** Sidebar renders inline as a flexbox sibling.
```
┌────────────────────────┬──────────────┐
│                        │              │
│  Chat messages         │   Sidebar    │
│  (flexGrow=1)          │   (w=42)     │
│                        │              │
│  Prompt input          │              │
│                        │              │
└────────────────────────┴──────────────┘
```

**Narrow terminal (≤120 columns):** Sidebar renders as an absolute overlay.
```
┌────────────────────────────────────────┐
│  ┌── overlay: RGBA(0,0,0,70) ──────┐  │
│  │                     ┌──────────┐│  │
│  │  Chat messages      │ Sidebar  ││  │
│  │  (behind overlay)   │ (w=42)   ││  │
│  │                     │          ││  │
│  │                     └──────────┘│  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Sidebar Component Structure

```tsx
// sidebar.tsx
<box backgroundColor={theme.backgroundPanel} width={42} height="100%"
     paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2}
     position={props.overlay ? "absolute" : "relative"}>

  <scrollbox flexGrow={1}>
    <box flexShrink={0} gap={1} paddingRight={1}>
      <TuiPluginRuntime.Slot name="sidebar_title" mode="single_winner"
                              session_id={props.sessionID} title={...} share_url={...}>
        {/* default: session title + workspace label + share URL */}
      </TuiPluginRuntime.Slot>

      <TuiPluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} />
    </box>
  </scrollbox>

  <box flexShrink={0} gap={1} paddingTop={1}>
    <TuiPluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
      {/* default: NoCowboy branding */}
    </TuiPluginRuntime.Slot>
  </box>
</box>
```

### Sidebar Content Plugins

Content is injected via the slot system. Each plugin registers a renderer for `sidebar_content`:

| Plugin | File | Order | Content Shown |
|---|---|---|---|
| Context | `feature-plugins/sidebar/context.tsx` | 100 | Token count, % used, cost |
| Todo | `feature-plugins/sidebar/todo.tsx` | 400 | Todo items from assistant |
| Files | `feature-plugins/sidebar/files.tsx` | 500 | Modified files with +/- line counts |
| MCP | `feature-plugins/sidebar/mcp.tsx` | — | MCP server status |
| LSP | `feature-plugins/sidebar/lsp.tsx` | — | Language server status |
| Footer | `feature-plugins/sidebar/footer.tsx` | 100 | Path, version, getting started |

NoCowboy additions:
| Plugin | Content |
|---|---|
| `KiloSidebarFooter` | NoCowboy branding |
| `KiloSidebarUsage` | Usage statistics |
| `KiloSidebarBackgroundProcesses` | Background process list |
| `KiloSidebarIndexing` | Indexing status |
| `KiloSidebarPr` | PR info |

### Toggle Command

```ts
// session/index.tsx:757-769
{
  title: sidebarVisible() ? "Hide sidebar" : "Show sidebar",
  value: "session.sidebar.toggle",
  category: "Session",
  run: () => {
    batch(() => {
      const isVisible = sidebarVisible()
      setSidebar(() => (isVisible ? "hide" : "auto"))
      setSidebarOpen(!isVisible)
    })
    dialog.clear()
  },
}
```

---

## 8. Plugin Slot System

**Files:**
- `plugin/slots.tsx` — Slot rendering + registry setup
- `plugin/api.tsx` — Plugin API surface
- `plugin/runtime.ts` — Plugin lifecycle management
- `plugin/internal.ts` — Internal plugin registry

### How Slots Work

The slot system is **named insertion points** where plugins can inject content.

**Registration (by a plugin):**
```tsx
api.slots.register({
  order: 500,        // lower number = renders higher/first
  slots: {
    sidebar_content(_ctx, props) {
      return <MyView session_id={props.session_id} />
    },
  },
})
```

**Rendering (in the component tree):**
```tsx
<TuiPluginRuntime.Slot
  name="sidebar_content"
  mode="single_winner"     // optional
  session_id={sessionID}   // passed to slot renderers as props
>
  {/* fallback content if no plugin provides this slot */}
</TuiPluginRuntime.Slot>
```

### Slot Modes

| Mode | Behavior |
|---|---|
| (default / omitted) | All registered renderers stack vertically in `order` sequence |
| `"single_winner"` | Highest-priority plugin wins; fallback = children |
| `"replace"` | Plugin completely replaces default content |

### Known Slot Names

| Slot Name | Used In | Purpose |
|---|---|---|
| `app` | `app.tsx:974` | Global app-level extensions |
| `sidebar_title` | `sidebar.tsx:48` | Session title area (single_winner) |
| `sidebar_content` | `sidebar.tsx:84` | Main sidebar sections (stacked) |
| `sidebar_footer` | `sidebar.tsx:89` | Sidebar bottom (single_winner) |
| `session_prompt` | `session/index.tsx` | Prompt input (replace mode) |
| `session_prompt_right` | `session/index.tsx` | Right side of prompt |
| `home_prompt` | `home.tsx` | Home screen prompt (replace mode) |
| `home_prompt_right` | `home.tsx` | Right of home prompt |
| `home_bottom` | `home.tsx` | Below home prompt |
| `home_footer` | `home.tsx` | Home footer (single_winner) |

---

## 9. State Management Patterns

### Primitives Used

| Pattern | SolidJS API | Use Case |
|---|---|---|
| Local state | `createSignal()` | Boolean flags, simple values |
| Complex state | `createStore()` + `produce()` | Dialog stack, sync data |
| Derived state | `createMemo()` | Computed values from signals |
| Side effects | `createEffect()` | Scroll-to-bottom, route changes |
| Context injection | `createContext()` / `useContext()` | All providers |
| Persistent state | `kv.signal(name, default)` | UI preferences (survives sessions) |

### Context Creation Pattern

```ts
// context/helper.tsx — factory used by all contexts
export const { use: useRoute, provider: RouteProvider } = createSimpleContext({
  name: "Route",
  init: (props) => {
    const [store, setStore] = createStore<Route>(...)
    return { data: store, navigate, back }
  },
})
```

### Key State Stores

| Store | Context Hook | Manages |
|---|---|---|
| Sync store | `useSync()` | ALL server data: sessions, messages, parts, diffs, todos, processes, MCP, LSP, providers |
| Local store | `useLocal()` | User selections: current agent, model, recent models, favorites, session pins, MCP toggles |
| KV store | `useKV()` | Persistent preferences: sidebar mode, scrollbar, diff wrap, tool details, animations |
| Route store | `useRoute()` | Current view: home / session(id) / plugin(id) |
| Dialog store | `useDialog()` | Modal stack + size |
| Screen signal | `useScreen()` | Active tab: chat / info / git / etc. |
| Theme | `useTheme()` | Color palette, mode (dark/light), syntax theme |
| Project | `useProject()` | Workspace info, directory, config path |
| SDK | `useSDK()` | HTTP client to kilo serve backend |

### KV Store (Persistent UI Preferences)

```ts
const kv = useKV()

// Get/set pattern
kv.get("sidebar", "hide")       // read with default
kv.set("sidebar", "auto")       // write + persist to ~/.local/share/kilo/state/kv.json

// Signal pattern (reactive getter + setter pair)
const [sidebar, setSidebar] = kv.signal<"auto" | "hide">("sidebar", "hide")
sidebar()         // reactive read
setSidebar("auto") // write + persist
```

**Known KV keys:**
- `sidebar` → `"auto" | "hide"`
- `timestamps` → `"hide" | "show"`
- `tool_details_visibility` → `boolean`
- `assistant_metadata_visibility` → `boolean`
- `scrollbar_visible` → `boolean`
- `diff_wrap_mode` → `"word" | "none"`
- `animations_enabled` → `boolean`
- `generic_tool_output_visibility` → `boolean`

---

## 10. Focus Management

### Dialog Focus Save/Restore

When `dialog.replace()` is called:
1. `focus = renderer.currentFocusedRenderable` — saves current focus
2. `focus.blur()` — removes focus from current element
3. When dialog closes → `refocus()` — restores saved focus after 1ms delay

### Prompt Focus

The `<Prompt>` component auto-focuses its `<input>` via `ref` + `setTimeout(focus, 1)`. The `PromptRefProvider` tracks the active prompt across route changes.

### Keybinding Layers

Keybindings use `useBindings()` from `@opentui/keymap/solid` with conditional activation:

```ts
useBindings(() => ({
  enabled: someCondition,    // bindings only active when true
  commands: [...],           // command definitions
  bindings: [...],           // key-to-command mappings
}))
```

Dialog bindings (escape, ctrl+c) override app bindings when `store.stack.length > 0`.

---

## 11. Z-Ordering / Layering

| Layer | Z-Index | Component |
|---|---|---|
| Background content | 0 (default) | Home / Session view |
| Sidebar (overlay mode) | `position="absolute"` | `RGBA(0,0,0,70)` backdrop + sidebar panel |
| Toast | `position="absolute"`, top-right | Toast notifications |
| Dialog | `zIndex={3000}` | `RGBA(0,0,0,150)` backdrop + dialog panel |
| Debug overlay | renderer-level | `renderer.toggleDebugOverlay()` |

---

## 12. UI Primitives Catalog

### Terminal Elements

| Element | Purpose | Key Props |
|---|---|---|
| `<box>` | Layout container (div equivalent) | `flexDirection`, `flexGrow`, `flexShrink`, `minHeight`, `width`, `height`, `padding*`, `gap`, `backgroundColor`, `border`, `borderStyle`, `borderColor`, `position`, `alignItems`, `justifyContent`, `zIndex`, `shouldFill` |
| `<text>` | Text display | `fg` (RGBA), `attributes` (BOLD/ITALIC), `wrapMode`, `overflow`, `paddingLeft`, `minWidth` |
| `<span>` | Inline text style | `style={{ fg, bg }}` |
| `<b>` | Bold inline text | (inside `<text>`) |
| `<scrollbox>` | Scrollable container | `stickyScroll`, `stickyStart`, `scrollAcceleration`, `verticalScrollbarOptions`, `maxHeight`, `ref` |
| `<input>` | Single-line text input | `onInput`, `placeholder`, `placeholderColor`, `cursorColor`, `focusedBackgroundColor`, `ref` |
| `<textarea>` | Multi-line text input | `onSubmit`, `height`, `initialValue`, `placeholder`, `textColor`, `cursorColor` |

### Color System

```ts
import { RGBA } from "@opentui/core"

RGBA.fromHex("#ff6800")                // from hex
RGBA.fromInts(255, 104, 0)            // from RGB
RGBA.fromInts(0, 0, 0, 150)           // with alpha (overlays)
```

All colors come from the theme:
```ts
const { theme } = useTheme()
theme.background          // main background
theme.backgroundPanel     // panel/sidebar background
theme.backgroundElement   // element background
theme.text               // primary text
theme.textMuted          // secondary text
theme.primary            // brand primary
theme.secondary          // secondary
theme.accent             // accent color
theme.error / .warning / .success / .info  // semantic colors
theme.border / .borderSubtle / .borderActive  // border colors
```

### Text Formatting

```ts
import { TextAttributes } from "@opentui/core"

<text attributes={TextAttributes.BOLD} fg={theme.text}>Bold text</text>
<text attributes={TextAttributes.ITALIC} fg={theme.textMuted}>Italic text</text>
```

---

## 13. Data Access Patterns

### Backend Data (via SyncProvider)

All server-synced data lives in the `sync.data.*` reactive store:

```ts
const sync = useSync()

// Sessions
sync.session.get(sessionID)                    // Session object (title, cost, share, etc.)
sync.data.session.list                         // All sessions

// Messages
sync.data.message[sessionID]                   // Messages for a session

// Parts (message content segments)
sync.data.part[messageID]                      // Parts of a message

// File diffs
sync.data.session_diff[sessionID]              // Modified files with diffs

// Todos
sync.data.todo[sessionID]                      // Todo items

// Background processes
sync.data.background_process[sessionID]        // Running processes

// Session status
sync.data.session_status[sessionID]            // Status info

// Permissions / Questions / Suggestions
sync.data.permission[sessionID]
sync.data.question[sessionID]
sync.data.suggestion[sessionID]

// Infrastructure
sync.data.lsp                                  // LSP servers
sync.data.mcp                                  // MCP servers
sync.data.provider                             // Provider list
sync.data.agent                                // Agent list
sync.data.vcs                                  // Git VCS info (branch, etc.)
sync.data.indexing                             // Indexing status
```

### Provider/Model Data

```ts
const sync = useSync()
const local = useLocal()

// All providers with their models
sync.data.provider                             // Provider[]

// Current agent and model
local.agent.current                            // Agent name
local.model.current                            // ModelID

// Find a specific model
const providers = Model.index(sync.data.provider)
const model = providers[providerID]?.models[modelID]
```

### Project Data

```ts
const project = useProject()

project.data.instance.path.directory           // Current working directory
project.workspace.current()                    // Current workspace
project.workspace.get(workspaceID)             // Specific workspace
project.workspace.status(workspaceID)          // Workspace status
```

---

## 14. HOW-TO: Create a New Screen

### Step 1: Create the Component

```tsx
// packages/opencode/src/nocowboy/cli/cmd/tui/my-screen.tsx
import { createMemo, For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useProject } from "@tui/context/project"
import { TextAttributes, RGBA } from "@opentui/core"

export function MyScreen() {
  const { theme } = useTheme()
  const sync = useSync()
  const project = useProject()

  // Access any data from the sync store
  const sessions = createMemo(() => sync.data.session.list ?? [])
  const providers = createMemo(() => sync.data.provider ?? [])

  return (
    <box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
      <text attributes={TextAttributes.BOLD} fg={theme.primary} paddingBottom={1}>
        My Screen Title
      </text>

      {/* Label/value rows */}
      <For each={[
        { label: "Directory", value: project.data.instance.path.directory },
        { label: "Sessions", value: String(sessions().length) },
        { label: "Providers", value: String(providers().length) },
      ]}>
        {(row) => (
          <box flexDirection="row" gap={2}>
            <text fg={theme.textMuted} minWidth={14}>{row.label}:</text>
            <text fg={theme.text}>{row.value}</text>
          </box>
        )}
      </For>

      {/* Scrollable list */}
      <box paddingTop={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>Sessions:</text>
        <scrollbox flexGrow={1} maxHeight={20}>
          <For each={sessions()}>
            {(s) => (
              <text fg={theme.textMuted} paddingLeft={2}>• {s.title}</text>
            )}
          </For>
        </scrollbox>
      </box>
    </box>
  )
}
```

### Step 2: Add the Tab

In `nocowboy-bars.tsx`, add to the `buttons` array:
```ts
{ key: "myscreen", label: "MyScreen" }
```

### Step 3: Wire the Rendering

In `app.tsx:958–968`, add alongside existing `<Show>` blocks:
```tsx
<Show when={useScreen().screen() === "myscreen"}>
  <MyScreen />
</Show>
```

### Step 4: Access from Code

```ts
setScreenFromModule("myscreen")  // global access
// or
const { setScreen } = useScreen()
setScreen("myscreen")            // from within component tree
```

---

## 15. HOW-TO: Create a New Dialog/Popup

### Simple Confirmation

```tsx
const dialog = useDialog()
const confirmed = await DialogConfirm.show(dialog, "Delete Session", "This cannot be undone. Continue?")
if (confirmed) {
  // proceed with deletion
}
```

### Simple Text Input

```tsx
const result = await DialogPrompt.show(dialog, "Session Name", "Enter a name...")
if (result) {
  // use the entered text
}
```

### Custom Dialog

```tsx
function MyCustomDialog(props: { onDone: (value: string) => void }) {
  const { theme } = useTheme()
  const dialog = useDialog()
  const [value, setValue] = createSignal("")

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Confirm",
        group: "Dialog",
        cmd: () => { props.onDone(value()); dialog.clear() },
      },
    ],
  }))

  return (
    <box paddingX={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>My Dialog Title</text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>esc to close</text>
      </box>
      <text fg={theme.textMuted}>Some instructions here</text>
      <input
        onInput={(v) => setValue(v)}
        placeholder="Type something..."
        placeholderColor={theme.textMuted}
        cursorColor={theme.primary}
      />
    </box>
  )
}

// Open it:
dialog.replace(() => <MyCustomDialog onDone={(v) => console.log(v)} />)
```

### Filterable List Dialog

```tsx
dialog.replace(() => (
  <DialogSelect
    title="Pick a Provider"
    options={sync.data.provider.map(p => ({
      title: p.name,
      value: p.id,
      category: "Providers",
    }))}
    onSelect={(opt) => {
      console.log("Selected:", opt.value)
      dialog.clear()
    }}
  />
))
```

### Register as Command (appears in command palette)

```tsx
useBindings(() => ({
  commands: [{
    name: "my.custom.dialog",
    title: "Open my dialog",
    category: "Custom",
    slashName: "mydialog",       // accessible via /mydialog
    run: () => dialog.replace(() => <MyCustomDialog onDone={...} />),
  }],
  bindings: tuiConfig.keybinds.gather("app", ["my.custom.dialog"]),
}))
```

---

## 16. HOW-TO: Add Sidebar Content via Plugin

### Create a Feature Plugin

```tsx
// feature-plugins/sidebar/my-widget.tsx
import type { TuiPlugin, TuiPluginApi } from "@nocowboy/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo, Show, For } from "solid-js"

const id = "internal:sidebar-mywidget"

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current

  // Access session data
  const session = createMemo(() => props.api.state.session.get(props.session_id))
  const diffs = createMemo(() => props.api.state.session.diffs(props.session_id) ?? [])

  return (
    <Show when={diffs().length > 0}>
      <box>
        <text fg={theme().text}><b>My Widget</b></text>
        <For each={diffs()}>
          {(diff) => (
            <text fg={theme().textMuted} paddingLeft={1}>
              {diff.path} (+{diff.additions} -{diff.deletions})
            </text>
          )}
        </For>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 300,         // lower = higher in sidebar (Context=100, Todo=400, Files=500)
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: InternalTuiPlugin = { id, tui }
export default plugin
```

### Register the Plugin

Add to the internal plugin list in `plugin/internal.ts`.

---

## 17. HOW-TO: Embed Sidebar Data in a Custom Screen

The sidebar doesn't need to be visible for its data to be accessible. All sidebar data comes from `useSync()` — the same reactive store available to any component.

### Example: Info Screen with Sidebar Data Inline

```tsx
import { createMemo, For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useProject } from "@tui/context/project"
import { useLocal } from "@tui/context/local"
import { TextAttributes } from "@opentui/core"
import { Model } from "@opencode-ai/core/provider/model"

export function EnrichedInfoScreen() {
  const { theme } = useTheme()
  const sync = useSync()
  const route = useRoute()
  const project = useProject()
  const local = useLocal()

  // Get current session (same data the sidebar shows)
  const sessionID = createMemo(() =>
    route.data.type === "session" ? route.data.sessionID : null
  )
  const session = createMemo(() => {
    const id = sessionID()
    return id ? sync.session.get(id) : null
  })

  // Token/cost data (same as sidebar Context widget)
  const messages = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.message[id] ?? []) : []
  })
  const lastAssistant = createMemo(() =>
    messages().findLast((m) => m.role === "assistant" && m.tokens?.output > 0)
  )
  const tokens = createMemo(() => {
    const msg = lastAssistant()
    if (!msg) return 0
    return msg.tokens.input + msg.tokens.output + msg.tokens.reasoning
      + msg.tokens.cache.read + msg.tokens.cache.write
  })
  const cost = createMemo(() => session()?.cost ?? 0)

  // File diffs (same as sidebar Files widget)
  const diffs = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.session_diff[id] ?? []) : []
  })

  // Todos (same as sidebar Todo widget)
  const todos = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.todo[id] ?? []) : []
  })

  // MCP status (same as sidebar MCP widget)
  const mcpServers = createMemo(() => Object.entries(sync.data.mcp ?? {}))

  // Background processes
  const processes = createMemo(() => {
    const id = sessionID()
    return id ? (sync.data.background_process[id] ?? []) : []
  })

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

  return (
    <box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
      <text attributes={TextAttributes.BOLD} fg={theme.primary} paddingBottom={1}>
        Session Dashboard
      </text>

      {/* Session info */}
      <Show when={session()}>
        <box gap={1}>
          <text fg={theme.text}><b>{session()!.title}</b></text>

          {/* Context (from sidebar Context widget) */}
          <box flexDirection="row" gap={4}>
            <text fg={theme.textMuted}>Tokens: {tokens().toLocaleString()}</text>
            <text fg={theme.textMuted}>Cost: {money.format(cost())}</text>
          </box>

          {/* Modified files (from sidebar Files widget) */}
          <Show when={diffs().length > 0}>
            <text fg={theme.text} paddingTop={1}><b>Modified Files</b></text>
            <For each={diffs()}>
              {(d) => <text fg={theme.textMuted} paddingLeft={2}>• {d.path}</text>}
            </For>
          </Show>

          {/* Todos (from sidebar Todo widget) */}
          <Show when={todos().length > 0}>
            <text fg={theme.text} paddingTop={1}><b>Todos</b></text>
            <For each={todos()}>
              {(t) => <text fg={theme.textMuted} paddingLeft={2}>☐ {t.content}</text>}
            </For>
          </Show>

          {/* MCP servers */}
          <Show when={mcpServers().length > 0}>
            <text fg={theme.text} paddingTop={1}><b>MCP Servers</b></text>
            <For each={mcpServers()}>
              {([name, data]) => (
                <text fg={theme.textMuted} paddingLeft={2}>
                  {data.status === "connected" ? "●" : "○"} {name}
                </text>
              )}
            </For>
          </Show>
        </box>
      </Show>

      <Show when={!session()}>
        <text fg={theme.textMuted}>No active session. Start a chat to see session data.</text>
      </Show>
    </box>
  )
}
```

**Key insight:** The sidebar is just a **visual container** for data that lives in the sync store. You don't need the sidebar component to access its data. Any component can read `sync.data.*` directly.

---

## 18. HOW-TO: Toggle Sidebar Programmatically

### From a Session-Level Command

The sidebar toggle is a session-level command in `session/index.tsx`. To toggle it from within the session:

```ts
// Inside the session component (has access to sidebar state)
batch(() => {
  const isVisible = sidebarVisible()
  setSidebar(() => (isVisible ? "hide" : "auto"))
  setSidebarOpen(!isVisible)
})
```

### From Any Component via KV Store

The sidebar's persisted preference is in the KV store:

```ts
const kv = useKV()
kv.set("sidebar", "auto")   // show sidebar
kv.set("sidebar", "hide")   // hide sidebar
```

**Note:** This sets the *preference* but doesn't set the transient `sidebarOpen` signal. The sidebar only actually opens if `sidebarOpen()` is true OR `sidebar() === "auto" && wide()`. Since NoCowboy overrides auto-show to always return false, changing the KV alone won't toggle visibility — you need the `sidebarOpen` signal too, which is local to the Session component.

### Architectural Limitation

The sidebar is **scoped to the Session component**. It does not exist outside of `<Session />`. To have sidebar-like content on other screens, you must:

1. **Embed the data directly** (see HOW-TO #17 above) — recommended approach
2. **Extract the sidebar as a shared component** that can be mounted in any screen
3. **Use the plugin slot system** to inject content into custom screens

---

## 19. Complete File Index

### Core Layout
| File | Description |
|---|---|
| `cli/cmd/tui/app.tsx` | Root entry, provider tree, App component with layout |
| `nocowboy/components/nocowboy-bars.tsx` | ScreenProvider, TopBar, BottomBar tabs |
| `cli/cmd/tui/routes/session/index.tsx` | Session view: messages, sidebar, prompt, commands (~2651 lines) |
| `cli/cmd/tui/routes/session/sidebar.tsx` | Sidebar shell (plugin slots, 42-col panel) |
| `cli/cmd/tui/routes/home.tsx` | Home screen (prompt input) |
| `nocowboy/cli/cmd/tui/info-screen.tsx` | Info screen (metadata rows) |

### Dialog System
| File | Description |
|---|---|
| `cli/cmd/tui/ui/dialog.tsx` | Dialog provider, stack, base Dialog component |
| `cli/cmd/tui/ui/dialog-select.tsx` | Filterable list picker (fuzzy search) |
| `cli/cmd/tui/ui/dialog-confirm.tsx` | Confirmation dialog (with static `.show()`) |
| `cli/cmd/tui/ui/dialog-prompt.tsx` | Text input dialog (with static `.show()`) |
| `cli/cmd/tui/ui/dialog-alert.tsx` | Information alert dialog |
| `cli/cmd/tui/ui/dialog-help.tsx` | Keyboard shortcut reference |
| `cli/cmd/tui/ui/toast.tsx` | Non-modal toast notifications |

### Contexts (State Management)
| File | Description |
|---|---|
| `cli/cmd/tui/context/helper.tsx` | `createSimpleContext()` factory |
| `cli/cmd/tui/context/route.tsx` | Route state (home / session / plugin) |
| `cli/cmd/tui/context/sync.tsx` | Central data store synced from backend (~847 lines) |
| `cli/cmd/tui/context/local.tsx` | User-local state (agent, model, favorites) |
| `cli/cmd/tui/context/kv.tsx` | Persistent KV store (file-backed) |
| `cli/cmd/tui/context/event.ts` | SSE event bus |
| `cli/cmd/tui/context/sdk.tsx` | SDK HTTP client |
| `cli/cmd/tui/context/project.tsx` | Project/workspace info |
| `cli/cmd/tui/context/theme.tsx` | Theme provider (30+ themes) |
| `cli/cmd/tui/context/command-palette.tsx` | Command palette + slash commands |
| `cli/cmd/tui/context/editor.ts` | External editor integration |

### Plugin System
| File | Description |
|---|---|
| `cli/cmd/tui/plugin/slots.tsx` | Slot rendering + registry setup |
| `cli/cmd/tui/plugin/api.tsx` | Plugin API surface |
| `cli/cmd/tui/plugin/runtime.ts` | Plugin lifecycle |
| `cli/cmd/tui/plugin/internal.ts` | Internal plugin registry |

### Sidebar Plugins
| File | Description |
|---|---|
| `cli/cmd/tui/feature-plugins/sidebar/context.tsx` | Token count, %, cost (order: 100) |
| `cli/cmd/tui/feature-plugins/sidebar/todo.tsx` | Todo items (order: 400) |
| `cli/cmd/tui/feature-plugins/sidebar/files.tsx` | Modified files (order: 500) |
| `cli/cmd/tui/feature-plugins/sidebar/mcp.tsx` | MCP server status |
| `cli/cmd/tui/feature-plugins/sidebar/lsp.tsx` | LSP server status |
| `cli/cmd/tui/feature-plugins/sidebar/footer.tsx` | Path, version |

### Keybinding & Configuration
| File | Description |
|---|---|
| `cli/cmd/tui/keymap.tsx` | Keybinding provider and utilities |
| `cli/cmd/tui/config/keybind.ts` | Keybinding configuration schema |
| `cli/cmd/tui/config/tui.ts` | TUI config service |

---

## 20. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Correct Approach |
|---|---|---|
| Importing `sidebar.tsx` into non-session screens | Sidebar component depends on session context/props | Access `sync.data.*` directly — the data is global |
| Using `position="absolute"` for custom overlays without `zIndex` | Will render behind dialogs | Use `zIndex` (dialogs use 3000) |
| Creating state with `let` variables | Breaks SolidJS reactivity | Use `createSignal()` or `createStore()` |
| Using `useState()` / `useEffect()` | These are React hooks, not SolidJS | Use `createSignal()` / `createEffect()` |
| Hardcoding colors | Breaks theme support | Use `useTheme().theme.*` |
| Hardcoding dimensions | Breaks on different terminal sizes | Use `useTerminalDimensions()` and flexbox layout |
| Direct DOM manipulation | Not applicable in terminal UI | Use SolidJS JSX with OpenTUI elements |
| Creating context without the helper | Inconsistent with codebase patterns | Use `createSimpleContext({ name, init })` |
| Reading sync data without `createMemo()` | May cause unnecessary re-renders | Wrap derived data in `createMemo()` |

---

## Summary

The TUI layout system consists of five independent but composable layers:

1. **Screen tabs** — NoCowboy's tab navigation (ScreenProvider + BottomBar)
2. **Routes** — OpenCode's within-screen navigation (RouteProvider)
3. **Sidebar** — Session-scoped panel with plugin-injected content
4. **Dialogs** — Stack-based modal overlays (DialogProvider)
5. **Plugin slots** — Named insertion points for extensibility

**The key architectural insight:** The sidebar is not a framework-level layout primitive — it's a **Session-scoped visual container** that reads from the **global sync store**. Any component anywhere in the tree can access the same data via `useSync()`. To display sidebar-style information in a custom screen, skip the sidebar component entirely and read from `sync.data.*` directly. This is the clean, framework-level approach — no dirty hacks needed.
