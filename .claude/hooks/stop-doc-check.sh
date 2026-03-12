#!/usr/bin/env bash
# Stop hook: Checks if structural files were changed without updating docs/architecture.md.
# Uses git diff to detect uncommitted changes in critical paths.

set -euo pipefail

# Get list of changed files (staged + unstaged) relative to HEAD
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
STAGED=$(git diff --name-only --cached 2>/dev/null || true)
ALL_CHANGES=$(printf '%s\n%s' "$CHANGED" "$STAGED" | sort -u)

# If no changes at all, allow
if [ -z "$ALL_CHANGES" ]; then
  exit 0
fi

# Check if any structural files changed
STRUCTURAL=false
if echo "$ALL_CHANGES" | grep -qE '^src/lib/|^src/app/api/|^src/components/|/page\.tsx$|^src/middleware\.ts$'; then
  STRUCTURAL=true
fi

# If no structural changes, allow
if [ "$STRUCTURAL" = false ]; then
  exit 0
fi

# Check if docs/architecture.md was also changed
if echo "$ALL_CHANGES" | grep -q '^docs/architecture.md'; then
  exit 0
fi

# Structural files changed but docs/architecture.md was not updated
echo '{"decision":"block","reason":"Structural files were changed but docs/architecture.md was not updated. Please update it to reflect the changes."}'
