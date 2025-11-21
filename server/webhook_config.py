# server/webhook_config.py
# Webhook configuration management - Slack/Discord URLs stored in GUI

import json
from pathlib import Path
from typing import Dict, Any
from dataclasses import dataclass, asdict

CONFIG_DIR = Path(__file__).parent.parent / "data" / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
WEBHOOK_CONFIG_FILE = CONFIG_DIR / "webhooks.json"


@dataclass
class WebhookConfig:
    """Webhook configuration for notifications."""

    slack_webhook_url: str = ""  # https://hooks.slack.com/services/...
    discord_webhook_url: str = ""  # https://discordapp.com/api/webhooks/...
    alert_notify_enabled: bool = True
    alert_notify_severities: str = "critical,warning"  # comma-separated
    alert_include_resolved: bool = True
    alert_webhook_timeout_seconds: float = 5.0

    def to_env_vars(self) -> Dict[str, str]:
        """Convert to environment variables for use by alerts.py."""
        return {
            "SLACK_WEBHOOK_URL": self.slack_webhook_url,
            "DISCORD_WEBHOOK_URL": self.discord_webhook_url,
            "ALERT_NOTIFY_ENABLED": "1" if self.alert_notify_enabled else "0",
            "ALERT_NOTIFY_SEVERITIES": self.alert_notify_severities,
            "ALERT_INCLUDE_RESOLVED": "1" if self.alert_include_resolved else "0",
            "ALERT_WEBHOOK_TIMEOUT": str(self.alert_webhook_timeout_seconds),
        }


def load_webhooks() -> WebhookConfig:
    """Load webhook config from file or defaults."""
    if WEBHOOK_CONFIG_FILE.exists():
        try:
            with open(WEBHOOK_CONFIG_FILE, "r") as f:
                data = json.load(f)
                return WebhookConfig(**data)
        except Exception as e:
            print(f"Error loading webhook config: {e}, using defaults")
    return WebhookConfig()


def save_webhooks(config: WebhookConfig) -> None:
    """Save webhook config to file."""
    try:
        with open(WEBHOOK_CONFIG_FILE, "w") as f:
            json.dump(asdict(config), f, indent=2)
    except Exception as e:
        print(f"Error saving webhook config: {e}")


def get_webhooks() -> Dict[str, Any]:
    """Get all current webhook settings as dict."""
    return asdict(load_webhooks())


def update_webhooks(updates: Dict[str, Any]) -> Dict[str, bool]:
    """Update webhook settings."""
    config = load_webhooks()
    results = {}

    for key, value in updates.items():
        try:
            if hasattr(config, key):
                field_type = WebhookConfig.__dataclass_fields__[key].type
                # Convert value to correct type
                if field_type is bool:
                    converted = str(value).lower() in {"1", "true", "on", "yes"}
                elif field_type is float:
                    converted = float(value)
                else:
                    converted = str(value)
                setattr(config, key, converted)
                results[key] = True
            else:
                results[key] = False
        except Exception as e:
            print(f"Error updating webhook {key}: {e}")
            results[key] = False

    if any(results.values()):
        save_webhooks(config)

    return results


def get_webhook_env_vars() -> Dict[str, str]:
    """Get all webhook settings as environment variables."""
    config = load_webhooks()
    return config.to_env_vars()
