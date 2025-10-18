#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
. .venv/bin/activate
export PYTHONPATH="$ROOT_DIR"
# Optional local model: leave disabled by default
# export OLLAMA_URL=http://127.0.0.1:11434/api
# export GEN_MODEL=qwen3-coder:30b
python scripts/test_token_comparison.py
