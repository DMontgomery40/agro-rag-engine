#!/usr/bin/env python3
"""
Simple test to verify new tooltips exist in tooltips.js
"""
import re


def test_tooltips_exist():
    """Verify the 15 new RAG parameter tooltips exist in tooltips.js"""

    new_tooltips = [
        'CARD_SEARCH_ENABLED',
        'EMBEDDING_MODEL',
        'VOYAGE_MODEL',
        'EMBEDDING_MODEL_LOCAL',
        'EMBEDDING_BATCH_SIZE',
        'EMBEDDING_MAX_TOKENS',
        'INDEXING_BATCH_SIZE',
        'INDEXING_WORKERS',
        'BM25_STEMMER_LANG',
        'VOYAGE_RERANK_MODEL',
        'AGRO_RERANKER_RELOAD_ON_CHANGE',
        'ENRICH_DISABLED',
        'KEYWORDS_MAX_PER_REPO',
        'KEYWORDS_AUTO_GENERATE',
        'TRACE_SAMPLING_RATE',
    ]

    # Read tooltips.js
    with open('/Users/davidmontgomery/agro-rag-engine/gui/js/tooltips.js', 'r') as f:
        content = f.read()

    print("\n=== Testing New RAG Parameter Tooltips ===\n")

    found = 0
    missing = []

    for param in new_tooltips:
        # Look for the tooltip definition (matches multi-line L() calls)
        pattern = rf'{param}:\s*L\('
        if re.search(pattern, content):
            # Extract the full tooltip definition including nested arrays
            # Match from param: L( to the closing ), including nested parens and arrays
            start_match = re.search(rf'{param}:\s*L\(', content)
            if start_match:
                start_pos = start_match.start()
                # Find the matching closing paren by counting brackets
                paren_depth = 0
                end_pos = start_match.end() - 1  # Start at the opening (
                for i in range(start_match.end() - 1, len(content)):
                    if content[i] == '(':
                        paren_depth += 1
                    elif content[i] == ')':
                        paren_depth -= 1
                        if paren_depth == 0:
                            end_pos = i + 1
                            break

                tooltip_text = content[start_pos:end_pos]
                if len(tooltip_text) > 200:
                    # Check for links (should have https:// URLs)
                    has_links = 'https://' in tooltip_text
                    # Check for "Recommended:" guidance
                    has_recommended = 'Recommended:' in tooltip_text or 'recommended' in tooltip_text.lower()

                    link_count = tooltip_text.count('https://')
                    print(f"✅ {param}: Found ({len(tooltip_text)} chars, {link_count} links, {'has' if has_recommended else 'no'} recommendations)")
                    found += 1
                else:
                    print(f"⚠️  {param}: Found but content too short ({len(tooltip_text)} chars)")
                    missing.append(param)
            else:
                print(f"⚠️  {param}: Found but couldn't extract full definition")
                missing.append(param)
        else:
            print(f"❌ {param}: Missing")
            missing.append(param)

    print(f"\n=== Summary ===")
    print(f"✅ Tooltips found: {found}/{len(new_tooltips)}")
    print(f"❌ Tooltips missing/incomplete: {len(missing)}")

    if missing:
        print(f"\nMissing/incomplete: {', '.join(missing)}")

    # All tooltips should be present
    assert found == len(new_tooltips), f"Only {found}/{len(new_tooltips)} tooltips found"

    print(f"\n✅ TEST PASSED: All {found} tooltips verified in source code")


if __name__ == '__main__':
    test_tooltips_exist()
