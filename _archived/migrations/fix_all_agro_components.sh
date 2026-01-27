#!/bin/bash
#
# fix_all_agro_components.sh
# Run from the agro-rag-engine directory
#
# This script applies the onChange handler fixes to all partially-migrated
# AGRO config components.
#
# Usage:
#   ./fix_all_agro_components.sh          # Fix all files
#   ./fix_all_agro_components.sh --dry-run  # Preview changes only
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_SCRIPT="$SCRIPT_DIR/fix_onchange_handlers.py"

# Files to process (relative to agro-rag-engine root)
FILES=(
    "web/src/components/RAG/RetrievalSubtab.tsx"
    "web/src/components/RAG/IndexingSubtab.tsx"
    "web/src/components/RAG/LearningRankerSubtab.tsx"
    "web/src/components/RAG/ExternalRerankersSubtab.tsx"
    "web/src/components/RAG/DataQualitySubtab.tsx"
    "web/src/components/RAG/EvaluateSubtab.tsx"
)

DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "=== DRY RUN MODE - No files will be modified ==="
fi

echo ""
echo "AGRO Config Migration - Fix onChange Handlers"
echo "=============================================="
echo ""

TOTAL_FIXED=0

for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "Processing: $file"
        # Run the fix script and capture output
        OUTPUT=$(python3 "$FIX_SCRIPT" "$file" $DRY_RUN 2>&1)
        echo "$OUTPUT" | grep -E "(✅|⚠️|Fixed|Would fix)"
        
        # Extract count from output
        COUNT=$(echo "$OUTPUT" | grep -oE "(Fixed|Would fix) [0-9]+" | grep -oE "[0-9]+")
        if [[ -n "$COUNT" ]]; then
            TOTAL_FIXED=$((TOTAL_FIXED + COUNT))
        fi
        echo ""
    else
        echo "⚠️  File not found: $file"
        echo ""
    fi
done

echo "=============================================="
if [[ -n "$DRY_RUN" ]]; then
    echo "Total: Would fix $TOTAL_FIXED onChange handlers"
    echo ""
    echo "Run without --dry-run to apply changes."
else
    echo "Total: Fixed $TOTAL_FIXED onChange handlers"
    echo ""
    echo "Next steps:"
    echo "  1. cd web && npm run dev"
    echo "  2. Open http://localhost:5173"
    echo "  3. Test the RAG configuration tabs"
fi
