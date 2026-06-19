# NoCowboy TUI — Session Persistence

**Source:** `plan-fork.md` (authoritative)
**Platform:** Inherited from KiloCode — TypeScript + SQLite

---

## What We Inherit

KiloCode already provides production-tested session infrastructure:
- Session persistence (SQLite)
- Auto-compaction (old sessions compressed)
- Session pruning (old sessions deleted)
- Session resume on restart

This is inherited unchanged. The fork adds:

---

## The Guarantee

Run `nocowboy` and resume at the exact same point — same agent, same conversation, same PRD story mid-execution, same input buffer, same layout. No handoff file. No re-explaining.

| Scenario | Without NoCowboy | With NoCowboy |
|----------|-----------------|---------------|
| Terminal window closed | ❌ Lost | ✅ Resume |
| PC crash / power loss | ❌ Lost | ✅ Resume |
| Process killed (OOM) | ❌ Lost | ✅ Resume |
| Agent running 2 hours, mid-PRD | ❌ Start over | ✅ Resume |
| Switch between projects | ❌ Start over | ✅ Resume |

---

## What Resumes

| State | Resumes? | How |
|-------|----------|-----|
| Conversation history | ✅ Full | Inherited KiloCode session store |
| Active agent | ✅ | Inherited |
| Active PRD story | ✅ | ralph state file (file-based state offload) |
| Input buffer | ✅ | Inherited session snapshot |
| Layout (panel sizes) | ✅ | Saved to nocowboy.json |
| LLM mid-streaming | ⚠️ Partial | Inherited — partial response shown, retry available |
| Pending tool call | ✅ | Re-issued on resume |
| MCP connections | ❌ Reconnected | MCP servers are external — re-establish on resume |
| File state (git status) | ❌ Re-read | Filesystem is source of truth |
| Score | ✅ | Re-computed on resume if stale |

---

## Project Switching

```
Ctrl+Shift+P → "Switch project" → type path
  → Save current session
  → Load or create session for new project
  → Resume from that project's last state
```

Sessions stored per-project: `~/.local/share/nocowboy/sessions/<project-hash>/`

---

## Session Browser Panel

The session browser (right panel, `Ctrl+H`) shows all past chat sessions organized by date:

```
📅 Today
  ▼ "Add auth to Next.js" (3 prompts)
    ▸ "How do I add NextAuth?"
    ▸ "Is there middleware needed?"
    ▸ "Add CSRF too"
  ▸ "Fix login bug" (2 prompts)
  ▸ "Refactor database layer"
📅 Yesterday
  ▸ "Setup CI/CD pipeline"
  ▸ "Review PRD for user-auth"
```

Click a prompt → navigates main chat to that point in history.

---

## Checkpoint System

```
/checkpoint "before user auth implementation"
  → Creates git checkpoint (tag + stash)
  → Saves session snapshot
  → Rollback: /restore
```

---

## Disk Management

KiloCode's existing auto-compaction and pruning is inherited. Additional NoCowboy config:

```json
{
  "session": {
    "archiveAfterDays": 90,
    "deleteAfterDays": 365,
    "maxSessions": 50
  }
}
```

---

## Implementation

- **Inherit** KiloCode's SQLite session store, auto-compaction, and prune logic
- **Add** session browser panel (accordion by date, prompt navigation)
- **Add** checkpoint/restore commands (`/checkpoint`, `/restore`)
- **Add** per-project session storage with project hash isolation
- **Config** via `nocowboy.json` (not a separate session config file)
