declare global {
  const NOCOWBOY_VERSION: string
  const NOCOWBOY_CHANNEL: string
  const NOCOWBOY_BUILD_KIND: string // kilocode_change
}

export const InstallationVersion = typeof NOCOWBOY_VERSION === "string" ? NOCOWBOY_VERSION : (process.env.NOCOWBOY_VERSION ?? "0.3.0-dev")
export const InstallationChannel = typeof NOCOWBOY_CHANNEL === "string" ? NOCOWBOY_CHANNEL : (process.env.NOCOWBOY_CHANNEL ?? "local")
export const InstallationLocal = InstallationChannel === "local"
// kilocode_change start - distinguish release builds from source / local builds
export const InstallationBuildKind: "source" | "release" =
  typeof NOCOWBOY_BUILD_KIND === "string" && NOCOWBOY_BUILD_KIND === "release" ? "release" : "source"
// kilocode_change end
