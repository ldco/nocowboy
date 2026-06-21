# Sidebar Tabs Plan

## Goal
Replace separate Info/History screens with tabs inside the sidebar panel.

## Architecture
The sidebar (42-col panel) gets 3 tabs at the top:

```
┌──────────────────────────────────┐
│ Info │ History │ Settings         │  ← tab bar (h=1)
├──────────────────────────────────┤
│                                  │
│  Tab content (scrollable)        │
│                                  │
│                                  │
├──────────────────────────────────┤
│ • NoCowboy 0.1.0-dev             │  ← footer
└──────────────────────────────────┘
```

### Info Tab (default)
Restore original Kilo Code sidebar content exactly:
- Plugin slots: sidebar_title, sidebar_content, sidebar_footer
- Context widget (tokens, %, cost)
- Todo widget
- Files widget (modified files)
- MCP widget
- LSP widget
- NoCowboy branded footer

### History Tab
Session list (like DialogSessionList but inline):
- Fetch from sync.data.session or sdk.client.experimental.session.list
- Show session title, timestamp
- Click to navigate to session
- Show pinned sessions at top

### Settings Tab
Empty placeholder for now.

## Files to Change

| File | Change |
|---|---|
| `routes/session/sidebar.tsx` | Restore original + add tab system |
| `nocowboy/components/nocowboy-bars.tsx` | Remove Info and History from bottom bar |
| `cli/cmd/tui/app.tsx` | Remove InfoScreen and History screen rendering |
| `nocowboy/cli/cmd/tui/info-screen.tsx` | Can be deleted after tabs work |

## Implementation Steps

1. Restore sidebar.tsx from git (commit ca721a26f)
2. Add createSignal for active tab
3. Render tab bar at top with clickable labels
4. Wrap original sidebar content in Show when={tab() === "info"}
5. Create History tab content component
6. Create Settings tab placeholder
7. Remove Info/History from bottom bar buttons
8. Remove InfoScreen from app.tsx rendering
