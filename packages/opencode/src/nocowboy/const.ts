import { InstallationVersion } from "@opencode-ai/core/installation/version"

export const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://nocowboy.dev",
  "X-Title": "NoCowboy",
  "User-Agent": `NoCowboy/${InstallationVersion}`,
}
