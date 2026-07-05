# Система Hooks

## Что это

Hooks — точки входа в жизненный цикл агента. Позволяют выполнять произвольные команды до/после использования инструментов, при старте/завершении сессии, и при остановке.

## Команды

- `hooks_list` — показать все зарегистрированные hooks
- `hooks_register` — создать hook для события
- `hooks_remove` — удалить hook
- `hooks_persist` — сохранить hooks в `.nocowboy/hooks.json`
- `hooks_fire` — вручную запустить событие

## События

| Событие | Когда срабатывает |
|---------|-------------------|
| `PreToolUse` | Перед вызовом любого инструмента |
| `PostToolUse` | После вызова инструмента |
| `SessionStart` | При старте сессии |
| `SessionEnd` | При завершении сессии |
| `Stop` | При остановке |

## Типы обработчиков

- `command` — shell команда
- `http` — HTTP запрос
- `mcp_tool` — вызов MCP инструмента

## Пример

```json
{
  "event": "PreToolUse",
  "matcher": "Bash|Edit",
  "type": "command",
  "command": "echo 'Tool used: $TOOL_NAME' >> /tmp/hook.log"
}
```
