import { NoCowboyMarkdown } from "../config/markdown"

export namespace KilocodeInstruction {
  export function content(text: string, item: string) {
    return NoCowboyMarkdown.substitute(text, item)
  }
}
