import { createNocowboyClient, type NocowboyClient } from "@nocowboy/sdk/v2"
import { Filesystem } from "@/util/filesystem"
import { DaemonClient } from "@/nocowboy/daemon/client"

export namespace KiloRunDaemon {
  export type Input = {
    directory?: string
    execute: (client: NocowboyClient) => Promise<void>
  }

  export async function attach(input: Input) {
    const daemon = await DaemonClient.maybe()
    if (!daemon) return false
    const dir = input.directory ?? Filesystem.resolve(process.cwd())
    const client = createNocowboyClient({ baseUrl: daemon.url, directory: dir, headers: daemon.headers })
    await input.execute(client)
    return true
  }
}
