#!/usr/bin/env bash
set -euo pipefail

# AGRO Repo Cleanup & Archival (local-only)
# - Inventories local/remote branches and worktrees
# - Archives each non-core local branch to bundles + patches under out/archives/
# - Generates per-branch reports of diffs vs development
# - Optionally deletes local branches after archiving (no remote push)

CORE_BRANCHES=(main development staging)
TS=$(date -u +%Y%m%d-%H%M%S)
ROOT_DIR="$(git rev-parse --show-toplevel)"
OUT_DIR="$ROOT_DIR/out/archives/$TS"
REPORTS="$OUT_DIR/reports"
PATCHES="$OUT_DIR/patches"
BUNDLES="$OUT_DIR/bundles"
mkdir -p "$REPORTS" "$PATCHES" "$BUNDLES"

echo "[cleanup] Output directory: $OUT_DIR"

echo "[cleanup] Collecting inventory ..."
git for-each-ref --format='%(refname:short)' refs/heads > "$REPORTS/local_branches.txt"
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads > "$REPORTS/local_upstreams.txt"
git for-each-ref --format='%(refname:short)' refs/remotes > "$REPORTS/remote_branches.txt"
git worktree list > "$REPORTS/worktrees.txt" || true

echo "[cleanup] Writing branch summaries ..."
{
  echo "branch,ahead,behind,changed_files,commits,has_upstream"
  while read -r br; do
    # ahead/behind vs development
    if git show-ref --verify --quiet "refs/heads/$br"; then
      # compute ahead/behind vs development; handle branches without merge-base
      if git merge-base --is-ancestor development "$br" >/dev/null 2>&1 || git merge-base "$br" development >/dev/null 2>&1; then
        set +e
        ab=$(git rev-list --left-right --count development..."$br" 2>/dev/null)
        rc=$?
        set -e
        if [ $rc -ne 0 ]; then ahead=0; behind=0; else ahead=$(echo "$ab"|awk '{print $2}'); behind=$(echo "$ab"|awk '{print $1}'); fi
        changed=$(git diff --name-only development..."$br" | wc -l | awk '{print $1}')
      else
        ahead=NA; behind=NA; changed=NA
      fi
      commits=$(git rev-list --count "$br" 2>/dev/null || echo 0)
      if git rev-parse --abbrev-ref --symbolic-full-name "$br@{u}" >/dev/null 2>&1; then up=1; else up=0; fi
      echo "$br,$ahead,$behind,$changed,$commits,$up"
    fi
  done < "$REPORTS/local_branches.txt"
} > "$REPORTS/branch_summary.csv"

echo "[cleanup] Archiving non-core local branches ..."
while read -r br; do
  skip=0
  for core in "${CORE_BRANCHES[@]}"; do
    if [ "$br" = "$core" ]; then skip=1; break; fi
  done
  if [ $skip -eq 1 ]; then continue; fi

  # bundle and patch relative to development
  safe=$(echo "$br" | tr '/' '_')
  git bundle create "$BUNDLES/$safe.bundle" "$br" >/dev/null 2>&1 || true
  if git merge-base --is-ancestor development "$br" >/dev/null 2>&1 || git merge-base "$br" development >/dev/null 2>&1; then
    git diff --binary development..."$br" > "$PATCHES/$safe.diff" || true
    git log --oneline --decorate --no-merges development.."$br" > "$REPORTS/$safe.commits.txt" || true
    git diff --name-status development..."$br" > "$REPORTS/$safe.files.txt" || true
  else
    echo "no-merge-base" > "$REPORTS/$safe.nomergemeta"
  fi
done < "$REPORTS/local_branches.txt"

echo "[cleanup] Archiving remote-only branches ..."
# Gather remote branches (unique names without remote prefix)
git for-each-ref --format='%(refname:short)' refs/remotes | sed 's#^origin/##' | sort -u > "$REPORTS/_remote_names.txt"
while read -r br; do
  # skip core branches
  skip=0
  for core in "${CORE_BRANCHES[@]}"; do
    if [ "$br" = "$core" ]; then skip=1; break; fi
  done
  if [ $skip -eq 1 ]; then continue; fi
  # if local exists, it was handled above
  if grep -qx "$br" "$REPORTS/local_branches.txt"; then continue; fi
  safe=$(echo "$br" | tr '/' '_')
  git bundle create "$BUNDLES/remote_$safe.bundle" "origin/$br" >/dev/null 2>&1 || true
  if git merge-base --is-ancestor development "origin/$br" >/dev/null 2>&1 || git merge-base "origin/$br" development >/dev/null 2>&1; then
    git diff --binary development..."origin/$br" > "$PATCHES/remote_$safe.diff" || true
    git log --oneline --decorate --no-merges development.."origin/$br" > "$REPORTS/remote_$safe.commits.txt" || true
    git diff --name-status development..."origin/$br" > "$REPORTS/remote_$safe.files.txt" || true
  else
    echo "no-merge-base" > "$REPORTS/remote_$safe.nomergemeta"
  fi
done < "$REPORTS/_remote_names.txt"

echo "[cleanup] Generating consolidated INDEX.md ..."
{
  echo "# Archives Index ($TS)"
  echo
  echo "Output: out/archives/$TS"
  echo
  echo "## Branch Summary"
  echo
  cat "$REPORTS/branch_summary.csv" | sed '1!s/^/- /'
  echo
  echo "## Worktrees"
  echo
  cat "$REPORTS/worktrees.txt" || true
  echo
  echo "## Remote branches"
  echo
  cat "$REPORTS/remote_branches.txt" || true
} > "$OUT_DIR/INDEX.md"

if [[ "${DELETE_AFTER_ARCHIVE:-0}" = "1" ]]; then
  echo "[cleanup] Deleting non-core local branches (local only) ..."
  while read -r br; do
    keep=0
    for core in "${CORE_BRANCHES[@]}"; do
      if [ "$br" = "$core" ]; then keep=1; break; fi
    done
    if [ $keep -eq 1 ]; then continue; fi
    git branch -D "$br" || true
  done < "$REPORTS/local_branches.txt"
fi

echo "[cleanup] Done. Review $OUT_DIR/INDEX.md and reports/ before any remote deletes."
