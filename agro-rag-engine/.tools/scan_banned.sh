#!/usr/bin/env bash
set -euo pipefail
git ls-files | \
  grep -v -E "(^\.git|^\.venv/|^node_modules/|^dist/|^build/|^\.next/|^data/|^\.tools/|^internal_docs\.md/)" | \
  xargs -I{} grep -nH -F -f .tools/banned_terms.txt "{}" && exit 1 || exit 0
