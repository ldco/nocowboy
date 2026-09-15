# Attestation: UI Локализация (русские метки + переключатель языка)
**Пункт ROADMAP:** v0.10.0 — UI Локализация
**Агент:** reviewer (deepseek-v4-pro)
**Дата:** 2026-09-15
**Вердикт:** PASS

## Критические критерии
- ✅ [check #1]: `I18n` модуль экспортирует сервис, читающий `lang` из `Config.Service` — `packages/opencode/src/nocowboy/ui/i18n.ts` (import Config, `Effect` layer).
- ✅ [check #2]: Русские метки для sidebar, диалогов и ошибок — словарь `ru` содержит `sidebar.sessions` ("Сессии"), `sidebar.settings`, `dialog.ok`, `dialog.cancel`, `settings.language`, `error.*`, `status.*` (всего 35 ключей).

## Некритические критерии
- ✅ [check #3]: SolidJS `I18nProvider` создан и готов к подключению — `packages/opencode/src/cli/cmd/tui/context/i18n.tsx` (`I18nProvider`, `useI18n`).

## Доказательства
- `packages/opencode/src/nocowboy/ui/i18n.ts:50-58` — русский словарь (sidebar/dialog ключи).
- `packages/opencode/src/cli/cmd/tui/context/i18n.tsx` — контекст-провайдер с fallback на ключ.
- `packages/opencode/src/config/config.ts` — поле `lang` в схеме конфига.

## Границы и риски
- Критерии фичи выполнены: модуль, словарь и провайдер существуют (AC явно формулирует провайдер как «готов к подключению»).
- **Не** выполнено и вынесено отдельно: перевод самих TUI-компонентов на `useI18n()` — ни один компонент пока не вызывает контекст. Это отдельная задача (UI-интеграция), не входящая в AC этой фичи.
- Смена языка применяется при следующем рендере/перезапуске TUI.
