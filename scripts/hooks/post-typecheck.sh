#!/bin/bash
# post-typecheck.sh
# PostToolUse hook for Write|Edit|SearchReplace|ApplyPatch
# Автоматически запускает bun run typecheck ПОСЛЕ каждого изменения кода.
# Результат сохраняется в /tmp/.last-typecheck.json для последующей проверки.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$ROOT/packages/opencode"
OUTPUT_FILE="/tmp/.last-typecheck.json"

# Фоновый запуск typecheck (не блокирует инструмент)
{
  cd "$PROJECT_DIR" 2>/dev/null || exit 0
  
  # Запускаем typecheck с таймаутом 120s
  OUTPUT=$(timeout 120 bun run typecheck 2>&1)
  EXIT_CODE=$?
  
  # Парсим результаты
  if [ $EXIT_CODE -eq 0 ]; then
    echo '{"status":"passed","errors":0,"output":"typecheck: 0 errors"}' > "$OUTPUT_FILE"
  elif [ $EXIT_CODE -eq 124 ]; then
    echo '{"status":"timeout","errors":-1,"output":"typecheck timed out after 120s"}' > "$OUTPUT_FILE"
  else
    ERROR_COUNT=$(echo "$OUTPUT" | grep -c "error:" 2>/dev/null || echo "?")
    echo "{\"status\":\"failed\",\"errors\":$ERROR_COUNT,\"output\":$(echo "$OUTPUT" | head -20 | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))")}" > "$OUTPUT_FILE"
  fi
} &
