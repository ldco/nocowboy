import { NoCowboyMarkdown } from "../config/markdown"

export namespace KilocodeInstruction {
  // nocowboy_change start - content() takes the markdown trust options so untrusted project instruction
  // files cannot resolve {env:} or read files outside the project scope (upstream 032f3bb).
  export function content(text: string, item: string, options: NoCowboyMarkdown.Options) {
    return NoCowboyMarkdown.substitute(text, item, options)
  }
  // nocowboy_change end
}
