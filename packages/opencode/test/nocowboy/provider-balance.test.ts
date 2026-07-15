import { describe, expect, test } from "bun:test"
import {
  findBalanceDescriptor,
  findBalanceProvider,
  getBalanceColor,
  clearBalanceCache,
  getBalanceProviders,
  getPeakPricing,
} from "../../src/nocowboy/provider-balance"
import type { Provider } from "@nocowboy/sdk/v2"

describe("provider-balance", () => {
  describe("getBalanceColor", () => {
    test("returns success for high balance", () => {
      expect(getBalanceColor(100)).toBe("success")
      expect(getBalanceColor(10.01)).toBe("success")
    })

    test("returns warning for medium balance", () => {
      expect(getBalanceColor(10)).toBe("warning")
      expect(getBalanceColor(5)).toBe("warning")
      expect(getBalanceColor(3)).toBe("warning")
    })

    test("returns error for low balance", () => {
      expect(getBalanceColor(2.99)).toBe("error")
      expect(getBalanceColor(0)).toBe("error")
      expect(getBalanceColor(-1)).toBe("error")
    })

    test("uses custom thresholds", () => {
      expect(getBalanceColor(5, { warning: 3, error: 1 })).toBe("success")
      expect(getBalanceColor(2, { warning: 3, error: 1 })).toBe("warning")
      expect(getBalanceColor(0.5, { warning: 3, error: 1 })).toBe("error")
    })

    test("handles exact boundary values", () => {
      // > warning → success
      expect(getBalanceColor(10.01)).toBe("success")
      // >= error → warning (when balance is between warning and error)
      expect(getBalanceColor(10)).toBe("warning")
      expect(getBalanceColor(3)).toBe("warning")
      // < error → error
      expect(getBalanceColor(2.99)).toBe("error")
    })
  })

  describe("findBalanceDescriptor", () => {
    test("finds deepseek by provider ID", () => {
      const desc = findBalanceDescriptor("deepseek", "deepseek-v4-flash")
      expect(desc).not.toBeNull()
      expect(desc!.id).toBe("deepseek")
      expect(desc!.label).toBe("DeepSeek")
    })

    test("finds deepseek by model name", () => {
      // When a different provider ID hosts a deepseek model
      const desc = findBalanceDescriptor("custom-provider", "deepseek-v4-pro")
      expect(desc).not.toBeNull()
      expect(desc!.id).toBe("deepseek")
    })

    test("finds kimi by provider ID", () => {
      expect(findBalanceDescriptor("kimi", "")).not.toBeNull()
      expect(findBalanceDescriptor("moonshotai", "")).not.toBeNull()
      expect(findBalanceDescriptor("moonshotai-cn", "")).not.toBeNull()
    })

    test("finds kimi by model name", () => {
      const desc = findBalanceDescriptor("custom", "kimi-k2-thinking")
      expect(desc).not.toBeNull()
      expect(desc!.id).toBe("kimi")

      const desc2 = findBalanceDescriptor("custom", "moonshot-v1")
      expect(desc2).not.toBeNull()
      expect(desc2!.id).toBe("kimi")
    })

    test("returns null for unknown providers", () => {
      expect(findBalanceDescriptor("openai", "gpt-4")).toBeNull()
      expect(findBalanceDescriptor("unknown", "unknown-model")).toBeNull()
    })
  })

  describe("findBalanceProvider", () => {
    const providers: Partial<Provider>[] = [
      {
        id: "deepseek",
        name: "DeepSeek",
        key: "sk-ds-12345",
        options: {},
      },
      {
        id: "openai",
        name: "OpenAI",
        key: "sk-oa-67890",
        options: {},
      },
    ] as Provider[]

    test("finds direct balance provider", () => {
      const found = findBalanceProvider(providers as Provider[], "deepseek", "deepseek-v4-flash")
      expect(found).not.toBeNull()
      expect(found!.providerID).toBe("deepseek")
      expect(found!.apiKey).toBe("sk-ds-12345")
    })

    test("returns null for non-balance provider", () => {
      const found = findBalanceProvider(providers as Provider[], "openai", "gpt-4")
      expect(found).toBeNull()
    })

    test("returns null when no providers match", () => {
      const found = findBalanceProvider([] as Provider[], "deepseek", "deepseek-v4-flash")
      expect(found).toBeNull()
    })

    test("returns null when provider has no API key", () => {
      const noKeyProviders = [
        { id: "deepseek", name: "DeepSeek", options: {} },
      ] as Provider[]
      const found = findBalanceProvider(noKeyProviders, "deepseek", "deepseek-v4-flash")
      expect(found).toBeNull()
    })
  })

  describe("registry", () => {
    test("has DeepSeek and Kimi registered", () => {
      const providers = getBalanceProviders()
      const ids = providers.map((p) => p.id)
      expect(ids).toContain("deepseek")
      expect(ids).toContain("kimi")
    })

    test("clearBalanceCache does not throw", () => {
      expect(() => clearBalanceCache()).not.toThrow()
    })
  })

  describe("peak pricing", () => {
    function utcDate(hour: number): Date {
      return new Date(Date.UTC(2026, 6, 16, hour, 0, 0))
    }

    test("off-peak hours return multiplier 1", () => {
      // 05:00 UTC — between peak windows
      const info = getPeakPricing(utcDate(5))
      expect(info.isPeak).toBe(false)
      expect(info.multiplier).toBe(1)
      expect(info.label).toBe("×1 normal")
    })

    test("peak hour 01:00 UTC returns multiplier 2", () => {
      const info = getPeakPricing(utcDate(1))
      expect(info.isPeak).toBe(true)
      expect(info.multiplier).toBe(2)
      expect(info.label).toBe("×2 peak")
    })

    test("peak hour 07:00 UTC returns multiplier 2", () => {
      const info = getPeakPricing(utcDate(7))
      expect(info.isPeak).toBe(true)
      expect(info.multiplier).toBe(2)
    })

    test("boundary 04:00 UTC — end of first peak window", () => {
      // 04:00 is the END of window 1 (01-04), so NOT peak
      const info = getPeakPricing(utcDate(4))
      expect(info.isPeak).toBe(false)
    })

    test("boundary 06:00 UTC — start of second peak window", () => {
      const info = getPeakPricing(utcDate(6))
      expect(info.isPeak).toBe(true)
    })

    test("secondsUntilChange during off-peak", () => {
      // 05:30 UTC — 30 min until next peak at 06:00
      const d = new Date(Date.UTC(2026, 6, 16, 5, 30, 0))
      const info = getPeakPricing(d)
      expect(info.isPeak).toBe(false)
      expect(info.secondsUntilChange).toBe(30 * 60)
    })

    test("secondsUntilChange during peak", () => {
      // 02:00 UTC — 2h until peak ends at 04:00
      const d = new Date(Date.UTC(2026, 6, 16, 2, 0, 0))
      const info = getPeakPricing(d)
      expect(info.isPeak).toBe(true)
      expect(info.secondsUntilChange).toBe(2 * 3600)
    })
  })
})
