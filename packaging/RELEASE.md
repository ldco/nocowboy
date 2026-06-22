# Release process (private repo, self-contained archives)

The release archive is fully self-contained — no external downloads, no GitHub dependency.

## 1. Update version

Edit version in:
- `packaging/aur/PKGBUILD` — `pkgver`
- `packaging/homebrew/nocowboy.rb` — `version`

## 2. Update framework

Bundle the latest framework from the live config:

```bash
cp -r ~/.config/nocowboy/agent packaging/framework/
cp -r ~/.config/nocowboy/command packaging/framework/
cp -r ~/.config/nocowboy/instructions packaging/framework/
cp -r ~/.config/nocowboy/skills packaging/framework/
cp ~/.config/nocowboy/nocowboy.json packaging/framework/
```

## 3. Build

```bash
NOCOWBOY_RELEASE=true NOCOWBOY_VERSION=0.3.10 bun run build
```

Produces in `dist/`:
- `nocowboy-linux-x64.tar.gz`
- `nocowboy-linux-arm64.tar.gz`
- `nocowboy-darwin-x64.zip`
- `nocowboy-darwin-arm64.zip`

Each archive contains: `nocowboy` (binary) + `install.sh` + `framework/`.

## 4. Upload archives

Upload archives to your distribution endpoint. Update the download URLs in:
- `packaging/aur/PKGBUILD` — `source_x86_64` / `source_aarch64`
- `packaging/homebrew/nocowboy.rb` — `url` blocks

## 5. Update package checksums (AUR)

```bash
curl -sL https://your-distribution-host/v0.3.10/nocowboy-linux-x64.tar.gz | sha256sum
curl -sL https://your-distribution-host/v0.3.10/nocowboy-linux-arm64.tar.gz | sha256sum
```

Update `sha256sums` in `packaging/aur/PKGBUILD`.

## 6. Publish

- **AUR**: `makepkg --printsrc > .SRCINFO && git commit && git push aur master`
- **Homebrew**: commit and push the updated formula
