#!/usr/bin/env bash
set -euo pipefail

# Prints safe remote delete commands for non-core branches on 'origin'.
# Does NOT execute push. Review carefully before running.

CORE=(main development staging)
remote=${1:-origin}

mapfile -t rems < <(git for-each-ref --format='%(refname:short)' refs/remotes/$remote | sed "s#^$remote/##" | sort -u)

for br in "${rems[@]}"; do
  skip=0
  for c in "${CORE[@]}"; do
    if [ "$br" = "$c" ]; then skip=1; break; fi
  done
  if [ $skip -eq 1 ]; then continue; fi
  echo "git push $remote --delete $br"
done

