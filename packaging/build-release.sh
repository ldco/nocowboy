#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

VERSION="${1:-0.3.5}"
RELEASE_DIR="releases/v${VERSION}"
ARCHIVE="nocowboy-linux-x64.tar.gz"
PKG="nocowboy-${VERSION}-1-x86_64.pkg.tar.zst"

echo "=== Building NoCowboy v${VERSION} ==="

# Step 1: Build binary
echo "--- Building binary ---"
cd packages/opencode
bun run build
cd "$APP_DIR"
echo "Binary built."

# Step 2: Create source archive for makepkg
echo "--- Creating source archive ---"
mkdir -p /tmp/ncb-release
cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy /tmp/ncb-release/
cp -r packaging/config /tmp/ncb-release/config
cp -r packaging/mcp-servers /tmp/ncb-release/mcp-servers
cp -r packaging/systemd /tmp/ncb-release/systemd
cp install.sh /tmp/ncb-release/
cd /tmp/ncb-release
tar -czf "${APP_DIR}/packaging/aur/${ARCHIVE}" .
cd "$APP_DIR"
rm -rf /tmp/ncb-release
echo "Source archive created."

# Step 3: Build .pkg.tar.zst
echo "--- Building .pkg.tar.zst ---"
cd packaging/aur
makepkg -f --noconfirm 2>&1
cd "$APP_DIR"
echo ".pkg.tar.zst built."

# Step 4: Copy to releases
echo "--- Copying to releases ---"
mkdir -p "${RELEASE_DIR}"
cp "packaging/aur/${PKG}" "${RELEASE_DIR}/"
echo "Copied to ${RELEASE_DIR}/"

# Step 5: Install on system
echo "--- Installing on system ---"
sudo pacman -U --noconfirm "${RELEASE_DIR}/${PKG}"
echo "=== v${VERSION} installed ==="
