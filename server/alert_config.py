# server/alert_config.py
# Alert configuration management - stores user-configurable thresholds

import json
from pathlib import Path
from typing import Dict, Any
from dataclasses import dataclass, asdict

CONFIG_DIR = Path(__file__).parent.parent / "data" / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
ALERT_CONFIG_FILE = CONFIG_DIR / "alert_thresholds.json"


@dataclass
class AlertThresholds:
    """All configurable alert thresholds."""

    # Cost & Token Burn
    cost_burn_spike_usd_per_hour: float = 0.10  # Alert if > $0.10/hour
    token_burn_spike_per_minute: int = 5000  # Alert if > 5000 tokens/min
    token_burn_sustained_per_minute: int = 2000  # Alert if > 2000 for 15+ min

    # API Anomalies
    endpoint_call_frequency_per_minute: int = 10  # Alert if > 10 calls/min from same IP
    endpoint_frequency_sustained_minutes: int = 2  # Alert after 2 min of sustained high frequency
    cohere_rerank_calls_per_minute: int = 20  # Alert if > 20 rerank calls/min

    # Error Rates
    error_rate_threshold_percent: float = 5.0  # Alert if > 5% errors
    timeout_errors_per_5min: int = 10  # Alert if > 10 timeouts
    rate_limit_errors_per_5min: int = 5  # Alert if > 5 rate limit errors

    # Performance
    request_latency_p99_seconds: float = 10.0  # Alert if p99 > 10s

    # Monthly Budget
    monthly_budget_usd: float = 50.0  # Monthly spend cap
    budget_warning_usd: float = 5.0  # Warn at $5
    budget_critical_usd: float = 40.0  # Critical at $40

    # Retrieval Quality
    retrieval_mrr_threshold: float = 0.6  # Alert if MRR < 0.6
    canary_pass_rate_threshold: float = 0.90  # Alert if < 90%


def load_thresholds() -> AlertThresholds:
    """Load alert thresholds from config file or defaults."""
    if ALERT_CONFIG_FILE.exists():
        try:
            with open(ALERT_CONFIG_FILE, "r") as f:
                data = json.load(f)
                return AlertThresholds(**data)
        except Exception as e:
            print(f"Error loading alert config: {e}, using defaults")
    return AlertThresholds()


def save_thresholds(thresholds: AlertThresholds) -> None:
    """Save alert thresholds to config file."""
    try:
        with open(ALERT_CONFIG_FILE, "w") as f:
            json.dump(asdict(thresholds), f, indent=2)
    except Exception as e:
        print(f"Error saving alert config: {e}")


def get_thresholds() -> Dict[str, Any]:
    """Get all current thresholds as dict."""
    return asdict(load_thresholds())


def update_threshold(key: str, value: Any) -> bool:
    """Update a single threshold value."""
    try:
        thresholds = load_thresholds()
        if hasattr(thresholds, key):
            # Validate type
            field = AlertThresholds.__dataclass_fields__[key]
            converted = field.type(value)
            setattr(thresholds, key, converted)
            save_thresholds(thresholds)
            return True
    except Exception as e:
        print(f"Error updating threshold {key}: {e}")
    return False


def update_multiple_thresholds(updates: Dict[str, Any]) -> Dict[str, bool]:
    """Update multiple thresholds at once."""
    results = {}
    for key, value in updates.items():
        results[key] = update_threshold(key, value)
    return results
