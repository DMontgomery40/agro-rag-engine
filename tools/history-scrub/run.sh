#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d .git ]] || [[ $(git rev-parse --is-bare-repository) != "true" ]]; then
  echo "Run this from a --mirror clone (bare repository)." >&2
  exit 1
fi

if ! python3 -c 'import git_filter_repo' >/dev/null 2>&1; then
  echo "Installing git-filter-repo..." >&2
  python3 -m pip install --user git-filter-repo
fi

echo "Scrubbing history (paths + blob contents)..."
python3 ../tools/history-scrub/scrub_filter.py

echo "Review a sample of refs and search results:"
git show-ref | head -n 20
git grep -nI -E "${SCRUB_TOKENS:-token1}|\bcode_chunks_target\b|\btarget\b" --all | head -n 20 || true

echo "Done. Inspect, then push with: git push --mirror --force"
