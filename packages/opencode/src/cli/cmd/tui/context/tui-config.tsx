// nocowboy_change start - reactive TUI config provider enables hot reload (impl in kilocode mirror)
import { NoCowboyTuiConfig } from "@/nocowboy/cli/cmd/tui/context/tui-config"

export const useTuiConfig = NoCowboyTuiConfig.use
export const TuiConfigProvider = NoCowboyTuiConfig.Provider
// nocowboy_change end
