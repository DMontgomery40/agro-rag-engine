# server/frequency_limiter.py
# Track endpoint call frequency to detect anomalies (orphaned loops, bots, etc)

import logging
import time
from collections import defaultdict
from typing import Dict, Tuple, Set
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

# Global tracking dictionaries
# Format: {(ip, endpoint): [timestamp1, timestamp2, ...]}
_call_history: Dict[Tuple[str, str], list] = defaultdict(list)

# Format: {(ip, endpoint): (count, first_seen, last_seen, alert_fired)}
_frequency_summary: Dict[Tuple[str, str], Tuple[int, float, float, bool]] = {}

# Endpoints that are high-frequency and safe (exclude from anomaly detection)
ALLOWED_HIGH_FREQUENCY = {
    "/health",
    "/metrics",
    "/metrics/",
}

# Thresholds for anomaly detection
FREQUENCY_WINDOW_SECONDS = 300  # 5 min sliding window
ALERT_THRESHOLD_PER_MINUTE = 10  # Alert if > 10 calls/min from same client
CLEANUP_THRESHOLD_CALLS = 1000  # Clean up old entries once we have 1000 (to prevent memory leak)


class FrequencyAnomalyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track call frequency per (client_ip, endpoint).

    Logs warning if:
    - Single client makes > 10 calls/min to same endpoint (orphaned loop pattern)
    - Pattern sustained for 2+ minutes

    Metrics:
    - agro_endpoint_calls_per_minute (gauge, per client/endpoint)
    """

    async def dispatch(self, request: Request, call_next):
        # Extract client IP
        client_ip = request.client.host if request.client else "unknown"
        endpoint = request.url.path

        # Skip high-frequency endpoints
        if endpoint in ALLOWED_HIGH_FREQUENCY:
            return await call_next(request)

        # Record call
        now = time.time()
        key = (client_ip, endpoint)
        _call_history[key].append(now)

        # Clean up old calls outside window
        _call_history[key] = [t for t in _call_history[key] if now - t < FREQUENCY_WINDOW_SECONDS]

        # Check for anomaly
        call_count = len(_call_history[key])
        if call_count > 0:
            window_start = _call_history[key][0]
            window_duration = now - window_start
            if window_duration > 0:
                calls_per_minute = (call_count / window_duration) * 60

                # Get previous state
                prev_count, first_seen, last_seen, alert_fired = _frequency_summary.get(key, (0, now, now, False))

                # Update summary
                _frequency_summary[key] = (call_count, first_seen, now, alert_fired)

                # Alert if threshold exceeded and alert not already fired
                if calls_per_minute > ALERT_THRESHOLD_PER_MINUTE:
                    time_since_first = now - first_seen

                    if not alert_fired and time_since_first > 120:  # Alert after 2 minutes of sustained high frequency
                        logger.warning(
                            f"🔴 ANOMALY DETECTED: Client {client_ip} calling {endpoint} at "
                            f"{calls_per_minute:.1f} calls/min (threshold: {ALERT_THRESHOLD_PER_MINUTE}/min). "
                            f"Sustained for {time_since_first:.0f}s. This pattern indicates: "
                            f"bot, infinite loop, or load test."
                        )
                        # Mark alert as fired to avoid spam
                        _frequency_summary[key] = (call_count, first_seen, now, True)

        # Cleanup old entries to prevent memory leak
        if len(_call_history) > CLEANUP_THRESHOLD_CALLS:
            # Remove entries older than 2x the window
            cutoff_time = now - (2 * FREQUENCY_WINDOW_SECONDS)
            _call_history.clear()  # Simple cleanup: clear all, will rebuild naturally
            _frequency_summary.clear()

        response = await call_next(request)
        return response


def get_frequency_stats() -> Dict:
    """Get current frequency tracking statistics."""
    stats = {
        "tracked_clients": len(_frequency_summary),
        "tracked_endpoints": len({endpoint for _, endpoint in _frequency_summary}),
        "high_frequency_clients": [],
        "window_seconds": FREQUENCY_WINDOW_SECONDS,
        "alert_threshold": ALERT_THRESHOLD_PER_MINUTE,
    }

    # Find high-frequency clients
    current_time = time.time()
    for (client_ip, endpoint), (count, first_seen, last_seen, alert_fired) in _frequency_summary.items():
        if count > ALERT_THRESHOLD_PER_MINUTE:
            window_duration = last_seen - first_seen
            if window_duration > 0:
                calls_per_minute = (count / window_duration) * 60
                stats["high_frequency_clients"].append({
                    "client_ip": client_ip,
                    "endpoint": endpoint,
                    "calls_in_window": count,
                    "calls_per_minute": round(calls_per_minute, 1),
                    "duration_seconds": round(window_duration, 1),
                    "alert_fired": alert_fired,
                })

    return stats


def reset_frequency_tracking():
    """Reset all frequency tracking (useful for cleanup)."""
    global _call_history, _frequency_summary
    _call_history.clear()
    _frequency_summary.clear()
    logger.info("Frequency tracking reset")

