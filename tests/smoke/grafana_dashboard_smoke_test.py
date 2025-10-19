#!/usr/bin/env python3
"""
Grafana Dashboard Smoke Test
Tests the AGRO Overview dashboard configuration and panel setup
"""

import requests
import json
import sys

GRAFANA_URL = "http://localhost:3000"
GRAFANA_USER = "admin"
GRAFANA_PASSWORD = "admin"
DASHBOARD_UID = "agro-overview"

def test_dashboard_accessible():
    """Test that the dashboard is accessible"""
    url = f"{GRAFANA_URL}/api/dashboards/uid/{DASHBOARD_UID}"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))

    if response.status_code != 200:
        print(f"✗ Dashboard not accessible: {response.status_code}")
        return False

    data = response.json()
    if data['dashboard']['title'] != "AGRO Overview":
        print(f"✗ Wrong dashboard title: {data['dashboard']['title']}")
        return False

    print("✓ Dashboard accessible")
    return True

def test_log_panels_converted():
    """Test that panels 100, 101, 102 are now log panels with Loki datasource"""
    url = f"{GRAFANA_URL}/api/dashboards/uid/{DASHBOARD_UID}"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))
    data = response.json()
    panels = data['dashboard']['panels']

    log_panel_ids = [100, 101, 102]
    expected_titles = {
        100: "API Request Logs",
        101: "System/Infrastructure Logs",
        102: "Error Logs"
    }

    for panel in panels:
        if panel['id'] in log_panel_ids:
            # Check type
            if panel['type'] != 'logs':
                print(f"✗ Panel {panel['id']} is not a logs panel: {panel['type']}")
                return False

            # Check datasource
            if panel.get('datasource', {}).get('type') != 'loki':
                print(f"✗ Panel {panel['id']} does not use Loki datasource")
                return False

            if panel.get('datasource', {}).get('uid') != 'loki':
                print(f"✗ Panel {panel['id']} has wrong Loki UID")
                return False

            # Check title
            expected_title = expected_titles[panel['id']]
            if panel['title'] != expected_title:
                print(f"✗ Panel {panel['id']} has wrong title: {panel['title']}")
                return False

            # Check has target
            if not panel.get('targets'):
                print(f"✗ Panel {panel['id']} has no targets")
                return False

            print(f"✓ Panel {panel['id']} ({expected_title}) configured correctly")

    return True

def test_cost_panel_title():
    """Test that the cost panel has '(projected)' in title"""
    url = f"{GRAFANA_URL}/api/dashboards/uid/{DASHBOARD_UID}"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))
    data = response.json()
    panels = data['dashboard']['panels']

    cost_panel = next((p for p in panels if p['id'] == 4), None)
    if not cost_panel:
        print("✗ Cost panel (ID 4) not found")
        return False

    if cost_panel['title'] != "Cost/Hour (projected)":
        print(f"✗ Cost panel has wrong title: {cost_panel['title']}")
        return False

    print("✓ Cost panel title updated to 'Cost/Hour (projected)'")
    return True

def test_interval_variable_exists():
    """Test that the $interval template variable exists"""
    url = f"{GRAFANA_URL}/api/dashboards/uid/{DASHBOARD_UID}"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))
    data = response.json()

    templating = data['dashboard'].get('templating', {})
    variables = templating.get('list', [])

    interval_var = next((v for v in variables if v['name'] == 'interval'), None)
    if not interval_var:
        print("✗ $interval template variable not found")
        return False

    if interval_var['type'] != 'custom':
        print(f"✗ $interval variable has wrong type: {interval_var['type']}")
        return False

    # Check it has the expected options
    expected_values = ['5m', '1h', '6h', '24h', '7d']
    actual_values = [opt['value'] for opt in interval_var.get('options', [])]

    for expected in expected_values:
        if expected not in actual_values:
            print(f"✗ $interval variable missing option: {expected}")
            return False

    print("✓ $interval template variable configured correctly")
    return True

def test_loki_datasource_available():
    """Test that Loki datasource is configured"""
    url = f"{GRAFANA_URL}/api/datasources"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))

    if response.status_code != 200:
        print(f"✗ Cannot fetch datasources: {response.status_code}")
        return False

    datasources = response.json()
    loki_ds = next((ds for ds in datasources if ds['type'] == 'loki'), None)

    if not loki_ds:
        print("✗ Loki datasource not configured")
        return False

    if loki_ds['uid'] != 'loki':
        print(f"✗ Loki datasource has wrong UID: {loki_ds['uid']}")
        return False

    print(f"✓ Loki datasource configured (URL: {loki_ds['url']})")
    return True

def test_prometheus_datasource_available():
    """Test that Prometheus datasource is configured"""
    url = f"{GRAFANA_URL}/api/datasources"
    response = requests.get(url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))

    if response.status_code != 200:
        print(f"✗ Cannot fetch datasources: {response.status_code}")
        return False

    datasources = response.json()
    prom_ds = next((ds for ds in datasources if ds['type'] == 'prometheus'), None)

    if not prom_ds:
        print("✗ Prometheus datasource not configured")
        return False

    if prom_ds['uid'] != 'PBFA97CFB590B2093':
        print(f"✗ Prometheus datasource has wrong UID: {prom_ds['uid']}")
        return False

    print(f"✓ Prometheus datasource configured (URL: {prom_ds['url']})")
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("Grafana Dashboard Smoke Test")
    print("=" * 60)
    print()

    tests = [
        ("Dashboard Accessible", test_dashboard_accessible),
        ("Log Panels Converted", test_log_panels_converted),
        ("Cost Panel Title", test_cost_panel_title),
        ("Interval Variable", test_interval_variable_exists),
        ("Loki Datasource", test_loki_datasource_available),
        ("Prometheus Datasource", test_prometheus_datasource_available),
    ]

    results = []
    for name, test_func in tests:
        print(f"\nTest: {name}")
        print("-" * 60)
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            results.append(False)

    print()
    print("=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)

    if all(results):
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print(f"\n✗ {len(results) - sum(results)} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
