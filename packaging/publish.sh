#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../packages/opencode"

VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")

# A release must be labelled with its own package.json version. Without this,
# NOCOWBOY_VERSION inherited from the parent process (e.g. a running NoCowboy
# TUI built from an older release) silently overrides script/build.ts and the
# binary reports the parent's version.
export NOCOWBOY_VERSION="$VERSION"

echo "=== Typecheck ==="
bun run typecheck
echo "Typecheck OK"

echo "=== Build ==="
bun run build
echo "Build OK"

echo ""
echo "Ready to publish ${NAME} v${VERSION}"
echo "Run: cd $(pwd) && npm publish --access public"
echo ""
echo "Примечание: npm login должен быть выполнен заранее."
