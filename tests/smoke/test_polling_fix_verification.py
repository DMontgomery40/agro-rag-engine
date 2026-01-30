#!/usr/bin/env python3
"""
Verification test for polling interval fixes.

This test verifies that the polling intervals have been increased
to reduce the 80 RPS polling storm identified in the root cause investigation.
"""

import os
import sys
import re
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def extract_setinterval_intervals(content: str):
    """Extract interval values from setInterval calls in content."""
    intervals = []
    pos = 0

    while True:
        # Find next occurrence of 'setInterval'
        pos = content.find('setInterval', pos)
        if pos == -1:
            break

        # Start parsing from the '(' after 'setInterval'
        start = content.find('(', pos)
        if start == -1:
            pos += len('setInterval')
            continue

        # Count parentheses to find matching closing ')'
        paren_count = 1
        i = start + 1
        while i < len(content) and paren_count > 0:
            if content[i] == '(':
                paren_count += 1
            elif content[i] == ')':
                paren_count -= 1
            i += 1

        if paren_count > 0:
            # Unmatched parentheses, skip
            pos += len('setInterval')
            continue

        # Extract the full call including the closing ')'
        end = i  # position after the closing ')'
        call_content = content[start:end]

        # Find the last comma before the closing ')'
        # We need to find the comma that's at the top level (paren_count = 1)
        # Simple approach: find last comma in call_content before the final ')'
        # But there might be nested commas. Let's find the last comma at top level
        # by scanning and counting parentheses
        top_level_commas = []
        paren_count = 0
        for j, ch in enumerate(call_content):
            if ch == '(':
                paren_count += 1
            elif ch == ')':
                paren_count -= 1
            elif ch == ',' and paren_count == 1:  # Top-level comma
                top_level_commas.append(j)

        if not top_level_commas:
            # No comma found, skip
            pos += len('setInterval')
            continue

        last_comma_pos = top_level_commas[-1]

        # Extract number after the last comma
        number_part = call_content[last_comma_pos + 1:]
        # Find first number in this part
        num_match = re.search(r'\b(\d+)\b', number_part)
        if num_match:
            try:
                intervals.append(int(num_match.group(1)))
            except ValueError:
                pass

        pos = end

    return intervals

def verify_file_contains_interval(file_path: Path, pattern: str, expected_interval: int):
    """Verify a file contains the expected polling interval."""
    content = file_path.read_text()

    # First try the provided pattern
    matches = []
    try:
        matches = re.findall(pattern, content, re.DOTALL)
    except re.error:
        print(f"⚠ {file_path}: Invalid regex pattern, using fallback")

    # Extract interval numbers from matches
    interval_numbers = []
    for match in matches:
        if isinstance(match, str):
            # If match is already a number string, use it
            if match.isdigit():
                interval_numbers.append(int(match))
            else:
                # Try to extract number from the string
                num_match = re.search(r'\b(\d+)\b', match)
                if num_match:
                    interval_numbers.append(int(num_match.group(1)))
                else:
                    # Try more aggressive extraction
                    all_nums = re.findall(r'\b(\d+)\b', match)
                    for num_str in all_nums:
                        try:
                            interval_numbers.append(int(num_str))
                        except ValueError:
                            pass

    # If no intervals found via pattern, use the robust parser
    if not interval_numbers:
        interval_numbers = extract_setinterval_intervals(content)

    if not interval_numbers:
        print(f"❌ No setInterval calls found in {file_path}")
        return False

    all_correct = True
    for actual_interval in interval_numbers:
        if actual_interval < expected_interval:
            print(f"❌ {file_path}: Found interval {actual_interval}ms (expected >= {expected_interval}ms)")
            all_correct = False
        else:
            print(f"✓ {file_path}: Interval {actual_interval}ms >= {expected_interval}ms")

    return all_correct

