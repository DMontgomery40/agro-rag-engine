#!/usr/bin/env python3
"""
Add element IDs to React LearningRankerSubtab to match /gui exactly
"""

from pathlib import Path
import re

# Read the React component
react_file = Path('web/src/components/RAG/LearningRankerSubtab.tsx')
content = react_file.read_text()

# ID mappings: (line pattern, id to add)
id_mappings = [
    # Container
    ('className="rag-subtab-content"', 'id="tab-rag-learning-ranker" className="rag-subtab-content"'),
    
    # Status displays
    ('{status.enabled}', '{status.enabled}', 'id="reranker-enabled-status"'),
    ('{status.queryCount}', '{status.queryCount}', 'id="reranker-query-count"'),
    ('{status.tripletCount}', '{status.tripletCount}', 'id="reranker-triplet-count"'),
    
    # Buttons
    ('onClick={handleMineTriplets}', 'id="reranker-mine-btn" onClick={handleMineTriplets}'),
    ('onClick={handleTrain}', 'id="reranker-train-btn" onClick={handleTrain}'),
    ('onClick={handleEvaluate}', 'id="reranker-eval-btn" onClick={handleEvaluate}'),
    ('onClick={handleSaveBaseline}', 'id="reranker-save-baseline" onClick={handleSaveBaseline}'),
    ('onClick={handleCompareBaseline}', 'id="reranker-compare-baseline" onClick={handleCompareBaseline}'),
    ('onClick={handleRollback}', 'id="reranker-rollback" onClick={handleRollback}'),
    ('onClick={handleViewLogs}', 'id="reranker-view-logs" onClick={handleViewLogs}'),
    ('onClick={handleDownloadLogs}', 'id="reranker-download-logs" onClick={handleDownloadLogs}'),
    ('onClick={handleClearLogs}', 'id="reranker-clear-logs" onClick={handleClearLogs}'),
    ('onClick={handleSetupCron}', 'id="reranker-setup-cron" onClick={handleSetupCron}'),
    ('onClick={handleRemoveCron}', 'id="reranker-remove-cron" onClick={handleRemoveCron}'),
    ('onClick={handleSmokeTest}', 'id="reranker-smoke-test" onClick={handleSmokeTest}'),
]

print("Adding element IDs to match /gui...")
print(f"Processing: {react_file}")
print(f"Original length: {len(content)} chars")

# This approach won't work well with search/replace
# Need to manually add IDs
print("\n⚠️  Manual ID addition required")
print("Use search_replace tool to add these IDs:")
for pattern in id_mappings[:5]:
    print(f"  - {pattern}")

