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
    | "permission.title"
    | "permission.allow"
    | "permission.allowAlways"
    | "permission.reject"
    | "permission.configAlways"
    | "skills.title"
    | "skills.search"
    | "mcp.title"
    | "themes.title"
    | "agent.select"
    | "model.select"
    | "model.agentTitle"
    | "variant.select"
    | "provider.connect"
    | "provider.authMethod"
    | "provider.apiKey"
    | "provider.authCode"
    | "session.rename"
    | "network.stop"
    | "network.resume"
    | "network.stopShort"
    | "footer.getStarted"
    | "footer.permissionOne"
    | "footer.permissionMany"
    | "export.filename"
    | "dialog.selectItem"
    | "dialog.confirmHint"
    | "help.actions"
    | "console.switchOrg"
    | "workspace.warp"
    | "workspace.existing"
    | "plugins.title"
    | "plugins.install"
    | "tag.autocomplete"
    | "dialog.messageActions"
    | "dialog.forkSession"
    | "dialog.subagentActions"
    | "dialog.stash"
    | "question.ownAnswer"
    | "timeline.filterFilename"
    | "palette.title"
    | "export.filenameLabel"
    | "export.includeThinking"
    | "export.includeToolDetails"
    | "export.includeAssistantMeta"
    | "export.openWithoutSaving"
    | "export.hintPress"
    | "export.hintToToggle"
    | "export.hintToConfirm"
    | "export.hintConfirmReturn"
    | "export.hintConfirmTab"
    | "plugins.badgeBuiltIn"
    | "plugins.badgeBuiltInLong"
    | "plugins.toggleScope"
    | "plugins.installing"
    | "plugins.nameRequired"
    | "plugins.registryHint"
    | "plugins.noTuiTarget"
    | "plugins.loadFailed"
    | "plugins.internal"
    | "plugins.external"
    | "whichKey.unknown"
    | "session2.back"
    | "session2.clickExpand"
    | "session2.clickCollapse"
    | "session2.switchedAgent"
    | "session2.switchedModel"
    | "session2.thinking"
    | "session2.writingCommand"
    | "session2.messages"
    | "session2.noMessages"
    | "session2.promptRegions"
    | "session2.promptRegionsDetail"
    | "session2.unknownType"
    | "session2.assistantContent"
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
    "permission.title": "Требуется подтверждение",
    "permission.allow": "Разрешить",
    "permission.allowAlways": "Разрешить всегда",
    "permission.reject": "Отклонить",
    "permission.configAlways": "Правки конфигов всегда требуют подтверждения",
    "skills.title": "Навыки",
    "skills.search": "Поиск навыков…",
    "mcp.title": "MCP",
    "themes.title": "Темы",
    "agent.select": "Выбор агента",
    "model.select": "Выбор модели",
    "model.agentTitle": "Модели агентов — клик, чтобы назначить",
    "variant.select": "Выбор варианта",
    "provider.connect": "Подключить провайдера",
    "provider.authMethod": "Способ авторизации",
    "provider.apiKey": "API-ключ",
    "provider.authCode": "Код авторизации",
    "session.rename": "Переименовать сессию",
    "network.stop": "Esc — остановить этот ход.",
    "network.resume": "Enter — продолжить сейчас.",
    "network.stopShort": "Esc — остановить.",
    "footer.getStarted": "Начните с",
    "footer.permissionOne": "Разрешение",
    "footer.permissionMany": "Разрешения",
    "export.filename": "Имя файла",
    "dialog.selectItem": "Выбрать пункт",
    "dialog.confirmHint": "Нажмите {key} ещё раз для подтверждения",
    "help.actions": "Нажмите {shortcut}, чтобы увидеть все действия и команды в любом контексте.",
    "console.switchOrg": "Сменить организацию",
    "workspace.warp": "Warp",
    "workspace.existing": "Существующее рабочее пространство",
    "plugins.title": "Плагины",
    "plugins.install": "Установить плагин",
    "tag.autocomplete": "Автодополнение",
    "dialog.messageActions": "Действия сообщения",
    "dialog.forkSession": "Форк сессии",
    "dialog.subagentActions": "Действия субагента",
    "dialog.stash": "Отложенное",
    "question.ownAnswer": "Свой ответ",
    "timeline.filterFilename": "Фильтр по имени файла",
    "palette.title": "Команды",
    "export.filenameLabel": "Имя файла:",
    "export.includeThinking": "Включить рассуждения",
    "export.includeToolDetails": "Включить детали инструментов",
    "export.includeAssistantMeta": "Включить метаданные ассистента",
    "export.openWithoutSaving": "Открыть без сохранения",
    "export.hintPress": "Нажмите",
    "export.hintToToggle": "чтобы переключить,",
    "export.hintToConfirm": "чтобы подтвердить",
    "export.hintConfirmReturn": "чтобы подтвердить,",
    "export.hintConfirmTab": "для параметров",
    "plugins.badgeBuiltIn": "Встроенный",
    "plugins.badgeBuiltInLong": "Встроенный плагин",
    "plugins.toggleScope": "Переключить область установки",
    "plugins.installing": "Установка плагина…",
    "plugins.nameRequired": "Укажите имя пакета плагина",
    "plugins.registryHint": "Проверьте доступ к npm-реестру и авторизацию, затем повторите.",
    "plugins.noTuiTarget": "У пакета нет TUI-цели для загрузки в этом приложении.",
    "plugins.loadFailed": "Плагин установлен, но загрузка не удалась. Смотрите логи; перезапустите TUI.",
    "plugins.internal": "Встроенный",
    "plugins.external": "Внешний",
    "whichKey.unknown": "Неизвестно",
    "session2.back": "Назад к сессии",
    "session2.clickExpand": "Клик — развернуть",
    "session2.clickCollapse": "Клик — свернуть",
    "session2.switchedAgent": "Агент переключён на ",
    "session2.switchedModel": "Модель переключена на ",
    "session2.thinking": "Думает",
    "session2.writingCommand": "Запись команды…",
    "session2.messages": "Сообщения",
    "session2.noMessages": "v2-сообщения ещё не загружены.",
    "session2.promptRegions": "Промпт сессии, разрешения, вопросы, сайдбар",
    "session2.promptRegionsDetail": "Эндпоинт v2 отдаёт только сообщения, поэтому эти области UI здесь не отображаются. Esc — вернуться в живую сессию.",
    "session2.unknownType": "Неизвестный тип сообщения",
    "session2.assistantContent": "Содержимое ассистента",
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
    "permission.title": "Confirmation required",
    "permission.allow": "Allow",
    "permission.allowAlways": "Allow always",
    "permission.reject": "Reject",
    "permission.configAlways": "Config edits always require confirmation",
    "skills.title": "Skills",
    "skills.search": "Search skills...",
    "mcp.title": "MCPs",
    "themes.title": "Themes",
    "agent.select": "Select agent",
    "model.select": "Select model",
    "model.agentTitle": "Agent Models — click a model to assign",
    "variant.select": "Select variant",
    "provider.connect": "Connect a provider",
    "provider.authMethod": "Select auth method",
    "provider.apiKey": "API key",
    "provider.authCode": "Authorization code",
    "session.rename": "Rename Session",
    "network.stop": "Press Esc to stop this turn.",
    "network.resume": "Press Enter to resume now.",
    "network.stopShort": "Press Esc to stop.",
    "footer.getStarted": "Get started",
    "footer.permissionOne": "Permission",
    "footer.permissionMany": "Permissions",
    "export.filename": "Enter filename",
    "dialog.selectItem": "Select item",
    "dialog.confirmHint": "Press {key} again to confirm",
    "help.actions": "Press {shortcut} to see all available actions and commands in any context.",
    "console.switchOrg": "Switch org",
    "workspace.warp": "Warp",
    "workspace.existing": "Existing Workspace",
    "plugins.title": "Plugins",
    "plugins.install": "Install plugin",
    "tag.autocomplete": "Autocomplete",
    "dialog.messageActions": "Message Actions",
    "dialog.forkSession": "Fork session",
    "dialog.subagentActions": "Subagent Actions",
    "dialog.stash": "Stash",
    "question.ownAnswer": "Type your own answer",
    "timeline.filterFilename": "Filter by filename",
    "palette.title": "Commands",
    "export.filenameLabel": "Filename:",
    "export.includeThinking": "Include thinking",
    "export.includeToolDetails": "Include tool details",
    "export.includeAssistantMeta": "Include assistant metadata",
    "export.openWithoutSaving": "Open without saving",
    "export.hintPress": "Press",
    "export.hintToToggle": "to toggle,",
    "export.hintToConfirm": "to confirm",
    "export.hintConfirmReturn": "to confirm,",
    "export.hintConfirmTab": "for options",
    "plugins.badgeBuiltIn": "Built-in",
    "plugins.badgeBuiltInLong": "Built-in plugin",
    "plugins.toggleScope": "Toggle install scope",
    "plugins.installing": "Installing plugin...",
    "plugins.nameRequired": "Plugin package name is required",
    "plugins.registryHint": "Check npm registry/auth settings and try again.",
    "plugins.noTuiTarget": "Package has no TUI target to load in this app.",
    "plugins.loadFailed": "Installed plugin, but runtime load failed. See console/logs; restart TUI to retry.",
    "plugins.internal": "Internal",
    "plugins.external": "External",
    "whichKey.unknown": "Unknown",
    "session2.back": "Back to session",
    "session2.clickExpand": "Click to expand",
    "session2.clickCollapse": "Click to collapse",
    "session2.switchedAgent": "Switched agent to ",
    "session2.switchedModel": "Switched model to ",
    "session2.thinking": "Thinking",
    "session2.writingCommand": "Writing command...",
    "session2.messages": "Messages",
    "session2.noMessages": "No v2 messages loaded from useSyncV2 yet.",
    "session2.promptRegions": "Session prompt, permission prompt, question prompt, sidebar",
    "session2.promptRegionsDetail": "The v2 message endpoint only exposes messages, so these session UI regions cannot be rendered here. Press Esc to return to the live session.",
    "session2.unknownType": "Unknown message type",
    "session2.assistantContent": "Assistant content",
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


