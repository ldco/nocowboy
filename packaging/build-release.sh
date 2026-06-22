#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

VERSION="${1:-0.4.0}"
RELEASE_DIR="releases/v${VERSION}"
ARCHIVE="nocowboy-linux-x64.tar.gz"
PKG="nocowboy-${VERSION}-1-x86_64.pkg.tar.zst"

echo "=== Building NoCowboy v${VERSION} ==="

# Step 1: Build binary (cross-compiles all platforms)
echo "--- Building binary ---"
cd packages/opencode
bun run build
cd "$APP_DIR"
echo "Binaries built (Linux + macOS + Windows)."

# Step 2: Create release directory + macOS archives
echo "--- Creating macOS archives ---"
mkdir -p "${RELEASE_DIR}"
for target in darwin-arm64; do
  bin_dir="packages/opencode/dist/nocowboy-tui-${target}/bin"
  if [ -f "${bin_dir}/nocowboy" ]; then
    mkdir -p "/tmp/ncb-mac-${target}"
    cp "${bin_dir}/nocowboy" "/tmp/ncb-mac-${target}/"
    cp install.sh "/tmp/ncb-mac-${target}/"
    cp -r packaging/config "/tmp/ncb-mac-${target}/config"
    cp -r packaging/launchd "/tmp/ncb-mac-${target}/launchd"
    cd "/tmp/ncb-mac-${target}"
    zip -rq "${APP_DIR}/${RELEASE_DIR}/nocowboy-${target}.zip" .
    cd "$APP_DIR"
    rm -rf "/tmp/ncb-mac-${target}"
    echo "  nocowboy-${target}.zip"
  fi
done

# Step 3: Create source archive for Arch makepkg
echo "--- Creating Arch source archive ---"
mkdir -p /tmp/ncb-arch
cp packages/opencode/dist/nocowboy-tui-linux-x64/bin/nocowboy /tmp/ncb-arch/
cp -r packaging/config /tmp/ncb-arch/config
cp -r packaging/mcp-servers /tmp/ncb-arch/mcp-servers
cp -r packaging/systemd /tmp/ncb-arch/systemd
cp install.sh /tmp/ncb-arch/
cd /tmp/ncb-arch
tar -czf "${APP_DIR}/packaging/aur/${ARCHIVE}" .
cd "$APP_DIR"
rm -rf /tmp/ncb-arch
echo "Arch source archive created."

# Step 4: Build .pkg.tar.zst
echo "--- Building .pkg.tar.zst ---"
cd packaging/aur
makepkg -f --noconfirm 2>&1
cd "$APP_DIR"
echo ".pkg.tar.zst built."

# Step 5: Copy to releases
echo "--- Copying to releases ---"
mkdir -p "${RELEASE_DIR}"
cp "packaging/aur/${PKG}" "${RELEASE_DIR}/"
echo "Copied ${PKG} to ${RELEASE_DIR}/"

# Step 6: Stop KiloCode MCPs (free ports for NoCowboy)
echo "--- Stopping KiloCode MCPs (freeing ports) ---"
for svc in kilo-mcp-constitution kilo-mcp-contract-guard kilo-mcp-ncp-validator \
           kilo-mcp-puppetmaster kilo-mcp-ralph kilo-mcp-score-engine \
           kilo-mcp-context7 kilo-mcp-git kilo-mcp-puppeteer kilo-mcp-sqlite \
           kilo-mcp-tausik kilo-mcp-hooks kilo-mcp-orchestrator \
           kilo-mcp-plugin-registry kilo-mcp-session-memory kilo-mcp-team-coordinator; do
  systemctl --user stop "$svc" 2>/dev/null || true
  systemctl --user disable "$svc" 2>/dev/null || true
done
systemctl --user daemon-reload
echo "KiloCode MCPs stopped."

# Step 7: Install on system
echo "--- Installing on system ---"
sudo pacman -U --noconfirm "${RELEASE_DIR}/${PKG}"
echo "=== v${VERSION} installed ==="
