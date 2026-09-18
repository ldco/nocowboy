# NUTAUSIK Auto-Wiring: fetchContext, onSessionCreated, fetchCoherenceCheck

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
No description available.

## Key files
- `packages/opencode/src/nocowboy/nutausik-client.ts`
- `packages/opencode/src/session/session.ts`

## Startup ordering: the proxy must be up before MCP connects

The NUTAUSIK MCP entry is `type: "remote"` at `http://127.0.0.1:9210/mcp`; the
proxy is a local process. The proxy used to be started only on session creation
(`onSessionCreated`), while the MCP client connects at instance startup — ~1s
after boot and, on a fresh TUI, up to a minute before the first session exists.
The client failed once ("Unable to connect. Is the computer able to access the
url?") and never retried, leaving the session with no `nutausik_*` tools.

Fixes:
- `packages/opencode/src/nocowboy/bootstrap.ts` starts the proxy from
  `NocowboyBootstrap.init` and `ensureNutausikRunning()` now waits (bounded, 8s)
  until the port answers, so MCP state is built against a listening proxy.
- `hasNutausik()` no longer caches a negative probe, so a probe taken while the
  proxy was still starting cannot pin the server as dead for 30s.

Regression: `packages/opencode/test/nocowboy/nutausik-client.test.ts`.

## Verification
- File existence: ✅ not tracked
- Attestation for overseer: ✅ not required
