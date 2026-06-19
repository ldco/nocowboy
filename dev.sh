#!/usr/bin/env bash
set -e

export NOCOWBOY_NO_TELEMETRY="true"
export NOCOWBOY_LOG_LEVEL="silent"

# Use bun --watch for auto-reload (handles terminal cleanup properly)
bun --watch --cwd packages/opencode --conditions=browser src/index.ts
