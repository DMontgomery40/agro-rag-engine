#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[down] Stopping and removing Docker stack (agro project) ..."
docker compose down -v || true

echo "[down] Pruning dangling worktrees (no delete of external dirs) ..."
git worktree prune || true

echo "[down] Done."

