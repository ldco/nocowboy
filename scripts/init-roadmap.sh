#!/usr/bin/env bash
# init-roadmap.sh — Set up the roadmap verification system in ANY project.
#
# Run: bash scripts/init-roadmap.sh
# Or:  curl -fsSL https://nocowboy.dev/init-roadmap | bash
#
# What it does:
#   1. Creates docs/roadmap.json with initial template
#   2. Copies scripts/generate-docs.ts and scripts/verify-roadmap.ts
#   3. Sets up .husky/pre-commit hook
#   4. Runs initial generation
#
# Usage: bash init-roadmap.sh [target-dir]
#   target-dir defaults to current directory

set -euo pipefail

TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"

echo "==> Setting up roadmap verification in: $TARGET"
echo ""

# ── 1. Create docs/roadmap.json ──────────────────────────────────────
mkdir -p "$TARGET/docs"
if [ ! -f "$TARGET/docs/roadmap.json" ]; then
  cat > "$TARGET/docs/roadmap.json" << 'JSONEOF'
{
  "versions": [
    { "tag": "v0.1.0", "description": "Initial release" }
  ],
  "features": [
    {
      "id": "project-setup",
      "title": "Project initialized with roadmap system",
      "status": "done",
      "version": "v0.1.0",
      "verify": [
        { "type": "file", "path": "docs/roadmap.json" }
      ]
    }
  ]
}
JSONEOF
  echo "  ✅ Created docs/roadmap.json"
else
  echo "  ⚠️  docs/roadmap.json already exists — skipping"
fi

# ── 2. Copy scripts ──────────────────────────────────────────────────
SCRIPT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$TARGET/scripts"

for script in generate-docs.ts verify-roadmap.ts; do
  if [ -f "$SCRIPT_SRC/$script" ]; then
    cp "$SCRIPT_SRC/$script" "$TARGET/scripts/$script"
    chmod +x "$TARGET/scripts/$script"
    echo "  ✅ Copied scripts/$script"
  else
    echo "  ⚠️  scripts/$script not found at $SCRIPT_SRC — downloading from nocowboy.dev..."
    curl -fsSL "https://nocowboy.dev/scripts/$script" -o "$TARGET/scripts/$script" 2>/dev/null || {
      echo "  ❌ Cannot download $script. Place it manually from the NoCowboy repo."
    }
  fi
done

# ── 3. Set up pre-commit hook ────────────────────────────────────────
mkdir -p "$TARGET/.husky"
HOOK_FILE="$TARGET/.husky/pre-commit"

# Check if already has roadmap hooks
if [ -f "$HOOK_FILE" ]; then
  if grep -q "generate-docs\|verify-roadmap" "$HOOK_FILE" 2>/dev/null; then
    echo "  ⚠️  .husky/pre-commit already has roadmap hooks — skipping"
  else
    echo "" >> "$HOOK_FILE"
    echo "# Roadmap verification" >> "$HOOK_FILE"
    echo "bun run scripts/generate-docs.ts && bun run scripts/verify-roadmap.ts" >> "$HOOK_FILE"
    echo "  ✅ Added roadmap hooks to .husky/pre-commit"
  fi
else
  cat > "$HOOK_FILE" << 'HOOKEOF'
#!/usr/bin/env bash
set -euo pipefail

# Code quality
cd "$(git rev-parse --show-toplevel)"
bun run typecheck 2>/dev/null || true

# Roadmap verification (if scripts exist)
if [ -f scripts/generate-docs.ts ] && [ -f scripts/verify-roadmap.ts ]; then
  bun run scripts/generate-docs.ts
  bun run scripts/verify-roadmap.ts
fi
HOOKEOF
  chmod +x "$HOOK_FILE"
  echo "  ✅ Created .husky/pre-commit with roadmap verification"

  # Enable husky if package.json has husky
  if grep -q "husky" "$TARGET/package.json" 2>/dev/null; then
    cd "$TARGET" && npx husky install 2>/dev/null || true
    echo "  ✅ Husky hooks installed"
  fi
fi

# ── 4. Install bun dependencies (if needed) ──────────────────────────
if [ ! -f "$TARGET/node_modules/.package-lock.json" ] && [ -f "$TARGET/package.json" ]; then
  echo "  ℹ️  Run 'bun install' if script dependencies are missing"
fi

# ── 5. Run initial generation ────────────────────────────────────────
echo ""
echo "==> Running initial generation..."
cd "$TARGET"

if [ -f node_modules/.bun ]; then
  bun run scripts/generate-docs.ts 2>/dev/null || npx tsx scripts/generate-docs.ts 2>/dev/null || echo "  ⚠️  Run 'bun install' then 'bun run scripts/generate-docs.ts'"
elif command -v bun &>/dev/null; then
  bun run scripts/generate-docs.ts 2>/dev/null && bun run scripts/verify-roadmap.ts 2>/dev/null || echo "  ⚠️  Run 'bun install' first"
else
  echo "  ⚠️  bun not found. Run 'bun run scripts/generate-docs.ts' after installing bun"
fi

echo ""
echo "==> Done! See docs/ROADMAP.md, docs/CHANGELOG.md, docs/BACKLOG.md"
echo "==> Next: edit docs/roadmap.json to track your project features"
