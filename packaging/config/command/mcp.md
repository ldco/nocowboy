---
description: Search and install MCP servers from the registry
---

# /mcp — MCP Server Manager

Search, install, and manage MCP servers from the NoCowboy registry.

## Usage

```
/mcp search <query>          — search available MCP servers
/mcp install <name>          — install an MCP server
/mcp list                    — list installed MCP servers
/mcp remove <name>           — uninstall an MCP server
```

## Steps

1. **Search** — `plugin_search(query: "<query>")` to find MCP servers in the registry
2. **Show results** — display name, description, version, author for each result
3. **Install** — if user chooses one, `plugin_install(name: "<name>")` to install
4. **Verify** — confirm the server was added to the config

## Example

```
/mcp search database
→ Found:
  • sqlite (mcp-sqlite-server) — SQLite database access
  • turso — Turso edge database

/mcp install sqlite
→ Installed sqlite MCP server. Enabled in nocowboy.json.
```
