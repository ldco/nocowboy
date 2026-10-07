/**
 * Pure rendering of an MCP prompt's messages into a command template string.
 *
 * Server prompts become slash commands (`source: "mcp"`); their `.template`
 * getter is resolved lazily at execution time. A prompt the server no longer
 * knows about must surface a CLEAR error — never an empty string, which would
 * silently run an empty command.
 */

export interface PromptMessage {
  content: { type: string; text?: string }
}

export interface PromptTemplate {
  messages: PromptMessage[]
}

/**
 * Render an MCP prompt's messages to a command template string.
 * A missing template (unknown/unavailable prompt) is a CLEAR error, never "".
 */
export function renderPromptTemplate(
  template: PromptTemplate | undefined,
  ref: { client: string; name: string },
): string {
  if (!template) throw new Error(`MCP prompt "${ref.name}" is unavailable from client "${ref.client}"`)
  return template.messages
    .map((message) => (message.content.type === "text" ? (message.content.text ?? "") : ""))
    .join("\n")
}
