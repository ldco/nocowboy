/**
 * nocowboy_change — tracks whether a session currently has a tool execution in flight.
 *
 * A tool the model is blocked on (`question` waiting for the user, a permission prompt, or any
 * long-running command) keeps the AI SDK's stream open with no provider events. The idle watchdog
 * cannot tell that apart from a stalled provider, so it aborted healthy turns after the idle
 * budget — measured 2026-09-15: the default 300s silently killed every turn that asked a question,
 * and the user's answers arrived after the turn had already been aborted.
 *
 * The tool wrapper in `session/prompt.ts` marks the session busy for the duration of each
 * execution; `session/processor.ts` passes {@link isBusy} into the LLM stream so the idle timeout
 * re-arms instead of aborting while a tool is running.
 */
export namespace ToolBusy {
  const counts = new Map<string, number>()

  export function enter(sessionID: string) {
    counts.set(sessionID, (counts.get(sessionID) ?? 0) + 1)
  }

  export function leave(sessionID: string) {
    const next = (counts.get(sessionID) ?? 0) - 1
    if (next > 0) counts.set(sessionID, next)
    else counts.delete(sessionID)
  }

  export function isBusy(sessionID: string) {
    return (counts.get(sessionID) ?? 0) > 0
  }
}
