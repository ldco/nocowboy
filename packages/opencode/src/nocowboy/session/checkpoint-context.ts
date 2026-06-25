export type CheckpointContext = {
  priorTitles: Set<string>
  expectedRevisions: { id: string; expectedText: string }[]
}

const store = new Map<string, CheckpointContext>()

function key(sessionID: string, actorID: string): string {
  return `${sessionID}:${actorID}`
}

export function set(sessionID: string, actorID: string, ctx: CheckpointContext): void {
  store.set(key(sessionID, actorID), ctx)
}

export function get(sessionID: string, actorID: string): CheckpointContext | undefined {
  const ctx = store.get(key(sessionID, actorID))
  if (!ctx) return undefined
  return structuredClone(ctx)
}

export function remove(sessionID: string, actorID: string): void {
  store.delete(key(sessionID, actorID))
}

export function _reset(): void {
  store.clear()
}

export function _size(): number {
  return store.size
}
