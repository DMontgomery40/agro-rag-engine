#!/bin/bash
#
# AGRO Complete Config Migration Script
#
# This runs both phases of the config migration for REACT COMPONENTS ONLY.
# Legacy JS modules in /web/src/modules/ are ALREADY CORRECT - they use
# state.config populated from backend and DOM [name="KEY"] attributes.
#
# This script fixes React components that have:
#   Phase 1: onChange handlers that call setXxx() instead of set('KEY', ...)
#   Phase 2: useState with hardcoded defaults that never sync from get()
#
# Usage:
#   ./fix_complete_config.sh --dry-run    # Preview changes
#   ./fix_complete_config.sh              # Apply changes
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=""

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "=============================================="
    echo "DRY RUN MODE - No changes will be made"
    echo "=============================================="
fi

echo ""
echo "=============================================="
echo "AGRO Complete Config Migration"
echo "=============================================="
echo ""
echo "This script ensures all REACT GUI config fields are:"
echo "  1. Correctly wired to useConfig's set() method"
echo "  2. Initialized from backend config on mount via get()"
echo ""
echo "NOTE: Legacy JS modules (/web/src/modules/*.js) are"
echo "      ALREADY CORRECT - they use state.config from backend."
echo ""
echo "Per AGENTS.md requirements:"
echo "  - Everything must be Pydantic compliant"
echo "  - No false state (ADA compliance)"
echo "  - All settings wired to Zustand store -> backend"
echo ""

# Phase 1: Fix onChange handlers in React components
echo "=============================================="
echo "PHASE 1: Fix React onChange Handlers"
echo "=============================================="
echo ""

REACT_FILES=(
    "web/src/components/RAG/RetrievalSubtab.tsx"
    "web/src/components/RAG/IndexingSubtab.tsx"
    "web/src/components/RAG/LearningRankerSubtab.tsx"
    "web/src/components/RAG/ExternalRerankersSubtab.tsx"
    "web/src/components/RAG/DataQualitySubtab.tsx"
    "web/src/components/RAG/EvaluateSubtab.tsx"
    "web/src/components/Settings/SettingsPanel.tsx"
    "web/src/components/Profiles/ProfilesPanel.tsx"
)

for FILE in "${REACT_FILES[@]}"; do
    if [[ -f "$FILE" ]]; then
        echo "Processing: $FILE"
        python3 "$SCRIPT_DIR/fix_onchange_handlers.py" "$FILE" $DRY_RUN
        echo ""
    else
        echo "⚠️  File not found: $FILE (may not exist yet)"
    fi
done

# Phase 2: Add useEffect config initialization to React components
echo ""
echo "=============================================="
echo "PHASE 2: Add useEffect Config Initialization"
echo "=============================================="
echo ""

# Run on the entire components directory to catch all React files
if [[ -d "web/src/components" ]]; then
    python3 "$SCRIPT_DIR/fix_config_init.py" "web/src/components" $DRY_RUN
else
    echo "⚠️  web/src/components directory not found"
    echo "    Run this script from the agro-rag-engine root directory"
    exit 1
fi

echo ""
echo "=============================================="
if [[ -z "$DRY_RUN" ]]; then
    echo "Migration Complete!"
    echo ""
    echo "What was fixed:"
    echo "  ✅ React onChange handlers now call set('KEY', value)"
    echo "  ✅ React useState values now sync from get() on mount"
    echo "  ✅ Zustand store properly connected to Pydantic backend"
    echo ""
    echo "What was NOT touched (already correct):"
    echo "  ✅ Legacy JS modules in /web/src/modules/"
    echo "  ✅ They use state.config from backend"
    echo "  ✅ They use DOM [name='KEY'] for form fields"
    echo ""
    echo "Next steps:"
    echo "  1. cd web && npm run dev"
    echo "  2. Open http://localhost:5173"
    echo "  3. Test that config values load correctly from backend"
    echo "  4. Verify changes save properly"
    echo ""
    echo "Run Playwright smoke test before committing:"
    echo "  npx playwright test --config=playwright.web.config.ts"
else
    echo "DRY RUN Complete"
    echo ""
    echo "Run without --dry-run to apply changes:"
    echo "  ./fix_complete_config.sh"
fi
echo "=============================================="
