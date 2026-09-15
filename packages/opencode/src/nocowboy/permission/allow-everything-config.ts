/**
 * Pure helper shared by the permission service and the TUI.
 *
 * A global "allow everything" opt-in (YOLO) is stored in config as
 * `permission: { "*": { "*": "allow" } }` (the object form), or with the
 * scalar shorthand `permission: { "*": "allow" }`. Anything else (including
 * the `null` written when disabling) is not an allow-everything grant.
 */
export function isAllowEverythingConfig(permission: unknown): boolean {
  if (typeof permission !== "object" || permission === null) return false
  const wildcard = (permission as Record<string, unknown>)["*"]
  if (typeof wildcard === "string") return wildcard === "allow"
  if (typeof wildcard === "object" && wildcard !== null) {
    return (wildcard as Record<string, unknown>)["*"] === "allow"
  }
  return false
}
