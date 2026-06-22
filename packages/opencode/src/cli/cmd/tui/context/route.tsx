import { createStore, reconcile, unwrap } from "solid-js/store" // nocowboy_change
import { createSimpleContext } from "./helper"
import type { PromptInfo } from "../component/prompt/history"

export type HomeRoute = {
  type: "home"
  prompt?: PromptInfo
}

export type SessionRoute = {
  type: "session"
  sessionID: string
  prompt?: PromptInfo
}

// nocowboy_change start
export type KiloClawRoute = {
  type: "kilo-claw"
}
// nocowboy_change end

export type PluginRoute = {
  type: "plugin"
  id: string
  data?: Record<string, unknown>
}

export type Route = HomeRoute | SessionRoute | PluginRoute | KiloClawRoute // nocowboy_change

export const { use: useRoute, provider: RouteProvider } = createSimpleContext({
  name: "Route",
  init: (props: { initialRoute?: Route }) => {
    const [store, setStore] = createStore<Route>(
      props.initialRoute ??
        (process.env["NOCOWBOY_ROUTE"]
          ? JSON.parse(process.env["NOCOWBOY_ROUTE"])
          : {
              type: "home",
            }),
    )

    // nocowboy_change start
    let previous: Route | undefined
    // nocowboy_change end

    return {
      get data() {
        return store
      },
      navigate(route: Route) {
        previous = structuredClone(unwrap(store)) // nocowboy_change
        setStore(reconcile(route))
      },
      // nocowboy_change start
      back() {
        const target = previous ?? ({ type: "home" } as const)
        previous = undefined
        console.log("navigate", target)
        setStore(target)
      },
      // nocowboy_change end
    }
  },
})

export type RouteContext = ReturnType<typeof useRoute>

export function useRouteData<T extends Route["type"]>(type: T) {
  const route = useRoute()
  return route.data as Extract<Route, { type: typeof type }>
}
