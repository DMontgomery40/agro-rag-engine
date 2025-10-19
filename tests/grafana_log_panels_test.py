#!/usr/bin/env python3
"""
Smoke test: Verify Grafana dashboard has 3 log panels added at the bottom.
Tests that panels 100, 101, 102 exist with correct positioning and content.
"""

import json
import sys
from pathlib import Path

def test_log_panels():
    """Verify the 3 log panels were added correctly to the Grafana dashboard"""

    # Load the dashboard JSON
    dashboard_path = Path("/Users/davidmontgomery/agro-rag-engine/infra/grafana/provisioning/dashboards/agro_overview.json")

    if not dashboard_path.exists():
        print(f"FAIL: Dashboard file not found at {dashboard_path}")
        return False

    with open(dashboard_path) as f:
        dashboard = json.load(f)

    panels = dashboard.get("panels", [])

    # Find panels 100, 101, 102
    log_panels = [p for p in panels if p.get("id") in [100, 101, 102]]

    if len(log_panels) != 3:
        print(f"FAIL: Expected 3 log panels (IDs 100-102), found {len(log_panels)}")
        return False

    print(f"PASS: Found 3 log panels")

    # Verify each panel
    expected_panels = [
        {
            "id": 100,
            "title_contains": "API Request Logs",
            "x": 0,
            "y": 41,
            "w": 8,
            "h": 12,
            "query_contains": "api_filter"
        },
        {
            "id": 101,
            "title_contains": "System/Infrastructure Logs",
            "x": 8,
            "y": 41,
            "w": 8,
            "h": 12,
            "query_contains": "system_filter"
        },
        {
            "id": 102,
            "title_contains": "Error Logs",
            "x": 16,
            "y": 41,
            "w": 8,
            "h": 12,
            "query_contains": "error_filter"
        }
    ]

    for expected in expected_panels:
        panel = next((p for p in log_panels if p.get("id") == expected["id"]), None)

        if not panel:
            print(f"FAIL: Panel {expected['id']} not found")
            return False

        # Check title
        title = panel.get("title", "")
        if expected["title_contains"] not in title:
            print(f"FAIL: Panel {expected['id']} title '{title}' doesn't contain '{expected['title_contains']}'")
            return False

        # Check grid position
        grid_pos = panel.get("gridPos", {})
        if (grid_pos.get("x") != expected["x"] or
            grid_pos.get("y") != expected["y"] or
            grid_pos.get("w") != expected["w"] or
            grid_pos.get("h") != expected["h"]):
            print(f"FAIL: Panel {expected['id']} has incorrect position: {grid_pos}, expected x={expected['x']}, y={expected['y']}, w={expected['w']}, h={expected['h']}")
            return False

        # Check type is text (placeholder)
        panel_type = panel.get("type", "")
        if panel_type != "text":
            print(f"FAIL: Panel {expected['id']} type is '{panel_type}', expected 'text' (Loki placeholder)")
            return False

        # Check content mentions the filter variable
        content = panel.get("options", {}).get("content", "")
        if expected["query_contains"] not in content:
            print(f"FAIL: Panel {expected['id']} content doesn't mention '{expected['query_contains']}'")
            return False

        print(f"PASS: Panel {expected['id']} - '{expected['title_contains']}' at ({expected['x']}, {expected['y']}, {expected['w']}x{expected['h']})")

    # Verify template variables were added
    templating = dashboard.get("templating", {})
    variables = templating.get("list", [])

    filter_vars = ["api_filter", "system_filter", "error_filter"]
    found_vars = [v.get("name") for v in variables if v.get("name") in filter_vars]

    if len(found_vars) != 3:
        print(f"FAIL: Expected 3 filter variables, found {len(found_vars)}: {found_vars}")
        return False

    print(f"PASS: Found all 3 filter variables: {found_vars}")

    # Verify variable defaults
    var_defaults = {
        "api_filter": "/api/",
        "system_filter": "(docker|qdrant|redis|prometheus)",
        "error_filter": "ERROR"
    }

    for var in variables:
        var_name = var.get("name")
        if var_name in var_defaults:
            expected_default = var_defaults[var_name]
            actual_query = var.get("query", "")
            if actual_query != expected_default:
                print(f"WARNING: Variable '{var_name}' has query '{actual_query}', expected '{expected_default}'")
            else:
                print(f"PASS: Variable '{var_name}' has correct default: '{expected_default}'")

    print("\n✓ All tests passed!")
    print("\nSUMMARY:")
    print("- 3 log panels added at y=41 (bottom of dashboard)")
    print("- Panels are side-by-side: (0,41,8x12), (8,41,8x12), (16,41,8x12)")
    print("- All panels are placeholder text panels (Loki not configured)")
    print("- 3 filter variables added: api_filter, system_filter, error_filter")
    print("\nNEXT STEPS:")
    print("- Loki is NOT running (docker ps | grep loki returned nothing)")
    print("- Panels show setup instructions for configuring Loki")
    print("- Once Loki is configured, replace text panels with actual log panels")

    return True

if __name__ == "__main__":
    success = test_log_panels()
    sys.exit(0 if success else 1)
