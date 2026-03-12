#!/usr/bin/env bash
# PostToolUse hook: Checks if a file edit touches documentation-critical paths.
# If it does, outputs JSON reminding Claude to verify docs/architecture.md.
# Reads tool event from stdin (JSON with tool_input.file_path).

set -euo pipefail

# Read stdin into variable
INPUT=$(cat)

# Extract file_path from the JSON input.
# Try jq first, fall back to simple pattern matching.
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
else
  # Fallback: extract file_path with grep/sed
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)
fi

# If no file path found, exit silently
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize path separators (Windows backslash to forward slash)
FILE_PATH=$(echo "$FILE_PATH" | tr '\\' '/')

# Check if file matches documentation-critical patterns
MATCHED=false

# Match both relative (src/...) and absolute (.../src/...) paths
if echo "$FILE_PATH" | grep -qE '(^|/)src/lib/'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)src/app/api/'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)src/app/.*/page\.tsx$'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)src/components/'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)src/middleware\.ts$'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)next\.config'; then
  MATCHED=true
elif echo "$FILE_PATH" | grep -qE '(^|/)package\.json$'; then
  MATCHED=true
fi

if [ "$MATCHED" = true ]; then
  echo "{\"additionalContext\":\"You edited a documentation-critical file ($FILE_PATH). Before finishing, verify that BOTH docs/architecture.md AND CLAUDE.md still accurately reflect this change. If you created a new file (route, lib module, component), add it to the relevant list in both documents.\"}"
fi

exit 0
