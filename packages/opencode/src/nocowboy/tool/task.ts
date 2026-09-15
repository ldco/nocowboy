import { Effect, Schema } from "effect"
import path from "path"
import { Permission } from "@/permission"
import { Flag } from "@nocowboy/core/flag/flag"
import { Global } from "@nocowboy/core/global"
import * as Log from "@nocowboy/core/util/log"
import { ModelID, ProviderID } from "@/provider/schema"
import type { Session } from "../../session/session"
import type { Agent } from "../../agent/agent"
import type { Config } from "../../config/config"
import { Provider } from "../../provider/provider"
import z from "zod"

const log = Log.create({ service: "kilocode-task-model" })

// RATIONALE: Mirror narrow state slice Task tool consumes and ignore unrelated TUI fields.
const ModelState = z
  .object({
    model: z
      .record(
        z.string(),
        z.object({
          providerID: z.custom<ProviderID>(Schema.is(ProviderID)),
          modelID: z.custom<ModelID>(Schema.is(ModelID)),
        }),
      )
      .optional(),
    variant: z.record(z.string(), z.string().optional()).optional(),
  })
  .passthrough()

export namespace KiloTask {
  /**
   * Allow all agents (primary, subagent, all) to be used as subagents.
   * P3 refactor removed dedicated subagent types. Primary agents like worker are
   * the designated delegation targets for reviewer/planner via the task tool.
   * Nested subagent prevention is handled by nestedTask() returning false.
   */
  export function validate(_info: Agent.Info, _name: string) {
    // No rejection — all agent modes can be subagents
  }

  /** Kilo keeps delegation one level deep to avoid recursive subagent chains. */
  export function nestedTask(): false {
    return false
  }

  /**
   * Build inherited permission rules from the calling agent.
   * Merges the static agent definition with the session's accumulated permissions
   * so restrictions survive multi-hop chains (plan → general → explore).
   *
   * The caller must resolve `caller` (Agent.Info) and `session` (Session.Info)
   * before calling — this function is pure/synchronous.
   */
  export function inherited(input: {
    caller: Agent.Info
    session: Session.Info
    mcp: Config.Info["mcp"]
  }): Permission.Ruleset {
    const rules = Permission.merge(input.caller.permission ?? [], input.session.permission ?? [])
    const prefixes = Object.keys(input.mcp ?? {}).map((k) => k.replace(/[^a-zA-Z0-9_-]/g, "_") + "_")
    const isMcp = (p: string) => prefixes.some((prefix) => p.startsWith(prefix))
    // nocowboy_change - T0.10 (upstream 3a99f36): broad bash denies are deliberately NOT inherited
    // from the calling agent. A read-only/delegating agent carries a readOnlyBash allowlist whose deny
    // rules ("*", "git *") only shape that allowlist; projecting them onto a writable subagent caps
    // commands its own config allows (e.g. `git status`) with phantom deny rules. Only edit/notebook
    // and MCP denials stay hard ceilings; the subagent's own bash policy governs bash.
    const mutation = new Set(["edit", "notebook_edit", "notebook_execute"])
    return rules.filter(
      (r: Permission.Rule) => r.action === "deny" && (mutation.has(r.permission) || isMcp(r.permission)),
    )
  }

  /** Extra permission rules appended to subagent sessions */
  export function permissions(rules: Permission.Ruleset): Permission.Ruleset {
    return [
      { permission: "task", pattern: "*", action: "deny" },
      { permission: "question", pattern: "*", action: "deny" },
      ...rules,
    ]
  }

