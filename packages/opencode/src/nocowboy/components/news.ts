export interface KilocodeNotification {
  id: string
  title: string
  message: string
}

export namespace News {
  export function unread(items: KilocodeNotification[], read: unknown): KilocodeNotification[] {
    if (!read || !Array.isArray(read)) return items
    const set = new Set(read.filter((id): id is string => typeof id === "string"))
    return items.filter((item) => !set.has(item.id))
  }

  export function read(items: KilocodeNotification[], existing: unknown[]): string[] {
    const set = new Set(existing.filter((id): id is string => typeof id === "string"))
    for (const item of items) set.add(item.id)
    return [...set]
  }
}
