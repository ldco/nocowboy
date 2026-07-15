import { cmd } from "./cmd"
import { RepoMap } from "@/nocowboy/repomap"

export const RepoMapCommand = cmd({
  command: "repomap",
  describe: "generate a repository map (Aider-style)",
  builder: (yargs: any) =>
    yargs
      .option("max-lines", { type: "number", default: 50 })
      .option("dir", { type: "string" }),
  handler(args: any) {
    const root = args.dir || process.cwd()
    const map = RepoMap.generate(root, args.maxLines)
    process.stdout.write(map + "\n")
  },
})
