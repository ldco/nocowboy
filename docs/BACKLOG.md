# NoCowboy — Backlog

> Идеи, которые мы накидываем. Не в роадмапе, не в работе. Сюда складываем всё, что «было бы круто сделать».
> Когда идея созрела → переносим в [ROADMAP.md](ROADMAP.md).

---

## YandexGPT / GigaChat
- Поддержка YandexGPT и GigaChat как LLM провайдеров
- Сейчас есть detection код в session/system.ts, но нет реализации провайдеров
- Требуется: регистрация провайдеров, API-клиенты, model list fetching

## UI Локализация
- Русские метки в sidebar, диалогах, ошибках
- Подхватывает `lang: "ru"` из nocowboy.json
- Русская помощь (`/help`)

## NUTAUSIK MCP Prompt Support
- Добавить `ListPromptsRequestSchema`/`GetPromptRequestSchema` в NUTAUSIK MCP
- Prompt templates: `dream`, `memory`, `context_inject`
- Требуется отдельный репозиторий (@nocowboy/mcp-nutausik)
