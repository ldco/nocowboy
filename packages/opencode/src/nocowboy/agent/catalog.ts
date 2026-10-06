/**
 * Re-export of the canonical AgentCatalog policy from @nocowboy/runtime.
 *
 * The policy lives in the ports core so the listing and the executor share one
 * source. The engine reaches it through `@/nocowboy/engine-adapter`; this module
 * stays as a stable import path for existing callers/tests.
 */
export { AgentCatalog } from "@nocowboy/runtime"
export type { AgentCatalogEntry, AgentMode } from "@nocowboy/runtime"
