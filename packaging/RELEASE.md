# 1. Create a GithHub release
git tag v0.3.8
git push origin v0.3.8
gh release create v0.3.8 --title "v0.3.8" --notes "Release notes here"

# 2. Build archives and upload (run on Linux for Linux builds, macOS for macoS builds)
NOCOWBOY_RELEASE=true bun run build

# 3. Update SHA256 in PKGBUILD and Homebrew formula
# After upload, get the checksums:
curl -sL https://github.com/ldco/nocowboy/releases/download/v0.3.8/nocowboy-linux-x64.tar.gz | sha256sum
curl -sL https://github.com/ldco/nocowboy/releases/download/v0.3.8/nocowboy-linux-arm64.tar.gz | sha256sum
curl -sL https://github.com/ldco/nocowboy/releases/download/v0.3.8/nocowboy-darwin-x64.zip | sha256sum
curl -sL https://github.com/ldco/nocowboy/releases/download/v0.3.8/nocowboy-darwin-arm64.zip | sha256sum
# Update packaging/aur/PKGBUILD and packaging/homebrew/nocowboy.rb with actual hashes

# 4. On Arch Linux: install from AUR
# yay -S nocowboy
# Or manually:
# cd packaging/aur && makepkg -si

# 5. On macoS: install from Homebrew
# brew tap ldco/nocowboy
# brew install nocowboy
# Or manually:
# curl -sL https://github.com/ldco/nocowboy/releases/download/v0.3.8/nocowboy-darwin-arm64.zip -o /tmp/nocowboy.zip
# unzip /tmp/nocowboy.zip -d /tmp/nocowboy
# cp /tmp/nocowboy/nocowboy /usr/local/bin/

# 6. On any Linux: install script
# curl -fsSL https://github.com/ldco/nocowboy/releases/latest/download/install | bash
# Or with version:
# curl -fsSL https://github.com/ldco/nocowboy/releases/latest/download/install | bash -s -- --version 0.3.8
# Or from local build:
# ./install --binary dist/nocowboy-tui-linux-x64/bin/nocowboy
