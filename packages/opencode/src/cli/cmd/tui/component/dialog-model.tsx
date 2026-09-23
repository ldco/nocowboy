import { useTerminalDimensions } from "@opentui/solid"
import { createEffect, createMemo, createSignal, Show } from "solid-js"
import { reconcile } from "solid-js/store"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"
import { map, pipe, flatMap, entries, filter, sortBy, take, groupBy } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { createDialogProviderOptions, DialogProvider } from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import type { Model } from "@nocowboy/sdk/v2"
import * as fuzzysort from "fuzzysort"
import { useConnected } from "./use-connected"
import { ModelInfoPanel } from "@/nocowboy/components/model-info-panel"
import { FreeModelDisclosure } from "@/nocowboy/components/free-model-disclosure"
import { agentModelPatch } from "@/nocowboy/components/agent-model-dialog-state"
import { t } from "@tui/context/i18n"

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const dialog = useDialog()
  const [query, setQuery] = createSignal("")
  const dimensions = useTerminalDimensions()

  const connected = useConnected()
  const providers = createDialogProviderOptions()
  // Memoize anything that iterates all Kilo models to avoid calculating it for
  // each Kilo model and tanking the UI at a couple hundred models
  const ncowboyRank = createMemo(() => {
    const provider = sync.data.provider.find((provider) => provider.id === "nocowboy")
    const models = provider?.models ?? {}
    return new Map(Object.entries(models).map(([id, info]) => [id, info.recommendedIndex ?? Infinity] as const))
  })

  const showExtra = createMemo(() => connected() && !props.providerID)

  const wide = createMemo(() => dimensions().width >= 108)
  const [preview, setPreview] = createSignal<{
    model: Model
    provider: string
  }>()

  const lookup = (providerID: string, modelID: string) => {
    const provider = sync.data.provider.find((x) => x.id === providerID)
    const model = provider?.models[modelID]
    if (!provider || !model) return
    return {
      model,
      provider: provider.name,
    }
  }

  createEffect(() => {
    dialog.setSize(wide() ? "xlarge" : "large")
  })

  createEffect(() => {
    const current = local.model.current()
    if (!current) return
    const next = lookup(current.providerID, current.modelID)
    if (!next) return
    setPreview(next)
  })

  const costLabel = (model: Model) => {
    if (!model.cost) return
    const minCost = Math.min(model.cost.input, model.cost.output)
    if (minCost <= 0) return "Free"
    return `$${minCost < 0.01 ? minCost.toFixed(4) : minCost.toFixed(2)}/M`
  }

  const footer = (providerID: string, model: Model) => {
    if (providerID === "nocowboy" && FreeModelDisclosure.collectsData(model)) return FreeModelDisclosure.label
    const label = costLabel(model)
    if (label) return label
    return undefined
  }

  const options = createMemo(() => {
    const needle = query().trim()
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()

    function toOptions(items: typeof favorites, category: string) {
      if (!showExtra()) return []
      return items.flatMap((item) => {
        const provider = sync.data.provider.find((x) => x.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        return [
          {
            key: item,
            value: { providerID: provider.id, modelID: model.id },
            title: model.name ?? item.modelID,
            description: provider.name,
            category,
            disabled: provider.id === "nocowboy" && model.id.includes("-nano"),
            footer: footer(provider.id, model),
            onSelect: () => {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter(
        (item) => !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID),
      ),
      "Recent",
    )

    const providerOptions = pipe(
      sync.data.provider,
      sortBy(
        (provider) => provider.id !== "nocowboy",
        (provider) => provider.name,
      ),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => (props.providerID ? info.providerID === props.providerID : true)),
          map(([model, info]) => ({
            value: { providerID: provider.id, modelID: model },
            title: info.name ?? model,
            description: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
              ? "(Favorite)"
              : undefined,
            category: connected()
              ? provider.id === "nocowboy" && info.recommendedIndex !== undefined
                ? "Recommended"
                : provider.name
              : undefined,
            disabled: provider.id === "nocowboy" && model.includes("-nano"),
            footer: footer(provider.id, info),
            onSelect() {
              onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            if (showExtra()) {
              if (favorites.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
                return false
              if (recents.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
                return false
            }
            return true
          }),
          sortBy(
            (x) => (x.value.providerID === "nocowboy" ? (ncowboyRank().get(x.value.modelID) ?? Infinity) : 0),
            (x) => x.footer === undefined,
            (x) => x.title,
          ),
        ),
      ),
    )

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    if (needle) {
      const rank = <U extends { title: string; category?: string }>(items: U[]) =>
        fuzzysort.go(needle, items, { keys: ["title", "category"] }).map((x) => x.obj)
      // rank within each provider category to preserve category order
      const rankedProviders = pipe(
        providerOptions,
        groupBy((x) => x.category ?? ""),
        entries(),
        flatMap(([_, items]) => rank(items)),
      )
      return [...rank(favoriteOptions), ...rank(recentOptions), ...rankedProviders, ...rank(popularProviders)]
    }

    return [...favoriteOptions, ...recentOptions, ...providerOptions, ...popularProviders]
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((x) => x.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return t("model.select")
    return value.name
  })

  // Choosing a model here is how the agent's default is changed without opening
  // the settings dialog. The in-process pick (#9050) is deliberately short-lived,
  // so also write it to the config — otherwise the next launch silently falls
  // back to the previously configured model.
  async function persistAgentModel(providerID: string, modelID: string) {
    const agent = local.agent.current()
    if (!agent) return
    const response = await sdk.client.config.overlayUpdate({
      scope: "global",
      set: agentModelPatch(agent.name, { providerID, modelID }),
      unset: undefined,
    })
    if (response.error) return
    const [configResponse, globalResponse] = await Promise.all([
      sdk.client.config.get({}),
      sdk.client.global.config.get({}),
    ])
    if (configResponse.data) sync.set("config", reconcile(configResponse.data))
    if (globalResponse.data) sync.set("globalConfig", reconcile(globalResponse.data))
    toast.show({ message: t("model.agentAssigned", { agent: agent.name, model: modelID }), variant: "success" })
  }

  function onSelect(providerID: string, modelID: string) {
    local.model.set({ providerID, modelID }, { recent: true })
    void persistAgentModel(providerID, modelID)
    const list = local.model.variant.list()
    const cur = local.model.variant.selected()
    if (cur === "default" || (cur && list.includes(cur))) {
      dialog.clear()
      return
    }
    if (list.length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  return (
    <box flexDirection="row">
      <box flexGrow={1} flexShrink={1}>
        <DialogSelect<ReturnType<typeof options>[number]["value"]>
          options={options()}
          actions={[
            {
              command: "model.dialog.provider",
              title: connected() ? "Connect provider" : "View all providers",
              onTrigger() {
                dialog.replace(() => <DialogProvider />)
              },
            },
            {
              command: "model.dialog.favorite",
              title: "Favorite",
              disabled: !connected(),
              onTrigger: (option) => {
                local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
              },
            },
          ]}
          onFilter={setQuery}
          onMove={(option) => {
            if (typeof option.value === "string") {
              setPreview(undefined)
              return
            }
            const next = lookup(option.value.providerID, option.value.modelID)
            if (!next) return
            setPreview(next)
          }}
          skipFilter={true}
          title={title()}
          current={local.model.current()}
        />
      </box>
      <Show when={wide() && preview()}>
        {(item) => <ModelInfoPanel model={item().model} provider={item().provider} />}
      </Show>
    </box>
  )
}
