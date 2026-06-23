#!/usr/bin/env bash
set -e

export NOCOWBOY_NO_TELEMETRY="true"
export NOCOWBOY_LOG_LEVEL="silent"

# Point indexing worker to the installed LanceDB module
export NOCOWBOY_LANCEDB_PATH="file://$(pwd)/node_modules/@lancedb/lancedb/dist/index.js"

# Use bun --watch for auto-reload (handles terminal cleanup properly)
bun --watch --cwd packages/opencode --conditions=browser src/index.ts
