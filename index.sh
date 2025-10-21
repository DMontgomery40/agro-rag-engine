#!/bin/bash
# Helper script to run indexer with correct PYTHONPATH
# Usage: ./index.sh [args to pass to indexer]

set -e

cd "$(dirname "$0")"

export PYTHONPATH="$(pwd)"

echo "Running indexer from project root..."
echo "PYTHONPATH=$PYTHONPATH"
echo ""

python indexer/index_repo.py "$@"
