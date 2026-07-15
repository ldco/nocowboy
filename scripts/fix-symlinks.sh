#!/bin/sh
# Принудительное создание workspace symlinks после bun install
# Нужно потому что bun install не всегда пересоздаёт symlinks при rename пакетов

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT" || exit 1

mkdir -p node_modules/@nocowboy

links="
@nocowboy/core:packages/core
@nocowboy/ui:packages/ui
@nocowboy/llm:packages/llm
@nocowboy/plugin:packages/plugin
@nocowboy/indexing:packages/nocowboy-indexing
@nocowboy/gateway:packages/nocowboy-gateway
@nocowboy/telemetry:packages/nocowboy-telemetry
@nocowboy/http-recorder:packages/http-recorder
nocowboy-tui:packages/opencode
"

echo "$links" | while IFS=: read -r name target; do
    [ -z "$name" ] && continue
    link="node_modules/$name"
    # Удаляем старый symlink/директорию если есть
    if [ -L "$link" ] || [ -d "$link" ]; then
        rm -rf "$link"
    fi
    # Создаём symlink (относительный путь)
    ln -sf "../../$target" "$link"
    echo "  ✅ $name -> $target"
done
