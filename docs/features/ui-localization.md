# UI Локализация (русские метки + переключатель языка)

> Generated from docs/roadmap.json — part of NoCowboy verification system.

## Description
Создана i18n система (src/nocowboy/ui/i18n.ts) с 35 ключами для sidebar, dialog, settings, error, status, session, search, home, chat. Читает lang из конфига. Создан SolidJS I18nProvider (src/cli/cmd/tui/context/i18n.tsx). TUI sidebar использует хардкодные английские строки — требует добавления lang в TuiConfig.

## Key files
- `packages/opencode/src/nocowboy/ui/i18n.ts`
- `packages/opencode/src/cli/cmd/tui/context/i18n.tsx`

## Verification
- File existence: ✅ tracked
- Attestation for overseer: ✅ required
