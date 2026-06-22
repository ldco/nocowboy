# Release workflow (private repo, self-contained archives)

The release archive is fully self-contained — no external downloads, no GitHub dependency.

## Build a release

```bash
NOCOWBOY_RELEASE=true NOCOWBOY_VERSION=0.3.9 bun run build
```

Output in `dist/`:
```
nocowboy-linux-x64.tar.gz     → binary + install.sh + framework/
nocowboy-linux-arm64.tar.gz
nocowboy-darwin-x64.zip
nocowboy-darwin-arm64.zip
```

Each archive contains:
- `nocowboy` — compiled binary
- `install.sh` — runs from the extracted directory, copies binary + framework
- `framework/` — agents, commands, instructions, skills, `nocowboy.json`

## Distribute

Upload the archive to your distribution channel (cloud storage, email, internal server).
The recipient extracts and runs `./install.sh` — no internet connection needed after download.

## Update framework before release

The framework files live in `packaging/framework/`. Update them from the live config before building:

```bash
cp ~/.config/nocowboy/agent/*.md packaging/framework/agent/
cp ~/.config/nocowboy/command/*.md packaging/framework/command/
cp ~/.config/nocowboy/instructions/*.md packaging/framework/instructions/
cp -r ~/.config/nocowboy/skills/* packaging/framework/skills/
cp ~/.config/nocowboy/nocowboy.json packaging/framework/
```
