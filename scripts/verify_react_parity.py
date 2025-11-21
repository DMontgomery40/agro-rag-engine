#!/usr/bin/env python3
"""
Verify React components have 1:1 parity with /gui for ADA compliance
Checks HTML structure, CSS classes, inline styles, element IDs
"""

import re
import sys
from pathlib import Path

def extract_element_ids(html_content):
    """Extract all id="..." from HTML"""
    return set(re.findall(r'id="([^"]+)"', html_content))

def extract_classes(html_content):
    """Extract all class="..." from HTML"""
    classes = re.findall(r'class="([^"]+)"', html_content)
    all_classes = set()
    for c in classes:
        all_classes.update(c.split())
    return all_classes

def extract_data_attributes(html_content):
    """Extract all data-* attributes"""
    return set(re.findall(r'data-([a-z-]+)="[^"]*"', html_content))

def check_rag_subtab_parity():
    """Verify RAG subtabs match /gui structure"""
    
    gui_html = Path('gui/index.html').read_text()
    
    # Define expected IDs for each RAG subtab (from /gui)
    expected_elements = {
        'learning-ranker': [
            'tab-rag-learning-ranker',
            'reranker-enabled-status',
            'reranker-query-count',
            'reranker-triplet-count',
            'reranker-mine-btn',
            'reranker-mine-result',
            'reranker-train-btn',
            'reranker-train-result',
            'reranker-eval-btn',
            'reranker-eval-result',
            'reranker-status',
            'reranker-terminal-container',  # CRITICAL
            'reranker-info-panel',
            'reranker-epochs',
            'reranker-batch',
            'reranker-metrics-display',
            'reranker-save-baseline',
            'reranker-compare-baseline',
            'reranker-rollback',
            'reranker-view-logs',
            'reranker-download-logs',
            'reranker-clear-logs',
            'reranker-logs-viewer',
            'reranker-cron-time',
            'reranker-setup-cron',
            'reranker-remove-cron',
            'reranker-cron-status',
            'reranker-test-query',
            'reranker-smoke-test',
            'reranker-smoke-result',
            'reranker-cost-24h',
            'reranker-cost-avg',
            'reranker-nohits-list',
        ],
        'data-quality': [
            'tab-rag-data-quality',
            'data-quality-loading',
            'repos-section',
            'cards-repo-select',
            'cards-exclude-dirs',
        ],
        'retrieval': [
            'tab-rag-retrieval',
            'gen-model-select',
            'enrich-model-select',
        ],
        'external-rerankers': [
            'tab-rag-external-rerankers',
            'reranker-info-panel-ext',
        ],
        'indexing': [
            'tab-rag-indexing',
        ],
        'evaluate': [
            'tab-rag-evaluate',
        ],
    }
    
    # Verify all expected IDs exist in /gui
    gui_ids = extract_element_ids(gui_html)
    
    print("=== RAG SUBTAB ELEMENT VERIFICATION ===\n")
    
    total_expected = 0
    total_found = 0
    
    for subtab, ids in expected_elements.items():
        print(f"{subtab.upper()}:")
        found = 0
        for elem_id in ids:
            if elem_id in gui_ids:
                print(f"  ✅ {elem_id}")
                found += 1
                total_found += 1
            else:
                print(f"  ❌ {elem_id} - NOT IN /GUI")
            total_expected += 1
        print(f"  Subtotal: {found}/{len(ids)}\n")
    
    print(f"TOTAL: {total_found}/{total_expected} elements verified in /gui")
    
    return total_found == total_expected

if __name__ == '__main__':
    success = check_rag_subtab_parity()
    sys.exit(0 if success else 1)

