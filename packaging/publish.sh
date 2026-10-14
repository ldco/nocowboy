#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../packages/opencode"

VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")

# The build stamps its own version from packages/opencode/package.json. That file
# is the single source of truth: script/build.ts resolves the version itself and
# never reads NOCOWBOY_VERSION from the environment, so a stale value inherited
# from a running TUI can no longer leak into a freshly built binary.

# script/build.ts only stamps NOCOWBOY_BUILD_KIND='release', bundles the
# distribution archives and refreshes ~/.nocowboy/bin/nocowboy inside the
# `if (Script.release)` branch, which is gated on this variable. Without it
# `bun run release` silently produced a source build and the installed binary
# stayed on the previous version.
export NOCOWBOY_RELEASE=true

echo "=== Typecheck ==="
bun run typecheck
echo "Typecheck OK"

echo "=== Build ==="
bun run build
echo "Build OK"

echo ""
echo "Ready to publish ${NAME} v${VERSION}"
# A prerelease (1.0.0-alpha) must be published under its own dist-tag: npm
# refuses `publish` for a prerelease without --tag, and using the default
# `latest` would hand prerelease code to everyone running `npm i nocowboy-tui`.
if [[ "$VERSION" == *-* ]]; then
  NPM_TAG="${VERSION#*-}"
  NPM_TAG="${NPM_TAG%%.*}"
  echo "Run: cd $(pwd) && npm publish --access public --tag ${NPM_TAG}"
  echo "     (prerelease: install with \`npm i -g ${NAME}@${NPM_TAG}\`)"
else
  echo "Run: cd $(pwd) && npm publish --access public"
fi
echo ""
echo "Примечание: npm login должен быть выполнен заранее."
