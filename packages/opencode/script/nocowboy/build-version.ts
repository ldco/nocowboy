// nocowboy_change - new file
//
// A build is stamped with the version declared in packages/opencode/package.json
// — the single source of truth for the product version.
//
// It must NEVER be read from the environment. NOCOWBOY_VERSION is inherited by
// shell tools spawned from a running TUI, so building inside that shell used to
// bake the *parent* binary's version into a freshly compiled binary: a source
// tree at 1.3.0 produced a binary reporting 1.0.9-alpha. package.json is
// authoritative; the environment is not consulted.

export function resolveBuildVersion(packageVersion: string | undefined): string {
  const version = packageVersion?.trim()
  if (!version) {
    throw new Error("build: package.json is missing a version — cannot stamp the build")
  }
  return version
}
