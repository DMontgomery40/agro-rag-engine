# server/api_tracker.py
# Universal outbound API call tracking and anomaly detection
# Catches ALL external API calls (Cohere, OpenAI, Ollama, etc.) not just specific services

import logging
import time
import threading
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# API call tracking data
TRACKING_DIR = Path(__file__).parent.parent / "data" / "tracking"
TRACKING_DIR.mkdir(parents=True, exist_ok=True)
API_CALLS_LOG = TRACKING_DIR / "api_calls.jsonl"
TRACE_STEPS_LOG = TRACKING_DIR / "trace_steps.jsonl"


class APIProvider(Enum):
    """Categorize external API providers."""
    COHERE = "cohere"
    OPENAI = "openai"
    VOYAGE = "voyage"
    OLLAMA = "ollama"
    QDRANT = "qdrant"
    SLACK = "slack"
    DISCORD = "discord"
    LANGSMITH = "langsmith"
    NETLIFY = "netlify"
    LOCAL = "local"
    UNKNOWN = "unknown"


@dataclass
class APICall:
    """Record of a single API call."""
    provider: APIProvider
    endpoint: str
    method: str = "POST"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: float = 0.0
    status_code: Optional[int] = None
    error: Optional[str] = None
    tokens_estimated: int = 0  # For LLM APIs
    cost_usd: float = 0.0
    request_size_bytes: int = 0
    response_size_bytes: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider.value,
            "endpoint": self.endpoint,
            "method": self.method,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "status_code": self.status_code,
            "error": self.error,
            "tokens_estimated": self.tokens_estimated,
            "cost_usd": self.cost_usd,
            "request_size_bytes": self.request_size_bytes,
            "response_size_bytes": self.response_size_bytes,
        }


