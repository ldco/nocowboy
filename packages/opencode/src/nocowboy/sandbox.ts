import { spawn } from "node:child_process"

// nocowboy_change — Docker sandbox utility
//
// Provides Docker-wrapped shell execution for isolated command running.
// The sandbox checks Docker availability and wraps bash commands in
// `docker run --rm -v $(pwd):/workspace -w /workspace <image>`.

const SANDBOX_IMAGES: Record<string, string> = {
  node: "node:22",
  python: "python:3.12",
  rust: "rust:latest",
  go: "golang:latest",
  ubuntu: "ubuntu:latest",
  default: "ubuntu:latest",
}

export interface SandboxOptions {
  /** Base image to use (e.g. "node", "python", "ubuntu") */
  image?: string
  /** Working directory inside container (default: /workspace) */
  workdir?: string
}

/**
 * Wrap a command for Docker sandbox execution.
 * Returns the docker run command string.
 */
export function wrapCommand(command: string, options: SandboxOptions = {}): string {
  const image = SANDBOX_IMAGES[options.image ?? "default"] ?? SANDBOX_IMAGES.default
  const workdir = options.workdir ?? "/workspace"

  return [
    "docker run --rm",
    `-v "$(pwd):${workdir}"`,
    `-w "${workdir}"`,
    image,
    `bash -c ${JSON.stringify(command)}`,
  ].join(" ")
}

/**
 * Check if Docker is available on this system.
 */
export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("docker", ["info"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    const timeout = setTimeout(() => {
      proc.kill()
      resolve(false)
    }, 5000)
    proc.on("exit", (code) => {
      clearTimeout(timeout)
      resolve(code === 0)
    })
    proc.on("error", () => {
      clearTimeout(timeout)
      resolve(false)
    })
  })
}
