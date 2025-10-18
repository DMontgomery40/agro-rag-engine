#!/usr/bin/env bash
# Install lightweight auto-index hooks.
# Usage: bash scripts/install_git_hooks.sh

set -euo pipefail

HOOKS_DIR=".git/hooks"
mkdir -p "$HOOKS_DIR"

cat > "$HOOKS_DIR/post-checkout" << 'H'
#!/usr/bin/env bash
# Auto-index on branch changes when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
# Use shared profile by default
export OUT_DIR_BASE="./out.noindex-shared"
python -m indexer.index_repo >/dev/null 2>&1 || true
H

cat > "$HOOKS_DIR/post-commit" << 'H'
#!/usr/bin/env bash
# Auto-index on commit when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
export OUT_DIR_BASE="./out.noindex-shared"
python -m indexer.index_repo >/dev/null 2>&1 || true
H

chmod +x "$HOOKS_DIR/post-checkout" "$HOOKS_DIR/post-commit"
echo "Installed git hooks. Enable with: export AUTO_INDEX=1"

# Install pre-commit guard for root .py/.json hygiene
cat > "$HOOKS_DIR/pre-commit" << 'H'
#!/usr/bin/env bash
# Block new root-level .py/.json files unless whitelisted.
set -euo pipefail

# files staged for commit
staged=$(git diff --cached --name-only)

# whitelist (root only)
WL=(
  "repos.json"
  "package.json"
  "package-lock.json"
)

violations=()
while IFS= read -r f; do
  # only root-level files
  [[ "$f" == */* ]] && continue
  case "$f" in
    *.py|*.json)
      allowed=0
      for w in "${WL[@]}"; do
        if [[ "$f" == "$w" ]]; then allowed=1; break; fi
      done
      if [[ $allowed -eq 0 ]]; then
        violations+=("$f")
      fi
      ;;
  esac
done <<< "$staged"

if [[ ${#violations[@]} -gt 0 ]]; then
  echo "[pre-commit] Root .py/.json files are not allowed. Move these into an existing folder (e.g., cli/, eval/, scripts/, data/):" >&2
  for v in "${violations[@]}"; do echo "  - $v" >&2; done
  echo "Whitelist is temporary and will be tightened later." >&2
  exit 1
fi
H

chmod +x "$HOOKS_DIR/pre-commit"
echo "Installed pre-commit guard for root .py/.json hygiene"
