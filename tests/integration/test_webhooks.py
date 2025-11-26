"""
Integration tests for webhook configuration endpoints.

Tests:
- POST /api/webhooks/save accepts webhook config and returns 200
- GET /api/webhooks/config returns saved config
- Config persists to disk (data/config/webhooks.json)
"""
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from server.asgi import create_app


@pytest.fixture
def client():
    """Create test client."""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def webhook_config_path():
    """Path to webhook config file."""
    return Path(__file__).parent.parent.parent / "data" / "config" / "webhooks.json"


@pytest.fixture
def cleanup_webhook_config(webhook_config_path):
    """Backup and restore webhook config after test."""
    backup_content = None
    if webhook_config_path.exists():
        backup_content = webhook_config_path.read_text()

    yield

    # Restore original config
    if backup_content is not None:
        webhook_config_path.write_text(backup_content)
    elif webhook_config_path.exists():
        webhook_config_path.unlink()


def test_save_webhook_config(client: TestClient, cleanup_webhook_config):
    """Test POST /api/webhooks/save saves webhook configuration."""
    config = {
        "slack_url": "https://hooks.slack.com/services/test/webhook",
        "discord_url": "https://discordapp.com/api/webhooks/test/webhook",
        "enabled": True,
        "severity": {
            "critical": True,
            "warning": True,
            "info": False
        },
        "include_resolved": True
    }

    response = client.post("/api/webhooks/save", json=config)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "message" in data


def test_get_webhook_config(client: TestClient, webhook_config_path, cleanup_webhook_config):
    """Test GET /api/webhooks/config returns saved configuration."""
    # First save a config
    config = {
        "slack_url": "https://hooks.slack.com/services/test2/webhook2",
        "discord_url": "https://discordapp.com/api/webhooks/test2/webhook2",
        "enabled": True,
        "severity": {
            "critical": True,
            "warning": False,
            "info": False
        },
        "include_resolved": False
    }

    save_response = client.post("/api/webhooks/save", json=config)
    assert save_response.status_code == 200

    # Now retrieve it
    response = client.get("/api/webhooks/config")

    assert response.status_code == 200
    data = response.json()

    # Verify the saved values match (accounting for field name transformations)
    assert data.get("slack_webhook_url") == config["slack_url"]
    assert data.get("discord_webhook_url") == config["discord_url"]
    assert data.get("alert_notify_enabled") == config["enabled"]
    assert data.get("alert_include_resolved") == config["include_resolved"]


def test_webhook_config_persistence(client: TestClient, webhook_config_path, cleanup_webhook_config):
    """Test that webhook config persists to disk."""
    config = {
        "slack_url": "https://hooks.slack.com/services/persist/test",
        "discord_url": "",
        "enabled": True,
        "severity": {
            "critical": True,
            "warning": True,
            "info": True
        },
        "include_resolved": True
    }

    response = client.post("/api/webhooks/save", json=config)
    assert response.status_code == 200

    # Verify file exists and contains correct data
    assert webhook_config_path.exists()

    with open(webhook_config_path, 'r') as f:
        saved_config = json.load(f)

    assert saved_config["slack_webhook_url"] == config["slack_url"]
    assert saved_config["discord_webhook_url"] == config["discord_url"]
    assert saved_config["alert_notify_enabled"] == config["enabled"]


def test_save_webhook_config_invalid_data(client: TestClient, cleanup_webhook_config):
    """Test POST /api/webhooks/save handles invalid data gracefully."""
    config = {
        "invalid_field": "should be ignored",
        "enabled": "not a boolean"  # Pydantic will reject invalid types
    }

    response = client.post("/api/webhooks/save", json=config)

    # Pydantic returns 422 for validation errors - this is correct behavior
    assert response.status_code == 422


def test_get_webhook_config_empty(client: TestClient):
    """Test GET /api/webhooks/config returns defaults when no config exists."""
    response = client.get("/api/webhooks/config")

    assert response.status_code == 200
    data = response.json()

    # Should return default values
    assert "slack_webhook_url" in data
    assert "discord_webhook_url" in data
    assert "alert_notify_enabled" in data


def test_partial_webhook_update(client: TestClient, cleanup_webhook_config):
    """Test that partial updates preserve existing values."""
    # Save initial config
    initial_config = {
        "slack_url": "https://hooks.slack.com/services/initial",
        "discord_url": "https://discordapp.com/api/webhooks/initial",
        "enabled": True,
        "severity": {
            "critical": True,
            "warning": True,
            "info": False
        },
        "include_resolved": True
    }
    client.post("/api/webhooks/save", json=initial_config)

    # Update only slack URL
    partial_update = {
        "slack_url": "https://hooks.slack.com/services/updated"
    }
    response = client.post("/api/webhooks/save", json=partial_update)
    assert response.status_code == 200

    # Verify slack URL changed but discord URL remained
    get_response = client.get("/api/webhooks/config")
    data = get_response.json()

    assert data["slack_webhook_url"] == partial_update["slack_url"]
    assert data["discord_webhook_url"] == initial_config["discord_url"]
