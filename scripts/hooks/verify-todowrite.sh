#!/bin/bash
# verify-todowrite.sh
# PreToolUse hook for todowrite.
# Blockiert `status: "completed"` in todowrite — es muss einen Befehl-Beweis geben.
#
# Der Hook bekommt das Tool-Argument (die Todos) via stdin als JSON.
# Wir checken: wenn ein Todo-Item `status: "completed"` hat,
# blockieren wir den Aufruf.

set -e

# Lies das Argument (JSON-String mit den todos)
INPUT=$(cat /dev/stdin 2>/dev/null || echo "")

# Prüfe ob "completed" irgendwo im JSON vorkommt
if echo "$INPUT" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
except:
    sys.exit(0)  # Kein gültiges JSON -> erlauben

# data sollte { todos: [{ content, status, priority }, ...] } sein
todos = []
if isinstance(data, dict):
    todos = data.get('todos', [])
elif isinstance(data, list):
    todos = data

for t in todos:
    if t.get('status') == 'completed':
        print(f'BLOCKED: todo \"{t.get(\"content\", \"?\")[:60]}\" hat status=completed')
        sys.exit(1)

sys.exit(0)
" 2>&1; then
    exit 0
else
    echo ""
    echo "❌ BLOCKED by verify-todowrite hook"
    echo ""
    echo "Du hast versucht, status=\"completed\" in todowrite zu setzen."
    echo "Das ist VERBOTEN ohne Ausgabe eines Bestätigungs-Befehls."
    echo ""
    echo "Erlaubt sind nur:"
    echo "  - status: \"in_progress\""
    echo "  - status: \"pending\""
    echo ""
    echo "Beweis für Fertigstellung MUSS im selben Message-Text stehen:"
    echo "  - typecheck: 0 errors (mit Output)"
    echo "  - test: N pass (mit Output)"
    echo ""
    exit 1
fi