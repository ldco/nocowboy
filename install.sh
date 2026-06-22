#!/usr/bin/env bash
set -euo pipefail

APP=nocowboy
INSTALL_DIR="${HOME}/.nocowboy/bin"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/${APP}"
VERSION="0.4.0"

MUTED='\033[0;90m'
RED='\033[0;31m'
NC='\033[0m'

# Self-contained — this script lives inside the release archive.
# The archive also contains: nocowboy (binary) + config/ directory
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

# --- Binary ---
if [[ -f "${SCRIPT_DIR}/nocowboy" ]]; then
  mkdir -p "${INSTALL_DIR}"
  cp "${SCRIPT_DIR}/nocowboy" "${INSTALL_DIR}/"
  chmod 755 "${INSTALL_DIR}/nocowboy"
  echo -e "${MUTED}Installed nocowboy to ${INSTALL_DIR}/nocowboy${NC}"
else
  echo -e "${RED}Error: nocowboy binary not found alongside install.sh${NC}"
  echo "Extract the full archive and run install.sh from the extracted directory."
  exit 1
fi

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
