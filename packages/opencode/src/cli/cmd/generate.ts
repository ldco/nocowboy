import { Server } from "../../server/server"
import type { CommandModule } from "yargs"

type Args = {}

export const GenerateCommand = {
  command: "generate",
  builder: (yargs) => yargs,
  handler: async () => {
    const specs = (await Server.openapi()) as {
      info: { title: string; description: string } // nocowboy_change
      paths: Record<string, Record<string, any>>
    }
    // nocowboy_change start
    specs.info.title = "nocowboy"
    specs.info.description = "nocowboy api"
    // nocowboy_change end
    for (const item of Object.values(specs.paths)) {
      for (const method of ["get", "post", "put", "delete", "patch"] as const) {
        const operation = item[method]
        if (!operation?.operationId) continue
        operation["x-codeSamples"] = [
          // nocowboy_change start
          {
            lang: "js",
            source: [
              `import { createNocowboyClient } from "@nocowboy/sdk`,
              ``,
              `const client = createNocowboyClient()`,
              `await client.${operation.operationId}({`,
              `  ...`,
              `})`,
            ].join("\n"),
          },
          // nocowboy_change end,
        ]
      }
    }
    const raw = JSON.stringify(specs, null, 2)
      // nocowboy_change start - replace upstream product name in all descriptions
      .replaceAll("OpenCode", "NoCowboy")
      .replaceAll("opencode.local", "nocowboy.local")
      .replaceAll("opencode serve", "nocowboy serve")
      .replaceAll("https://opencode.ai/", "https://kilo.ai/")
    // nocowboy_change end

    // Format through prettier so output is byte-identical to committed file
    // regardless of whether ./script/format.ts runs afterward.
    const prettier = await import("prettier")
    const babel = await import("prettier/plugins/babel")
    const estree = await import("prettier/plugins/estree")
    const format = prettier.format ?? prettier.default?.format
    const json = await format(raw, {
      parser: "json",
      plugins: [babel.default ?? babel, estree.default ?? estree],
      printWidth: 120,
    })

    // Wait for stdout to finish writing before process.exit() is called
    await new Promise<void>((resolve, reject) => {
      process.stdout.write(json, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  },
} satisfies CommandModule<object, Args>
