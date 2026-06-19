#!/usr/bin/env bash
set -e
echo "Installing NoCowboy TUI dependencies..."

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)
    if command -v apt &>/dev/null; then
      sudo apt install -y lazygit xh lazysql nnn neovim viu 2>/dev/null || true
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y lazygit xh lazysql nnn neovim viu 2>/dev/null || true
    elif command -v brew &>/dev/null; then
      brew install lazygit xh lazysql nnn neovim viu 2>/dev/null || true
    fi
    ;;
  Darwin)
    if command -v brew &>/dev/null; then
      brew install lazygit xh lazysql nnn neovim viu 2>/dev/null || true
    fi
    ;;
esac

# Check what's missing
for tool in lazygit xh lazysql nnn nvim; do
  if command -v "$tool" &>/dev/null; then
    echo "  ✅ $tool"
  else
    echo "  ⚠ $tool — install manually (not found in package manager)"
  fi
done
