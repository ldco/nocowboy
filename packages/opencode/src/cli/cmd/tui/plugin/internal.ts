import HomeFooter from "../feature-plugins/home/footer"
import HomeTips from "../feature-plugins/home/tips"
// nocowboy_change start
import HomeOnboarding from "@/nocowboy/plugins/home-onboarding"
import KiloAttention from "@/nocowboy/plugins/attention"
import KiloHomeFooter from "@/nocowboy/plugins/home-footer"
import KiloSidebarFooter from "@/nocowboy/plugins/sidebar-footer"
import KiloSidebarBackgroundProcesses from "@/nocowboy/plugins/sidebar-background-processes"
import KiloSidebarIndexing from "@/nocowboy/plugins/sidebar-indexing"
import KiloSidebarPr from "@/nocowboy/plugins/sidebar-pr"
import KiloSidebarUsage from "@/nocowboy/plugins/sidebar-usage"
// nocowboy_change end
import SidebarContext from "../feature-plugins/sidebar/context"
import SidebarMcp from "../feature-plugins/sidebar/mcp"
import SidebarLsp from "../feature-plugins/sidebar/lsp"
import SidebarTodo from "../feature-plugins/sidebar/todo"
import SidebarFiles from "../feature-plugins/sidebar/files"
import SidebarFooter from "../feature-plugins/sidebar/footer"
import PluginManager from "../feature-plugins/system/plugins"
import Notifications from "../feature-plugins/system/notifications"
import SessionV2Debug from "../feature-plugins/system/session-v2"
import WhichKey from "../feature-plugins/system/which-key"
import type { TuiPlugin, TuiPluginModule } from "@nocowboy/plugin/tui"
import type { RuntimeFlags } from "@/effect/runtime-flags"

export type InternalTuiPlugin = Omit<TuiPluginModule, "id"> & {
  id: string
  tui: TuiPlugin
  enabled?: boolean
}

export function internalTuiPlugins(flags: Pick<RuntimeFlags.Info, "experimentalEventSystem">): InternalTuiPlugin[] {
  return [
    HomeNews, // nocowboy_change
    HomeOnboarding, // nocowboy_change
    KiloAttention, // nocowboy_change
    KiloHomeFooter, // nocowboy_change
    KiloSidebarFooter, // nocowboy_change
    KiloSidebarBackgroundProcesses, // nocowboy_change
    KiloSidebarIndexing, // nocowboy_change
    KiloSidebarPr, // nocowboy_change
    KiloSidebarUsage, // nocowboy_change
    HomeFooter,
    HomeTips,
    SidebarContext,
    SidebarMcp,
    SidebarLsp,
    SidebarTodo,
    SidebarFiles,
    SidebarFooter,
    Notifications,
    PluginManager,
    WhichKey,
    ...(flags.experimentalEventSystem ? [SessionV2Debug] : []),
  ]
}
