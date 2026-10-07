export { KiloIndexingPlugin, default } from "./plugin.js"
export { IndexingConfig, toIndexingConfigInput } from "./config.js"
export { hasIndexingPlugin, isIndexingPlugin, normalizePluginName, INDEXING_PLUGIN_NAMES } from "./detect.js"
export {
  INDEXING_STATUS_STATES,
  IndexingStatus,
  IndexingStatusState,
  disabledIndexingStatus,
  normalizeIndexingStatus,
} from "./status.js"

export type { IndexingConfig as IndexingConfigInfo } from "./config.js"
export type { IndexingStatus as IndexingStatusInfo, IndexingStatusState as IndexingStatusStateInfo } from "./status.js"

// Structured AST extraction (knowledge-graph engine): definitions + call edges.
export { parseDefinitionsForFile, parseCallEdgesForFile, MODULE_SCOPE } from "./tree-sitter/ast.js"
export type { AstDefinition, AstCallEdge } from "./tree-sitter/ast.js"
