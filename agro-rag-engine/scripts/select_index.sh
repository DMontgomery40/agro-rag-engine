#!/usr/bin/env bash
# Usage: source scripts/select_index.sh shared|gui|devclean

set -euo pipefail

PROFILE="${1:-shared}"
case "$PROFILE" in
  shared)
    export OUT_DIR_BASE="./out.noindex-shared"
    export COLLECTION_NAME="code_chunks_agro_shared"
    ;;
  gui)
    export OUT_DIR_BASE="./out.noindex-gui"
    export COLLECTION_NAME="code_chunks_agro_gui"
    ;;
  devclean)
    export OUT_DIR_BASE="./out.noindex-devclean"
    export COLLECTION_NAME="code_chunks_agro_devclean"
    ;;
  *)
    echo "unknown profile: $PROFILE" >&2
    return 1
    ;;
esac

export REPO="agro"
echo "Selected index profile: $PROFILE"
echo "  OUT_DIR_BASE=$OUT_DIR_BASE"
echo "  COLLECTION_NAME=$COLLECTION_NAME"
echo "  REPO=$REPO"
