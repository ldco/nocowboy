const counts = new Map<string, number>()

export namespace TaskGateState {
  export function get(sessionID: string): number {
    return counts.get(sessionID) ?? 0
  }

  export function bump(sessionID: string): number {
    const next = (counts.get(sessionID) ?? 0) + 1
    counts.set(sessionID, next)
    return next
  }

  export function clear(sessionID: string): void {
    counts.delete(sessionID)
  }
}
