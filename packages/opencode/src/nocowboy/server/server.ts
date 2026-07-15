// Kilo-specific overrides for the server control plane.
// Imported by ../../server/server.ts with minimal nocowboy_change markers.

/** Additional CORS origin check for *.nocowboy.ai */
export function corsOrigin(input: string): string | undefined {
  if (/^https:\/\/([a-z0-9-]+\.)*nocowboy\.ai$/.test(input)) {
    return input
  }
  return undefined
}

export const DOC_TITLE = "nocowboy"
export const DOC_DESCRIPTION = "nocowboy api"
