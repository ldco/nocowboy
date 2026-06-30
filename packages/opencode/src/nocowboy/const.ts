import { InstallationVersion } from "@opencode-ai/core/installation/version"

export const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://kilocode.ai",
  "X-Title": "NoCowboy", // nocowboy_change - TODO: replace with own service
  "User-Agent": `Kilo-Code/${InstallationVersion}`,
}