  export function merge(...rulesets: Permission.Ruleset[]): Permission.Ruleset {
    const result: Permission.Ruleset = []
    const seen = new Set<string>()
    for (const rule of rulesets.flat()) {
      const key = `${rule.permission}\u0000${rule.pattern}\u0000${rule.action}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push(rule)
    }
    return result
  }

  type Model = { providerID: ProviderID; modelID: ModelID }
  type Saved = Model & { variant?: string }
  type Choice = { model: Model; variant?: string; sticky?: boolean; direct?: boolean }

  function key(model: Model) {
    return `${model.providerID}/${model.modelID}`
  }

  function parse(value: string | null | undefined): Model | undefined {
    if (!value) return undefined
    const [providerID, ...parts] = value.split("/")
    return {
      providerID: ProviderID.make(providerID),
      modelID: ModelID.make(parts.join("/")),
    }
  }

  const saved = Effect.fn("KiloTask.savedModel")(function* (name: string) {
    if (Flag.NOCOWBOY_CLIENT !== "cli") return undefined
    const file = path.join(Global.Path.state, "model.json")
    const state = yield* Effect.tryPromise({
      try: () =>
        Bun.file(file)
          .text()
          .then((raw) => ModelState.safeParse(JSON.parse(raw)))
          .then((result) => (result.success ? result.data : undefined))
          .catch(() => undefined),
      catch: () => undefined,
    })
    const model = state?.model?.[name]
    if (!model) return undefined
    return {
      ...model,
      variant: state?.variant?.[`${model.providerID}/${model.modelID}`],
    }
  })

  /** Resolve the task subagent model while discarding stale unavailable overrides. */
  export const resolveModel = Effect.fn("KiloTask.resolveModel")(function* (input: {
    name: string
    agent: Pick<Agent.Info, "model" | "variant" | "fallbackModel">
    config: Pick<Config.Info, "subagent_model" | "subagent_variant" | "subagent_variant_overrides">
    parent: Model
    variant?: string
    provider: Provider.Interface
  }) {
    const state = yield* saved(input.name)
    const cfg = parse(input.config.subagent_model)
    const override = (model: Model) => input.config.subagent_variant_overrides?.[key(model)] ?? undefined
    const lookup = (model: Model) =>
      input.provider
        .getModel(model.providerID, model.modelID)
        .pipe(Effect.catchTag("ProviderModelNotFoundError", () => Effect.succeed(undefined)))

    // Resolve one candidate to a concrete { model, variant }, or undefined when
    // the model is not available in the registry (so the chain moves on).
    const resolveCandidate = (choice: Choice) =>
      Effect.gen(function* () {
        const full = yield* lookup(choice.model)
        if (!full) return undefined
        const value = override(choice.model)
        if (choice.direct) {
          const variant = value && full.variants?.[value] ? value : choice.variant
          return { model: choice.model, variant }
        }
        const fallback = choice.variant && full.variants?.[choice.variant] ? choice.variant : undefined
        const variant = value && full.variants?.[value] ? value : fallback
        return { model: choice.sticky && variant ? { ...choice.model, variant } : choice.model, variant }
      })

    const choices: Array<Choice | undefined> = [
      state
        ? {
            model: { providerID: state.providerID, modelID: state.modelID },
            variant: state.variant,
            sticky: true,
          }
        : undefined,
      input.agent.model ? { model: input.agent.model, variant: input.agent.variant, direct: true } : undefined,
      input.agent.fallbackModel ? { model: input.agent.fallbackModel, direct: true } : undefined,
      cfg ? { model: cfg, variant: input.config.subagent_variant ?? undefined } : undefined,
    ]

    const resolved: Array<{ model: Model; variant?: string }> = []
    let explicitUnavailable: Choice | undefined
    for (const choice of choices) {
      if (!choice) continue
      const item = yield* resolveCandidate(choice)
      if (item) resolved.push(item)
      else if (choice.direct && !explicitUnavailable) explicitUnavailable = choice
    }
    if (resolved.length > 0) {
      const [primary, next] = resolved
      // The caller's own model is the last-resort fallback: it is already in
      // use, so it is guaranteed to be reachable.
      const sameParent =
        primary.model.providerID === input.parent.providerID && primary.model.modelID === input.parent.modelID
      const fallback = next ?? (sameParent ? undefined : { model: input.parent, variant: input.variant })
      return { model: primary.model, variant: primary.variant, fallback }
    }

    // No candidate resolved. An explicitly configured agent model is honored
    // even when it is not in the registry (fail loud) unless a fallback was
    // configured above — that keeps misconfigured agents visible instead of
    // silently swapping the model behind the user's back.
    if (explicitUnavailable) {
      return { model: explicitUnavailable.model, variant: explicitUnavailable.variant, fallback: undefined }
    }

    const value = override(input.parent)
    if (!value) return { model: input.parent, variant: input.variant, fallback: undefined }
    const full = yield* lookup(input.parent)
    const variant = full?.variants?.[value] ? value : input.variant
    return { model: input.parent, variant, fallback: undefined }
  })
}
