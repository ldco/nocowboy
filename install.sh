#!/usr/bin/env bash
set -euo pipefail

APP=nocowboy
INSTALL_DIR="${HOME}/.nocowboy/bin"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/${APP}"
VERSION="0.7.3"

MUTED='\033[0;90m'
RED='\033[0;31m'
NC='\033[0m'

# Self-contained — this script lives inside the release archive.
# The archive also contains: nocowboy (binary), its runtime sidecars
# (tree-sitter/, models-snapshot.json, proxy-standalone.mjs) and config/.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<EOF
NoCowboy ${VERSION} installer

Usage:
  ./install.sh              Install nocowboy binary + default config
  ./install.sh --help       Show this help

The install script is bundled inside the release archive.
Extract the archive and run ./install.sh from the extracted directory.
EOF
  exit 0
}

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && usage

# --- Binary + runtime sidecars ---
if [[ ! -f "${SCRIPT_DIR}/nocowboy" ]]; then
  echo -e "${RED}Error: nocowboy binary not found alongside install.sh${NC}"
  echo "Extract the full archive and run install.sh from the extracted directory."
  exit 1
fi

# The archive carries the sidecar list produced by the build from
# RELEASE_SIDECARS. Reading it avoids a second hard-coded copy drifting out of
# sync with the build.
MANIFEST="${SCRIPT_DIR}/sidecars.manifest"
if [[ ! -f "${MANIFEST}" ]]; then
  echo -e "${RED}Error: sidecars.manifest is missing from the archive${NC}"
  echo "This archive is incomplete; extract a full release archive and rerun install.sh."
  exit 1
fi

sidecars=()
while IFS= read -r line || [[ -n "${line}" ]]; do
  [[ -z "${line}" ]] && continue
  sidecars+=("${line}")
done < "${MANIFEST}"

if [[ ${#sidecars[@]} -eq 0 ]]; then
  echo -e "${RED}Error: sidecars.manifest lists no runtime sidecars${NC}"
  exit 1
fi

for sidecar in "${sidecars[@]}"; do
  if [[ ! -e "${SCRIPT_DIR}/${sidecar}" ]]; then
    echo -e "${RED}Error: ${sidecar} is missing from the archive${NC}"
    exit 1
  fi
done

# Stage everything first so a failed copy never touches the installed version.
mkdir -p "${INSTALL_DIR}"
staging="${INSTALL_DIR}/.install-$$"
rm -rf "${staging}"
mkdir -p "${staging}"
trap 'rm -rf "${staging}"' EXIT

cp "${SCRIPT_DIR}/nocowboy" "${staging}/nocowboy"
chmod 755 "${staging}/nocowboy"
for sidecar in "${sidecars[@]}"; do
  cp -r "${SCRIPT_DIR}/${sidecar}" "${staging}/${sidecar}"
done

# Swap sidecars first and the binary last: if the swap is interrupted, the
# previous executable is still in place instead of a new binary without WASMs.
for sidecar in "${sidecars[@]}"; do
  rm -rf "${INSTALL_DIR:?}/${sidecar}"
  mv "${staging}/${sidecar}" "${INSTALL_DIR}/${sidecar}"
done
mv "${staging}/nocowboy" "${INSTALL_DIR}/nocowboy"

echo -e "${MUTED}Installed nocowboy to ${INSTALL_DIR}/nocowboy${NC}"

# --- PATH ---
case ":${PATH}:" in
  *:"${INSTALL_DIR}":*) ;;
  *)
    shell_config=""
    case "${SHELL}" in
      */zsh) shell_config="${HOME}/.zshrc" ;;
      */bash) shell_config="${HOME}/.bashrc" ;;
    esac
    if [[ -n "${shell_config}" ]]; then
      echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "${shell_config}"
      echo -e "${MUTED}Added ${INSTALL_DIR} to PATH in ${shell_config}${NC}"
    fi
    export PATH="${INSTALL_DIR}:${PATH}"
    ;;
esac

# --- Default config (agents, commands, instructions, skills) ---
CFG_SRC="${SCRIPT_DIR}/config"
if [[ -d "${CFG_SRC}" ]]; then
  mkdir -p "${CONFIG_DIR}"
  cp -r "${CFG_SRC}/agent" "${CONFIG_DIR}/agent" 2>/dev/null || true
  cp -r "${CFG_SRC}/command" "${CONFIG_DIR}/command" 2>/dev/null || true
  cp -r "${CFG_SRC}/instructions" "${CONFIG_DIR}/instructions" 2>/dev/null || true
  cp -r "${CFG_SRC}/skills" "${CONFIG_DIR}/skills" 2>/dev/null || true
  if [[ -f "${CFG_SRC}/nocowboy.json" ]]; then
    cp "${CFG_SRC}/nocowboy.json" "${CONFIG_DIR}/"
  fi
  echo -e "${MUTED}Installed default config to ${CONFIG_DIR}/${NC}"
else
  echo -e "${RED}Warning: config/ directory not found — no agents/commands/skills installed${NC}"
fi

# --- macOS: install launchd plists ---
PLIST_SRC="${SCRIPT_DIR}/launchd"
if [[ -d "${PLIST_SRC}" ]] && [[ "$(uname)" == "Darwin" ]]; then
  mkdir -p "${HOME}/Library/LaunchAgents"
  for plist in "${PLIST_SRC}"/*.plist; do
    cp "$plist" "${HOME}/Library/LaunchAgents/"
    launchctl load "${HOME}/Library/LaunchAgents/$(basename "$plist")" 2>/dev/null || true
  done
  echo -e "${MUTED}Installed MCP LaunchAgents to ~/Library/LaunchAgents/${NC}"
fi

echo ""
echo -e "${MUTED}NoCowboy ${VERSION} installed.${NC}"
echo -e "${MUTED}Run 'nocowboy' to start.${NC}"
