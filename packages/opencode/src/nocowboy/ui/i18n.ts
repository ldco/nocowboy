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
    | "settings.agentModels"
    | "settings.agentModelsCta"
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
    | "model.agentNotConfigured"
    | "model.agentAssignHint"
    | "model.agentAssignFailed"
    | "model.agentAssigned"
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
    | "common.copied"
    | "provider.invalidCode"
    | "network.disconnected"
    | "network.reconnected"
    | "status.disabledInConfig"
    | "sidebar.noSessions"
    | "sidebar.noCommands"
    | "sidebar.noActiveSession"
    | "sidebar.gettingStarted"
    | "sidebar.connectProvider"
    | "autocomplete.noMatches"
    | "whichKey.noBindings"
    | "mcp.needsAuth"
    | "sidebar.todo"
    | "sidebar.modifiedFiles"
    | "sidebar.context"
    | "mcp.connected"
    | "mcp.disabled"
    | "mcp.needsClientId"
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
    "settings.agentModels": "Модели агентов",
    "settings.agentModelsCta": "Назначить модель агенту →",
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
    "model.agentNotConfigured": "не назначена",
    "model.agentAssignHint": "Назначить агенту {agent}",
    "model.agentAssignFailed": "Не удалось назначить модель агенту {agent}",
    "model.agentAssigned": "{agent} → {model}",
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
    "common.copied": "Скопировано",
    "provider.invalidCode": "Неверный код",
    "network.disconnected": "Сеть отключена",
    "network.reconnected": "Сеть восстановлена",
    "status.disabledInConfig": "Отключено в конфигурации",
    "sidebar.noSessions": "Нет сессий",
    "sidebar.noCommands": "Команды не настроены",
    "sidebar.noActiveSession": "Нет активной сессии",
    "sidebar.gettingStarted": "Начало работы",
    "sidebar.connectProvider": "Подключить провайдера",
    "autocomplete.noMatches": "Нет совпадений",
    "whichKey.noBindings": "Нет доступных привязок",
    "mcp.needsAuth": "Требуется авторизация",
    "sidebar.todo": "Задачи",
    "sidebar.modifiedFiles": "Изменённые файлы",
    "sidebar.context": "Контекст",
    "mcp.connected": "Подключено",
    "mcp.disabled": "Отключено",
    "mcp.needsClientId": "Нужен client ID",
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
    "model.agentNotConfigured": "not configured",
    "model.agentAssignHint": "Assign to {agent}",
    "model.agentAssignFailed": "Failed to assign a model to {agent}",
    "model.agentAssigned": "{agent} → {model}",
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
    "common.copied": "Successfully copied",
    "provider.invalidCode": "Invalid code",
    "network.disconnected": "Network disconnected",
    "network.reconnected": "Network reconnected",
    "status.disabledInConfig": "Disabled in configuration",
    "sidebar.noSessions": "No sessions",
    "sidebar.noCommands": "No commands configured",
    "sidebar.noActiveSession": "No active session",
    "sidebar.gettingStarted": "Getting started",
    "sidebar.connectProvider": "Connect provider",
    "autocomplete.noMatches": "No matching items",
    "whichKey.noBindings": "No reachable bindings",
    "mcp.needsAuth": "Needs auth",
    "sidebar.todo": "Todo",
    "sidebar.modifiedFiles": "Modified Files",
    "sidebar.context": "Context",
    "mcp.connected": "Connected",
    "mcp.disabled": "Disabled",
    "mcp.needsClientId": "Needs client ID",
    "home.welcome": "Welcome to NoCowboy",
    "settings.providers": "Providers",
    "settings.codeIndexing": "Code Indexing",
    "settings.agentModels": "Agent Models",
    "settings.agentModelsCta": "Assign a model to an agent →",
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

/**
 * Phrase translations for strings that are registered as data, not as JSX text:
 * command palette titles, key-binding descriptions, groups and categories.
 *
 * Keeping them keyed by the English source means the ~180 call sites do not
 * each need a dictionary key — the render sites translate once (see `p()`).
 */
