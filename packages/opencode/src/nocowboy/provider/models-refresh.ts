import { ScopedCache } from "effect"
import * as Refresh from "@nocowboy/core/nocowboy/models-refresh"
import type { InstanceState } from "@/effect/instance-state"

export const watch = <A, E, R>(state: InstanceState<A, E, R>) =>
  Refresh.watch(() => ScopedCache.invalidateAll(state.cache))
