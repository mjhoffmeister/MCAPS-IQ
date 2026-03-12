#!/usr/bin/env bash
#
# subtree-sync.sh — Push subtree prefixes to their upstream remotes
#                    when local changes are detected.
#
# Usage:
#   scripts/subtree-sync.sh              # auto-detect changed subtrees
#   scripts/subtree-sync.sh --all        # force-push all subtrees
#   scripts/subtree-sync.sh --dry-run    # show what would be pushed
#
# Called automatically by the pre-push hook, or manually via:
#   npm run subtree:sync
#
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────
# Each entry: "prefix:remote:branch"
SUBTREES=(
  "mcp/msx:msx-mcp:main"
  "mcp/oil:oil:main"
)

# ── Flags ─────────────────────────────────────────────────────────
DRY_RUN=false
FORCE_ALL=false
RANGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN=true; shift ;;
    --all)      FORCE_ALL=true; shift ;;
    --range)    RANGE="$2"; shift 2 ;;
    *)          echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────
has_changes() {
  local prefix="$1"
  if [[ -n "$RANGE" ]]; then
    # Check if any commits in the push range touch the prefix
    git diff --name-only "$RANGE" -- "$prefix/" 2>/dev/null | grep -q .
  else
    # Fallback: compare HEAD to the remote tracking branch
    local upstream
    upstream=$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo "")
    if [[ -n "$upstream" ]]; then
      git diff --name-only "$upstream"..HEAD -- "$prefix/" 2>/dev/null | grep -q .
    else
      # No upstream tracking — assume changes exist
      return 0
    fi
  fi
}

push_subtree() {
  local prefix="$1" remote="$2" branch="$3"

  if $DRY_RUN; then
    echo "  [dry-run] would push $prefix → $remote/$branch"
    return 0
  fi

  echo "  Pushing $prefix → $remote/$branch ..."
  if git subtree push --prefix="$prefix" "$remote" "$branch"; then
    echo "  ✓ $prefix synced"
  else
    echo "  ✗ $prefix push failed (exit $?)" >&2
    return 1
  fi
}

# ── Main ──────────────────────────────────────────────────────────
echo "subtree-sync: checking subtrees..."

failures=0
pushed=0

for entry in "${SUBTREES[@]}"; do
  IFS=: read -r prefix remote branch <<< "$entry"

  # Verify the remote exists
  if ! git remote get-url "$remote" &>/dev/null; then
    echo "  ⚠ remote '$remote' not found, skipping $prefix"
    continue
  fi

  if $FORCE_ALL || has_changes "$prefix"; then
    push_subtree "$prefix" "$remote" "$branch" || ((failures++))
    ((pushed++))
  else
    echo "  – $prefix: no changes, skipping"
  fi
done

if [[ $pushed -eq 0 ]]; then
  echo "subtree-sync: nothing to push"
fi

if [[ $failures -gt 0 ]]; then
  echo "subtree-sync: $failures subtree(s) failed to push" >&2
  echo "  Tip: push the monorepo first, then run 'npm run subtree:sync' manually." >&2
  # Exit 0 so it doesn't block the monorepo push from the hook
  # Change to 'exit 1' if you want subtree failures to block pushes
  exit 0
fi

exit 0
