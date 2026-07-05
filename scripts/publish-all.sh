#!/bin/bash
# publish-all.sh — Publish all @nocowboy packages to npm
#
# Prerequisites:
#   1. npm org @nocowboy exists (create at https://www.npmjs.com/org/create)
#   2. npm login with owner permissions on @nocowboy
#   3. You're in the project root
#
# Usage:
#   ./scripts/publish-all.sh [--dry-run]

set -euo pipefail

DRY_RUN="${1:+--dry-run}"

echo "==> Publishing @nocowboy MCP packages..."

for dir in packaging/mcp-servers/*/; do
  pkg=$(basename "$dir")
  echo ""
  echo "==> $pkg"
  cd "$dir"
  npm run build 2>/dev/null || true
  npm publish --access public $DRY_RUN
  cd - >/dev/null
done

echo ""
echo "==> Publishing nocowboy-tui..."
cd packages/opencode
npm publish $DRY_RUN

echo ""
echo "All packages published."
