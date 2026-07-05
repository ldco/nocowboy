---
description: Run commands in an isolated Docker sandbox for safety
---

# /sandbox-docker — Docker Sandbox Mode

Execute commands inside a Docker container for isolation. Prevents AI changes from affecting your host system.

## Prerequisites

- Docker installed: `docker --version`
- Docker running: `docker info`

## How It Works

1. A temporary Docker container is created from a base image (ubuntu, python, node, etc.)
2. The current project directory is mounted into the container
3. All commands run inside the container
4. When done, the container is removed

## Steps

1. **Check Docker** — verify it's available:
   ```bash
   docker info > /dev/null 2>&1 && echo "Docker OK" || echo "Docker not running"
   ```

2. **Pull image** — pull the appropriate base image:
   ```bash
   docker pull ubuntu:latest  # or node:22, python:3.12, rust:latest
   ```

3. **Run command** — execute in an isolated container:
   ```bash
   docker run --rm -v "$(pwd):/workspace" -w /workspace ubuntu:latest <command>
   ```

4. **Clean up** — the `--rm` flag removes the container automatically

## Example

```bash
# Run tests in an isolated Node.js container
docker run --rm -v "$(pwd):/workspace" -w /workspace node:22 npm test

# Build in a Rust container
docker run --rm -v "$(pwd):/workspace" -w /workspace rust:latest cargo build
```

## Rules

- Always use `--rm` for automatic cleanup
- Mount only the current project directory
- Never use `--privileged` or unsafe flags
- Check Docker availability before each sandboxed command
