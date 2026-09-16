// Provides Russian translations for TUI labels, sidebar, dialogs, errors.
// Uses `lang` from config to select language.

import { Config } from "@/config/config"
import { Effect, Context, Layer } from "effect"

export namespace I18n {
  export type Key =
    | "sidebar.sessions"
    | "sidebar.settings"
    | "sidebar.newSession"
    | "sidebar.search"
    | "sidebar.today"
    | "sidebar.yesterday"
    | "sidebar.earlier"
    | "sidebar.pinned"
    | "sidebar.info"
    | "sidebar.history"
    | "sidebar.templates"
    | "sessions.allWorktrees"
    | "sessions.currentWorktree"
    | "dialog.ok"
    | "dialog.cancel"
    | "dialog.close"
    | "dialog.save"
    | "dialog.confirm"
    | "dialog.discard"
    | "settings.title"
    | "settings.language"
    | "settings.model"
    | "settings.theme"
    | "settings.provider"
    | "settings.instructions"
    | "settings.about"
    | "settings.restart"
    | "error.generic"
    | "error.timeout"
    | "error.notFound"
    | "error.permissionDenied"
    | "status.ready"
    | "status.thinking"
    | "status.error"
    | "status.toolCall"
    | "session.empty"
    | "session.agent"
    | "session.context"
    | "search.placeholder"
    | "search.noResults"
    | "settings.providers"
    | "settings.codeIndexing"
    | "settings.lsp"
    | "settings.mcpServers"
    | "status.enabled"
    | "status.disabled"
    | "status.unknown"
    | "home.welcome"
    | "chat.inputPlaceholder"

  export type Strings = Record<Key, string>

  const ru: Strings = {
    "sidebar.sessions": "Сессии",
    "sidebar.settings": "Настройки",
    "sidebar.newSession": "Новая сессия",
    "sidebar.search": "Поиск",
    "sidebar.today": "Сегодня",
    "sidebar.yesterday": "Вчера",
    "sidebar.earlier": "Ранее",
    "sidebar.pinned": "Закреплённые",
    "sidebar.info": "Инфо",
    "sidebar.history": "История",
    "sidebar.templates": "Шаблоны",
    "sessions.allWorktrees": "Сессии (все worktree)",
    "sessions.currentWorktree": "Сессии (текущий worktree)",
    "dialog.ok": "OK",
    "dialog.cancel": "Отмена",
    "dialog.close": "Закрыть",
    "dialog.save": "Сохранить",
    "dialog.confirm": "Подтвердить",
    "dialog.discard": "Отменить",
    "settings.title": "Настройки",
    "settings.language": "Язык",
    "settings.model": "Модель",
    "settings.theme": "Тема",
    "settings.provider": "Провайдер",
    "settings.instructions": "Инструкции",
    "settings.about": "О программе",
    "settings.restart": "Перезапустить",
    "error.generic": "Произошла ошибка",
    "error.timeout": "Время ожидания истекло",
    "error.notFound": "Не найдено",
    "error.permissionDenied": "Доступ запрещён",
    "status.ready": "Готов",
    "status.thinking": "Думаю…",
    "status.error": "Ошибка",
    "status.toolCall": "Вызов инструмента",
    "session.empty": "Нет активных сессий",
    "session.agent": "Агент",
    "session.context": "Контекст",
    "search.placeholder": "Поиск сессий…",
    "search.noResults": "Ничего не найдено",
    "settings.providers": "Провайдеры",
    "settings.codeIndexing": "Индексация кода",
    "settings.lsp": "LSP",
    "settings.mcpServers": "MCP-серверы",
    "status.enabled": "Включено",
    "status.disabled": "Выключено",
    "status.unknown": "Неизвестно",
    "home.welcome": "Добро пожаловать в NoCowboy",
    "chat.inputPlaceholder": "Введите сообщение…",
  }

  const en: Strings = {
    "sidebar.sessions": "Sessions",
    "sidebar.settings": "Settings",
    "sidebar.newSession": "New Session",
    "sidebar.search": "Search",
    "sidebar.today": "Today",
    "sidebar.yesterday": "Yesterday",
    "sidebar.earlier": "Earlier",
    "sidebar.pinned": "Pinned",
    "sidebar.info": "Info",
    "sidebar.history": "History",
    "sidebar.templates": "Templates",
    "sessions.allWorktrees": "Sessions (all worktrees)",
    "sessions.currentWorktree": "Sessions (current worktree)",
    "dialog.ok": "OK",
    "dialog.cancel": "Cancel",
    "dialog.close": "Close",
    "dialog.save": "Save",
    "dialog.confirm": "Confirm",
    "dialog.discard": "Discard",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.model": "Model",
    "settings.theme": "Theme",
    "settings.provider": "Provider",
    "settings.instructions": "Instructions",
    "settings.about": "About",
    "settings.restart": "Restart",
    "error.generic": "An error occurred",
    "error.timeout": "Request timed out",
    "error.notFound": "Not found",
    "error.permissionDenied": "Permission denied",
    "status.ready": "Ready",
    "status.thinking": "Thinking…",
    "status.error": "Error",
    "status.toolCall": "Tool call",
    "session.empty": "No active sessions",
    "session.agent": "Agent",
    "session.context": "Context",
    "search.placeholder": "Search sessions…",
    "search.noResults": "No results found",
    "home.welcome": "Welcome to NoCowboy",
    "settings.providers": "Providers",
    "settings.codeIndexing": "Code Indexing",
    "settings.lsp": "LSP",
    "settings.mcpServers": "MCP Servers",
    "status.enabled": "Enabled",
    "status.disabled": "Disabled",
    "status.unknown": "Unknown",
    "chat.inputPlaceholder": "Type a message…",
  }

  export function getStrings(lang: string): Strings {
    if (lang.startsWith("ru")) return ru
    return en
  }
}

export class I18nService extends Context.Service<I18nService, { readonly get: (key: I18n.Key) => string }>()(
  "@nocowboy/I18n",
) {
  static readonly layer = Layer.effect(
    I18nService,
    Effect.gen(function* () {
      const cfg = yield* Config.Service
      const config = yield* cfg.get()
      const strings = I18n.getStrings(config.lang ?? "en")

      return I18nService.of({
        get: (key: I18n.Key) => strings[key] ?? key,
      })
    }),
  )
}


