export const Npm = {
  name: "@nocowboy/cli",
  path: "@nocowboy%2fcli",
}

export const Brew = {
  name: "kilo",
  tap: "Kilo-Org/tap",
  formula: "Kilo-Org/tap/kilo",
  api: "https://formulae.brew.sh/api/formula/kilo.json",
}

export const Choco = {
  name: "kilo",
  api: "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27kilo%27%20and%20IsLatestVersion&$select=Version",
}

export const Scoop = {
  name: "kilo",
  manifest: "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/kilo.json",
}

export const Release = {
  api: "https://api.github.com/repos/Kilo-Org/kilocode/releases/latest",
  install: "", // nocowboy_change - TODO: replace with own service, was: "https://nocowboy.dev/install"
}
