/**
 * Knowledge-graph — stable public surface.
 *
 * Consumers import the contract and the in-memory fallback from here. The AST
 * engine, when it lands, exports the same `GraphProvider` interface with a
 * different `snapshot()` source; nothing else changes.
 */

export * from "./provider"
export * from "./memory"
export * from "./summary"
