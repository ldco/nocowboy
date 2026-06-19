// nocowboy_change start - reactive TUI config provider enables hot reload (impl in kilocode mirror)
import { KiloTuiConfig } from "@/nocowboy/cli/cmd/tui/context/tui-config"

export const useTuiConfig = KiloTuiConfig.use
export const TuiConfigProvider = KiloTuiConfig.Provider
// nocowboy_change end
