#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper to ensure Python + venv + deps, then run quick_setup.py.
# Run from rag-service root. Optionally pass a repo path:
#   bash scripts/setup.sh /abs/path/to/your/repo [repo-name]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_PATH="${1:-}"
REPO_NAME="${2:-}"

detect_os() {
  unameOut="$(uname -s || true)"
  case "${unameOut}" in
    Linux*) machine=Linux;;
    Darwin*) machine=Mac;;
    CYGWIN*|MINGW*|MSYS*) machine=Windows;;
    *) machine=Unknown;;
  esac
  echo "$machine"
}

need_python() {
  echo "Python 3 is required. Install it, then rerun:"
  case "$(detect_os)" in
    Mac)
      echo "  brew install python"
      ;;
    Linux)
      echo "  apt update && apt install -y python3 python3-venv python3-pip"
      ;;
    Windows)
      echo "  Install from https://www.python.org/downloads/ and ensure python is in PATH"
      ;;
    *)
      echo "  Install Python 3 for your platform"
      ;;
  esac
}

# Choose best Python (prefer 3.11 for compatibility)
PY_BIN=""
for cand in python3.11 python3.10 python3; do
  if command -v "$cand" >/dev/null 2>&1; then PY_BIN="$cand"; break; fi
done
if [ -z "$PY_BIN" ]; then
  need_python
  exit 1
fi

cd "$ROOT_DIR"

# Create venv if missing (with selected Python)
if [ ! -f .venv/bin/python ] && [ ! -f .venv/Scripts/python.exe ]; then
  echo "[setup] Creating virtualenv (.venv) with $PY_BIN"
  "$PY_BIN" -m venv .venv
fi

# Choose venv python
if [ -f .venv/bin/python ]; then
  VENV_PY=".venv/bin/python"
else
  VENV_PY=".venv/Scripts/python.exe"
fi

echo "[setup] Installing dependencies (this may take a moment)"
if [ -f requirements-rag.txt ]; then "$VENV_PY" -m pip install --disable-pip-version-check -r requirements-rag.txt; fi
if [ -f requirements.txt ]; then "$VENV_PY" -m pip install --disable-pip-version-check -r requirements.txt; fi
"$VENV_PY" -c "import fastapi,qdrant_client,bm25s,langgraph;print('deps ok')" >/dev/null 2>&1 || true

echo "[setup] Launching interactive quick setup"
args=("$ROOT_DIR/scripts/quick_setup.py")
if [ -n "${REPO_PATH}" ]; then args+=("--path" "${REPO_PATH}"); fi
if [ -n "${REPO_NAME}" ]; then args+=("--name" "${REPO_NAME}"); fi
"$VENV_PY" "${args[@]}"

echo "[setup] Done"
