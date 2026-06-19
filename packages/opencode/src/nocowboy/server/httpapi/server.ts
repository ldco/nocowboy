import { Layer } from "effect"

import { agentBuilderHandlers } from "./handlers/agent-builder"
import { backgroundProcessHandlers } from "./handlers/background-process"
import { commitMessageHandlers } from "./handlers/commit-message"
import { configConsoleHandlers } from "./handlers/config-console"
import { enhancePromptHandlers } from "./handlers/enhance-prompt"
import { indexingHandlers } from "./handlers/indexing"
import { nocowboyHandlers } from "./handlers/nocowboy"
import { remoteHandlers } from "./handlers/remote"
import { sessionImportHandlers } from "./handlers/session-import"
import { suggestionHandlers } from "./handlers/suggestion"

export const provide = Layer.provide([
  agentBuilderHandlers,
  backgroundProcessHandlers,
  commitMessageHandlers,
  configConsoleHandlers,
  enhancePromptHandlers,
  indexingHandlers,
  nocowboyHandlers,
  remoteHandlers,
  sessionImportHandlers,
  suggestionHandlers,
])