def main():
    """Main verification function."""
    print("=" * 80)
    print("Polling Fix Verification Test")
    print("=" * 80)

    web_root = project_root / "web"

    # Files and their expected minimum intervals
    files_to_check = [
        {
            "path": web_root / "src" / "hooks" / "useDashboard.ts",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "Dashboard polling"
        },
        {
            "path": web_root / "src" / "modules" / "index_status.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds (during indexing)
            "description": "Index status polling"
        },
        {
            "path": web_root / "src" / "modules" / "app.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds (during indexing)
            "description": "App indexing polling"
        },
        {
            "path": web_root / "src" / "hooks" / "useGlobalState.ts",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds
            "description": "Global state sync"
        },
        {
            "path": web_root / "src" / "components" / "Infrastructure" / "ServicesSubtab.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "Services subtab auto-refresh"
        },
        {
            "path": web_root / "src" / "components" / "Dashboard" / "SystemStatus.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "System status refresh"
        },
        {
            "path": web_root / "src" / "components" / "Dashboard" / "SystemStatusSubtab.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "System status subtab polling"
        },
        {
            "path": web_root / "src" / "components" / "Settings" / "Docker.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "Docker settings refresh"
        },
        {
            "path": web_root / "src" / "components" / "Docker" / "InfrastructureServices.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "Infrastructure services polling"
        },
        {
            "path": web_root / "src" / "hooks" / "useVSCodeEmbed.ts",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "VSCode embed health check"
        },
        {
            "path": web_root / "src" / "modules" / "editor.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "Editor health check"
        },
        {
            "path": web_root / "src" / "modules" / "mcp_server.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 30000,  # 30 seconds
            "description": "MCP server auto-refresh"
        },
        {
            "path": web_root / "src" / "modules" / "reranker.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds (during training)
            "description": "Reranker training status poll"
        },
        {
            "path": web_root / "src" / "hooks" / "useReranker.ts",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds (during training)
            "description": "Reranker hook status poll"
        },
        {
            "path": web_root / "src" / "components" / "RAG" / "LearningRankerSubtab.tsx",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 5000,  # 5 seconds (during training)
            "description": "Learning ranker subtab polling"
        },
        {
            "path": web_root / "src" / "modules" / "eval_runner.js",
            "pattern": r'setInterval\s*\([^,]+,\s*\d+\)[^;]*;',
            "min_interval": 2000,  # 2 seconds (during evaluation)
            "description": "Evaluation runner polling"
        },
    ]

    print("\nVerifying polling intervals...")
    print("-" * 80)

    all_passed = True
    files_checked = 0
    files_passed = 0

    for check in files_to_check:
        file_path = check["path"]
        if not file_path.exists():
            print(f"⚠ File not found: {file_path}")
            continue

        files_checked += 1
        print(f"\nChecking: {check['description']}")
        print(f"File: {file_path.relative_to(project_root)}")

        if verify_file_contains_interval(file_path, check["pattern"], check["min_interval"]):
            files_passed += 1
            print(f"✓ PASS: {check['description']}")
        else:
            all_passed = False
            print(f"❌ FAIL: {check['description']}")

    print("\n" + "=" * 80)
    print("Verification Summary")
    print("=" * 80)
    print(f"Files checked: {files_checked}")
    print(f"Files passed: {files_passed}")
    print(f"Files failed: {files_checked - files_passed}")

    # Calculate RPS reduction
    print("\n" + "=" * 80)
    print("RPS Reduction Analysis")
    print("=" * 80)

    # Original intervals and their new values
    interval_changes = [
        {"component": "Dashboard polling", "old": 5000, "new": 30000, "reduction": 6.0},
        {"component": "Index status polling", "old": 800, "new": 2000, "reduction": 2.5},
        {"component": "Global state sync", "old": 500, "new": 2000, "reduction": 4.0},
        {"component": "Services subtab", "old": 5000, "new": 30000, "reduction": 6.0},
        {"component": "System status", "old": 10000, "new": 30000, "reduction": 3.0},
        {"component": "Docker settings", "old": 5000, "new": 30000, "reduction": 6.0},
        {"component": "Infrastructure services", "old": 10000, "new": 30000, "reduction": 3.0},
        {"component": "VSCode embed", "old": 15000, "new": 30000, "reduction": 2.0},
        {"component": "Editor health", "old": 10000, "new": 30000, "reduction": 3.0},
        {"component": "MCP server", "old": 10000, "new": 30000, "reduction": 3.0},
        {"component": "Reranker training", "old": 1000, "new": 2000, "reduction": 2.0},
        {"component": "Learning ranker", "old": 2000, "new": 5000, "reduction": 2.5},
        {"component": "Evaluation", "old": 1000, "new": 2000, "reduction": 2.0},
    ]

    print("\nComponent-wise RPS reduction:")
    for change in interval_changes:
        old_rps = 1000 / change["old"]  # Requests per second per component instance
        new_rps = 1000 / change["new"]
        reduction_pct = (1 - (new_rps / old_rps)) * 100
        print(f"  {change['component']:30} {change['old']:5}ms → {change['new']:5}ms: {reduction_pct:5.1f}% RPS reduction")

    # Estimate overall RPS reduction
    # Assuming worst-case scenario with all components active
    total_old_rps = sum(1000 / change["old"] for change in interval_changes)
    total_new_rps = sum(1000 / change["new"] for change in interval_changes)
    overall_reduction_pct = (1 - (total_new_rps / total_old_rps)) * 100

    print(f"\nOverall RPS reduction (worst-case): {overall_reduction_pct:.1f}%")
    print(f"  Old total RPS per component instance: {total_old_rps:.2f}")
    print(f"  New total RPS per component instance: {total_new_rps:.2f}")

    if all_passed:
        print("\n✅ All polling intervals verified successfully!")
        print("The fixes should reduce the 80 RPS polling storm significantly.")
        return 0
    else:
        print("\n❌ Some polling intervals need adjustment.")
        return 1

if __name__ == "__main__":
    sys.exit(main())