export const phrases: Record<string, string> = {
  "Agent": "Агент",
  "Agent cycle": "Цикл агентов",
  "Agent cycle reverse": "Цикл агентов назад",
  "Agent models": "Модели агентов",
  "Attach file": "Прикрепить файл",
  "Autocomplete": "Автодополнение",
  "Automatically show which-key for pending key sequences in overlay mode": "Автопоказ привязок для незавершённых последовательностей",
  "Cancel answer edit": "Отменить правку ответа",
  "Cancel permission rejection": "Отменить отклонение",
  "Cancel workspace restore": "Отменить восстановление",
  "Change the workspace for the session": "Сменить рабочее пространство сессии",
  "Choose workspace": "Выбор рабочего пространства",
  "Clear answer edit": "Очистить правку ответа",
  "Clear prompt": "Очистить промпт",
  "Close dialog": "Закрыть диалог",
  "Close help": "Закрыть помощь",
  "Commands": "Команды",
  "Compact session": "Сжать сессию",
  "Complete autocomplete item": "Завершить автодополнение",
  "Config Warning": "Предупреждение конфига",
  "Confirm alert": "Подтвердить",
  "Confirm dialog selection": "Подтвердить выбор",
  "Confirm permission rejection": "Подтвердить отклонение",
  "Confirm recovery option": "Подтвердить восстановление",
  "Confirm retry option": "Подтвердить повтор",
  "Confirm workspace option": "Подтвердить вариант",
  "Connect provider": "Подключить провайдера",
  "Continue after repeated failures": "Продолжить после повторных сбоев",
  "Copy": "Копировать",
  "Copy last assistant message": "Копировать последний ответ",
  "Copy provider code": "Скопировать код провайдера",
  "Copy session transcript": "Копировать транскрипт сессии",
  "Debug": "Отладка",
  "Default": "По умолчанию",
  "Delete broken session": "Удалить сломанную сессию",
  "Delete workspace": "Удалить рабочее пространство",
  "Dialog": "Диалог",
  "Exit application": "Выйти из приложения",
  "Exit shell mode": "Выйти из режима оболочки",
  "Export session transcript": "Экспорт транскрипта сессии",
  "Failed to delete session": "Не удалось удалить сессию",
  "Failed to delete workspace": "Не удалось удалить рабочее пространство",
  "Favorite": "В избранное",
  "Favorite cycle": "Цикл избранного",
  "Favorite cycle reverse": "Цикл избранного назад",
  "First item": "Первый пункт",
  "First key binding": "Первая привязка",
  "First message": "Первое сообщение",
  "Fork": "Форк",
  "Fork session": "Форк сессии",
  "Full session": "Вся сессия",
  "Go to child session": "К дочерней сессии",
  "Go to parent session": "К родительской сессии",
  "Half page down": "Полстраницы вниз",
  "Half page up": "Полстраницы вверх",
  "Help": "Помощь",
  "Hide autocomplete": "Скрыть автодополнение",
  "Install plugin": "Установить плагин",
  "Interrupt session": "Прервать сессию",
  "Jump to last user message": "К последнему сообщению пользователя",
  "Jump to message": "К сообщению",
  "Jump to the first which-key binding": "К первой привязке",
  "Jump to the last which-key binding": "К последней привязке",
  "Last item": "Последний пункт",
  "Last key binding": "Последняя привязка",
  "Last message": "Последнее сообщение",
  "Line down": "Строка вниз",
  "Line up": "Строка вверх",
  "Loading orgs...": "Загрузка организаций…",
  "Model cycle": "Цикл моделей",
  "Model cycle reverse": "Цикл моделей назад",
  "Network": "Сеть",
  "New session": "Новая сессия",
  "New workspace": "Новое рабочее пространство",
  "Next answer": "Следующий ответ",
  "Next autocomplete item": "Следующее автодополнение",
  "Next child session": "Следующая дочерняя сессия",
  "Next dialog option": "Следующий пункт диалога",
  "Next export option": "Следующий пункт экспорта",
  "Next item": "Следующий пункт",
  "Next key binding group": "Следующая группа привязок",
  "Next message": "Следующее сообщение",
  "Next permission option": "Следующий вариант разрешения",
  "Next prompt history": "Следующая история промптов",
  "Next question": "Следующий вопрос",
  "Next retry option": "Следующий вариант повтора",
  "Next session": "Следующая сессия",
  "Next tab": "Следующая вкладка",
  "No orgs found": "Организации не найдены",
  "None": "Нет",
  "Open": "Открыть",
  "Open docs": "Открыть документацию",
  "Open editor": "Открыть редактор",
  "Open selected session": "Открыть выбранную сессию",
  "Other": "Другое",
  "Page down": "Страница вниз",
  "Page key bindings down": "Группа привязок вниз",
  "Page key bindings up": "Группа привязок вверх",
  "Page the which-key panel down": "Панель привязок на страницу вниз",
  "Page the which-key panel up": "Панель привязок на страницу вверх",
  "Page up": "Страница вверх",
  "Paste": "Вставить",
  "Permission": "Разрешения",
  "Plugins": "Плагины",
  "Popular providers": "Популярные провайдеры",
  "Previous answer": "Предыдущий ответ",
  "Previous autocomplete item": "Предыдущее автодополнение",
  "Previous child session": "Предыдущая дочерняя сессия",
  "Previous dialog option": "Предыдущий пункт диалога",
  "Previous item": "Предыдущий пункт",
  "Previous key binding group": "Предыдущая группа привязок",
  "Previous message": "Предыдущее сообщение",
  "Previous permission option": "Предыдущий вариант разрешения",
  "Previous prompt history": "Предыдущая история промптов",
  "Previous question": "Предыдущий вопрос",
  "Previous retry option": "Предыдущий вариант повтора",
  "Previous session": "Предыдущая сессия",
  "Previous tab": "Предыдущая вкладка",
  "Prompt": "Промпт",
  "Provider": "Провайдер",
  "Providers": "Провайдеры",
  "Question": "Вопрос",
  "Rate last assistant message helpful": "Оценить последний ответ как полезный",
  "Rate last assistant message not helpful": "Оценить последний ответ как бесполезный",
  "Redo": "Повторить",
  "Reject question": "Отклонить вопрос",
  "Remove editor context": "Убрать контекст редактора",
  "Rename session": "Переименовать сессию",
  "Restore broken session": "Восстановить сломанную сессию",
  "Restore to new workspace": "Восстановить в новое рабочее пространство",
  "Restore workspace": "Восстановить рабочее пространство",
  "Resume now": "Продолжить сейчас",
  "Revert": "Откатить",
  "Scroll key bindings down": "Привязки вниз",
  "Scroll key bindings up": "Привязки вверх",
  "Scroll the which-key panel down": "Панель привязок вниз",
  "Scroll the which-key panel up": "Панель привязок вверх",
  "Select answer": "Выбрать ответ",
  "Select autocomplete item": "Выбрать автодополнение",
  "Select permission option": "Выбрать вариант разрешения",
  "Session": "Сессия",
  "Shell mode": "Режим оболочки",
  "Show key bindings": "Показать привязки",
  "Show the next which-key group": "Показать следующую группу",
  "Show the previous which-key group": "Показать предыдущую группу",
  "Sidebar": "Сайдбар",
  "Skills": "Навыки",
  "Stash list": "Список отложенного",
  "Stash pop": "Достать из отложенного",
  "Stash prompt": "Отложить промпт",
  "Stop turn": "Остановить ход",
  "Submit answer": "Отправить ответ",
  "Submit answer edit": "Отправить правку ответа",
  "Submit prompt": "Отправить промпт",
  "Suggested": "Рекомендуемые",
  "Suspend terminal": "Свернуть терминал",
  "Switch agent": "Сменить агента",
  "Switch model": "Сменить модель",
  "Switch model variant": "Сменить вариант модели",
  "Switch org": "Сменить организацию",
  "Switch session": "Сменить сессию",
  "Switch theme": "Сменить тему",
  "Switch which-key between dock and overlay mode": "Переключить режим панели привязок",
  "System": "Система",
  "Toggle MCPs": "Показать/скрыть MCP",
  "Toggle console": "Показать/скрыть консоль",
  "Toggle debug panel": "Показать/скрыть отладку",
  "Toggle export option": "Переключить пункт экспорта",
  "Toggle key bindings layout": "Переключить раскладку привязок",
  "Toggle pending key preview": "Показать/скрыть предпросмотр клавиш",
  "Toggle permission fullscreen": "Полноэкранное разрешение",
  "Toggle session scrollbar": "Показать/скрыть полосу прокрутки",
  "Toggle sidebar": "Показать/скрыть сайдбар",
  "Toggle which-key overlay": "Показать/скрыть панель привязок",
  "Undo previous message": "Отменить последнее сообщение",
  "Unshare session": "Отменить доступ к сессии",
  "Update Failed": "Обновление не удалось",
  "Variant cycle": "Цикл вариантов",
  "View all workspaces": "Все рабочие пространства",
  "View diff": "Показать diff",
  "View status": "Статус",
  "View v2 session messages": "Сообщения v2",
  "Warp": "Warp",
  "Write heap snapshot": "Снимок памяти",
}

/** Translate a registered phrase for the given language (identity when unknown). */
export function translatePhrase(text: string, lang: string): string {
  if (!lang.startsWith("ru")) return text
  return phrases[text] ?? text
}
