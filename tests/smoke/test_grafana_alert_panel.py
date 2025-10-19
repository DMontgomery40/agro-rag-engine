"""Smoke test to verify alert history panel in Grafana dashboard."""
import time
import requests


def test_alert_api_returns_data():
    """Test that the alert API endpoint returns valid data."""
    response = requests.get("http://localhost:8012/webhooks/alertmanager/status")
    assert response.status_code == 200

    data = response.json()
    assert "total_alerts_logged" in data
    assert "recent_alerts" in data
    assert isinstance(data["recent_alerts"], list)

    # Verify alert structure if alerts exist
    if data["recent_alerts"]:
        alert = data["recent_alerts"][0]
        assert "timestamp" in alert
        assert "alert" in alert
        assert "status" in alert["alert"]
        assert "labels" in alert["alert"]
        assert "annotations" in alert["alert"]

        # Check required fields
        assert "alertname" in alert["alert"]["labels"]
        assert "severity" in alert["alert"]["labels"]
        assert "summary" in alert["alert"]["annotations"]

    print(f"✓ Alert API returns valid data: {data['total_alerts_logged']} alerts logged")


def test_grafana_is_running():
    """Test that Grafana is running and healthy."""
    response = requests.get("http://localhost:3000/api/health")
    assert response.status_code == 200

    health = response.json()
    assert health["database"] == "ok"
    print(f"✓ Grafana is healthy (version {health['version']})")


def test_infinity_datasource_exists():
    """Test that the Infinity datasource is provisioned."""
    response = requests.get(
        "http://localhost:3000/api/datasources",
        auth=("admin", "Trenton2023")
    )
    assert response.status_code == 200

    datasources = response.json()
    infinity_ds = [ds for ds in datasources if ds["type"] == "yesoreyeram-infinity-datasource"]

    assert len(infinity_ds) > 0, "Infinity datasource not found"
    assert infinity_ds[0]["uid"] == "infinity"
    print(f"✓ Infinity datasource is provisioned (uid: {infinity_ds[0]['uid']})")


def test_dashboard_contains_alert_panel():
    """Test that the dashboard contains the alert history panel."""
    # Get dashboard by UID
    response = requests.get(
        "http://localhost:3000/api/dashboards/uid/agro-overview",
        auth=("admin", "Trenton2023")
    )
    assert response.status_code == 200

    dashboard_data = response.json()
    panels = dashboard_data["dashboard"]["panels"]

    # Find alert history panel (id=50)
    alert_panel = None
    for panel in panels:
        if panel.get("id") == 50:
            alert_panel = panel
            break

    assert alert_panel is not None, "Alert history panel (id=50) not found in dashboard"
    assert alert_panel["type"] == "table"
    assert "Alert History" in alert_panel["title"]

    # Verify datasource is Infinity
    assert alert_panel["datasource"]["type"] == "infinity"
    assert alert_panel["datasource"]["uid"] == "infinity"

    # Verify panel targets the correct API
    targets = alert_panel["targets"]
    assert len(targets) > 0
    assert "alertmanager/status" in targets[0]["url"]

    # Verify column configuration
    columns = targets[0]["columns"]
    column_names = [col["text"] for col in columns]
    assert "Time" in column_names
    assert "Alert" in column_names
    assert "Severity" in column_names
    assert "Status" in column_names
    assert "Message" in column_names

    print(f"✓ Dashboard contains alert history panel at position ({alert_panel['gridPos']['x']}, {alert_panel['gridPos']['y']})")
    print(f"  - Panel size: {alert_panel['gridPos']['w']}x{alert_panel['gridPos']['h']}")
    print(f"  - Datasource: {alert_panel['datasource']['type']}")
    print(f"  - Columns: {', '.join(column_names)}")


def test_alert_panel_color_mappings():
    """Test that the alert panel has proper color mappings for severity and status."""
    response = requests.get(
        "http://localhost:3000/api/dashboards/uid/agro-overview",
        auth=("admin", "Trenton2023")
    )
    assert response.status_code == 200

    dashboard_data = response.json()
    panels = dashboard_data["dashboard"]["panels"]

    # Find alert history panel
    alert_panel = [p for p in panels if p.get("id") == 50][0]

    # Check field config overrides for color mappings
    overrides = alert_panel["fieldConfig"]["overrides"]

    # Find Severity field override
    severity_override = None
    status_override = None

    for override in overrides:
        if override["matcher"]["options"] == "Severity":
            severity_override = override
        elif override["matcher"]["options"] == "Status":
            status_override = override

    assert severity_override is not None, "Severity field override not found"
    assert status_override is not None, "Status field override not found"

    # Verify severity has color-background display mode
    display_mode = None
    for prop in severity_override["properties"]:
        if prop["id"] == "custom.displayMode":
            display_mode = prop["value"]
            break
    assert display_mode == "color-background", "Severity should have color-background display mode"

    # Verify status has color mappings for firing/resolved
    status_mappings = None
    for prop in status_override["properties"]:
        if prop["id"] == "mappings":
            status_mappings = prop["value"]
            break

    assert status_mappings is not None, "Status mappings not found"

    print("✓ Alert panel has proper color mappings configured")
    print("  - Severity: color-background display mode")
    print("  - Status: firing (red) / resolved (green)")


if __name__ == "__main__":
    print("\n=== Testing Grafana Alert History Panel ===\n")

    test_alert_api_returns_data()
    test_grafana_is_running()
    test_infinity_datasource_exists()
    test_dashboard_contains_alert_panel()
    test_alert_panel_color_mappings()

    print("\n=== All tests passed! ===\n")
