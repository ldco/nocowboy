/**
 * Port assignment for locally-managed MCP servers.
 *
 * NoCowboy exposes every local MCP server through a small HTTP proxy on
 * `127.0.0.1:<port>`; the port is how clients reach it. Two writers assign it:
 *
 *  - `init` / `mcp install` build the config, writing each server a `url` and
 *    picking its port as `MCP_BASE_PORT + index` over the configured server list;
 *  - `mcp start [name]` (re)starts an already-configured server and must reuse
 *    the same port.
 *
 * The configured `url` is authoritative: for a `remote` server it is literally
 * the address clients connect to (`nutausik` → 9210). A `local` (stdio) server
 * has no url, so its port falls back to its position in the global config —
 * matching `init`'s `9200 + i` and `mcp install`'s append.
 *
 * Regression this exists for: `mcp start [name]` used `9200 + results.length`,
 * so starting a *single* named server bound it to 9200 regardless of the name
 * (nutausik collided with plugin-registry's port) while clients kept dialling
 * the server's configured 9210.
 */
export const MCP_BASE_PORT = 9200

/**
 * The port an already-configured MCP server should listen on.
 *
 * @param name     server name (its key in `config.mcp`)
 * @param srv      the server's config entry, when known
 * @param allNames every configured server name, in config order (for the fallback)
 */
export function mcpServerPort(name: string, srv: unknown, allNames: string[]): number {
  if (srv && typeof srv === "object" && "url" in srv) {
    const url = (srv as { url?: unknown }).url
    if (typeof url === "string" && url.length > 0) {
      const port = Number(new URL(url).port)
      if (Number.isFinite(port) && port > 0) return port
    }
  }
  const index = allNames.indexOf(name)
  return MCP_BASE_PORT + (index >= 0 ? index : allNames.length)
}