class APITracker:
    """Track all outbound API calls with rate limiting and anomaly detection."""

    def __init__(self):
        self.calls: List[APICall] = []
        self.lock = threading.Lock()
        self._cleanup_thread()

    def _cleanup_thread(self):
        """Periodically clean old calls to prevent memory leak."""
        def cleanup():
            while True:
                try:
                    time.sleep(300)  # Every 5 minutes
                    with self.lock:
                        cutoff = datetime.utcnow() - timedelta(hours=1)
                        self.calls = [c for c in self.calls if c.timestamp > cutoff]
                except Exception as e:
                    logger.error(f"Cleanup thread error: {e}")

        t = threading.Thread(target=cleanup, daemon=True)
        t.start()

    def track_call(self, call: APICall):
        """Record an API call."""
        with self.lock:
            self.calls.append(call)

        # Log to JSONL for analysis
        try:
            with open(API_CALLS_LOG, "a") as f:
                f.write(json.dumps(call.to_dict()) + "\n")
        except Exception as e:
            logger.error(f"Failed to log API call: {e}")

        # Update Prometheus metrics
        try:
            from server.metrics import record_api_call as record_api_call_metric
            record_api_call_metric(
                provider=call.provider.value,
                status_code=call.status_code or 500,
                duration_seconds=call.duration_ms / 1000.0,
                cost_usd=call.cost_usd,
                tokens=call.tokens_estimated,
                method=call.method
            )
        except Exception as e:
            logger.debug(f"Failed to record API call metric: {e}")

    def track_trace(self, step: str, provider: str, model: str, duration_ms: float,
                    route: str = "", tokens: int = 0, cost_usd: float = 0.0,
                    ok: bool = True, extra: Optional[Dict[str, Any]] = None):
        """Record a granular trace step for TOTAL VISIBILITY dashboards.

        Writes JSONL lines to data/tracking/trace_steps.jsonl and updates Prometheus histogram
        using the generic REQUEST_DURATION with stage label equal to the step name.
        """
        payload = {
            "type": "trace_step",
            "ts": datetime.utcnow().isoformat() + "Z",
            "step": step,
            "provider": provider,
            "model": model,
            "duration_ms": float(duration_ms),
            "route": route,
            "tokens": int(tokens),
            "cost_usd": float(cost_usd),
            "ok": bool(ok),
        }
        if extra:
            try:
                payload.update(dict(extra))
            except Exception:
                pass
        try:
            with open(TRACE_STEPS_LOG, "a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            logger.debug(f"Failed to write trace step: {e}")
        # Also reflect as a histogram observation under the step name
        try:
            from server.metrics import REQUEST_DURATION
            REQUEST_DURATION.labels(stage=step).observe(max(0.0, float(duration_ms) / 1000.0))
        except Exception:
            pass
        # Expose tokens/cost for stage via Prometheus (role="stage")
        try:
            if tokens and tokens > 0:
                from server.metrics import record_tokens as _rec_tokens
                _rec_tokens("stage", provider, model or "", int(tokens))
            if cost_usd and cost_usd > 0:
                from server.metrics import record_cost as _rec_cost
                _rec_cost(provider, model or "", float(cost_usd))
        except Exception:
            pass

    def get_stats_for_provider(self, provider: APIProvider, minutes: int = 5) -> Dict[str, Any]:
        """Get rate statistics for a specific provider."""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)

        with self.lock:
            calls = [c for c in self.calls if c.provider == provider and c.timestamp > cutoff]

        if not calls:
            return {
                "provider": provider.value,
                "period_minutes": minutes,
                "call_count": 0,
                "calls_per_minute": 0.0,
                "total_duration_ms": 0.0,
                "total_cost_usd": 0.0,
                "total_tokens": 0,
                "error_count": 0,
                "avg_duration_ms": 0.0,
            }

        errors = [c for c in calls if c.error or c.status_code and c.status_code >= 400]

        return {
            "provider": provider.value,
            "period_minutes": minutes,
            "call_count": len(calls),
            "calls_per_minute": len(calls) / max(minutes, 1),
            "total_duration_ms": sum(c.duration_ms for c in calls),
            "total_cost_usd": sum(c.cost_usd for c in calls),
            "total_tokens": sum(c.tokens_estimated for c in calls),
            "error_count": len(errors),
            "avg_duration_ms": sum(c.duration_ms for c in calls) / len(calls) if calls else 0,
            "recent_calls": [c.to_dict() for c in calls[-5:]],  # Last 5
        }

    def get_all_stats(self, minutes: int = 5) -> Dict[str, Any]:
        """Get aggregated stats across all providers."""
        stats = {}
        for provider in APIProvider:
            if provider == APIProvider.UNKNOWN:
                continue
            stats[provider.value] = self.get_stats_for_provider(provider, minutes)
        return stats

    def check_anomalies(self, thresholds: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Detect anomalies based on call rates and costs."""
        if thresholds is None:
            thresholds = {}

        anomalies = []

        # Check each provider
        for provider in APIProvider:
            if provider == APIProvider.UNKNOWN:
                continue

            stats = self.get_stats_for_provider(provider, minutes=5)

            # Cohere spike detection
            if provider == APIProvider.COHERE:
                max_calls = thresholds.get("cohere_rerank_calls_per_minute", 20)
                if stats["calls_per_minute"] > max_calls:
                    anomalies.append({
                        "severity": "warning",
                        "provider": provider.value,
                        "issue": f"High call frequency: {stats['calls_per_minute']:.1f} calls/min (threshold: {max_calls})",
                        "stats": stats
                    })

            # Cost spike (any provider)
            cost_per_min = stats["total_cost_usd"] / max(stats["period_minutes"], 1)
            max_cost = thresholds.get("cost_burn_spike_usd_per_hour", 0.10) / 60
            if cost_per_min > max_cost:
                anomalies.append({
                    "severity": "warning",
                    "provider": provider.value,
                    "issue": f"High cost rate: ${cost_per_min:.4f}/min (threshold: ${max_cost:.4f}/min)",
                    "stats": stats
                })

            # Error spike
            if stats["call_count"] > 0:
                error_rate = stats["error_count"] / stats["call_count"]
                if error_rate > 0.1:  # More than 10% errors
                    anomalies.append({
                        "severity": "info",
                        "provider": provider.value,
                        "issue": f"High error rate: {error_rate*100:.1f}% ({stats['error_count']}/{stats['call_count']} calls)",
                        "stats": stats
                    })

        return anomalies


# Global tracker instance
_tracker = APITracker()


def track_api_call(
    provider: APIProvider,
    endpoint: str,
    method: str = "POST",
    duration_ms: float = 0.0,
    status_code: Optional[int] = None,
    error: Optional[str] = None,
    tokens_estimated: int = 0,
    cost_usd: float = 0.0,
    request_size_bytes: int = 0,
    response_size_bytes: int = 0,
):
    """Record an API call - call this after making external API requests."""
    call = APICall(
        provider=provider,
        endpoint=endpoint,
        method=method,
        duration_ms=duration_ms,
        status_code=status_code,
        error=error,
        tokens_estimated=tokens_estimated,
        cost_usd=cost_usd,
        request_size_bytes=request_size_bytes,
        response_size_bytes=response_size_bytes,
    )
    _tracker.track_call(call)


def track_trace(step: str, provider: str, model: str, duration_ms: float,
                route: str = "", tokens: int = 0, cost_usd: float = 0.0,
                ok: bool = True, extra: Optional[Dict[str, Any]] = None):
    """Public helper for granular step timing."""
    _tracker.track_trace(step, provider, model, duration_ms, route=route, tokens=tokens, cost_usd=cost_usd, ok=ok, extra=extra)


def get_provider_from_url(url: str) -> APIProvider:
    """Categorize API provider from URL."""
    url_lower = url.lower()

    # Check for localhost/local first
    if "localhost" in url_lower or "127.0.0.1" in url_lower:
        # Check what port to determine service
        if ":11434" in url_lower or "ollama" in url_lower:
            return APIProvider.OLLAMA
        elif ":6333" in url_lower or "qdrant" in url_lower:
            return APIProvider.QDRANT
        # Editor/internal services
        return APIProvider.LOCAL

    # External API providers
    if "cohere" in url_lower or "rerank" in url_lower:
        return APIProvider.COHERE
    elif "openai" in url_lower or "api.openai.com" in url_lower:
        return APIProvider.OPENAI
    elif "voyage" in url_lower or "voyageai" in url_lower:
        return APIProvider.VOYAGE
    elif "ollama" in url_lower:
        return APIProvider.OLLAMA
    elif "qdrant" in url_lower or ":6333" in url_lower:
        return APIProvider.QDRANT
    elif "slack" in url_lower or "hooks.slack.com" in url_lower:
        return APIProvider.SLACK
    elif "discord" in url_lower or "discordapp.com" in url_lower:
        return APIProvider.DISCORD
    elif "langsmith" in url_lower or "smith.langchain.com" in url_lower:
        return APIProvider.LANGSMITH
    elif "netlify" in url_lower or "api.netlify.com" in url_lower:
        return APIProvider.NETLIFY
    else:
        return APIProvider.UNKNOWN


def get_tracker() -> APITracker:
    """Get the global tracker instance."""
    return _tracker


def get_stats(minutes: int = 5) -> Dict[str, Any]:
    """Get all API call statistics."""
    return _tracker.get_all_stats(minutes)


def get_provider_stats(provider: APIProvider, minutes: int = 5) -> Dict[str, Any]:
    """Get stats for a specific provider."""
    return _tracker.get_stats_for_provider(provider, minutes)


def check_anomalies(thresholds: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Check for anomalies in API call patterns."""
    return _tracker.check_anomalies(thresholds)
