# server/alerts.py
# AlertManager webhook receiver and alert logging

import logging
import json
import os
from typing import Any, Dict, List
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, Query

try:
    import requests  # type: ignore
except Exception:  # fallback stub to avoid crashes if requests not present
    requests = None  # type: ignore

logger = logging.getLogger(__name__)

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
monitoring_router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

# Alert history log file
ALERT_LOG = Path(__file__).parent.parent / "data" / "logs" / "alerts.jsonl"
ALERT_LOG.parent.mkdir(parents=True, exist_ok=True)


def _log_alert(alert_data: Dict[str, Any]):
    """Log alert to JSONL file for analysis and audit."""
    try:
        with open(ALERT_LOG, "a") as f:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "alert": alert_data
            }
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to log alert: {e}")


def _get_alert_summary(status: str, alerts: List[Dict]) -> str:
    """Generate human-readable alert summary."""
    if not alerts:
        return f"[{status}] No alerts"

    critical = [a for a in alerts if a.get("labels", {}).get("severity") == "critical"]
    warning = [a for a in alerts if a.get("labels", {}).get("severity") == "warning"]
    info = [a for a in alerts if a.get("labels", {}).get("severity") == "info"]

    parts = [f"[{status.upper()}]"]
    if critical:
        parts.append(f"🔴 {len(critical)} CRITICAL")
    if warning:
        parts.append(f"⚠️  {len(warning)} WARNING")
    if info:
        parts.append(f"📊 {len(info)} INFO")

    return " | ".join(parts)


def _get_webhook_config():
    """Load webhook config from file."""
    try:
        from server.webhook_config import load_webhooks
        return load_webhooks()
    except Exception:
        from server.webhook_config import WebhookConfig
        return WebhookConfig()


def _notify_severities() -> List[str]:
    cfg = _get_webhook_config()
    s = (cfg.alert_notify_severities or "critical,warning").strip()
    if not s:
        return ["critical"]
    return [x.strip().lower() for x in s.split(",") if x.strip()]


def _notify_enabled() -> bool:
    cfg = _get_webhook_config()
    return cfg.alert_notify_enabled


def _include_resolved() -> bool:
    cfg = _get_webhook_config()
    return cfg.alert_include_resolved


def _timeout_seconds() -> float:
    cfg = _get_webhook_config()
    return cfg.alert_webhook_timeout_seconds


def _title_prefix() -> str:
    return os.getenv("ALERT_TITLE_PREFIX", "AGRO").strip() or "AGRO"


def _generic_webhook_urls() -> List[str]:
    s = os.getenv("ALERT_WEBHOOK_URLS", "").strip()
    if not s:
        return []
    return [x.strip() for x in s.split(",") if x.strip()]


def _generic_webhook_headers() -> Dict[str, str]:
    raw = (os.getenv("ALERT_WEBHOOK_HEADERS", "") or "").strip()
    if not raw:
        return {}
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            return {str(k): str(v) for k, v in obj.items()}
    except Exception:
        pass
    return {}


def _format_alert_text(status: str, alerts: List[Dict[str, Any]]) -> str:
    # Build a concise multiline message suitable for chat/webhooks
    if not alerts:
        return f"[{status.upper()}] No alerts"
    lines = []
    for a in alerts:
        labels = a.get("labels", {}) or {}
        annotations = a.get("annotations", {}) or {}
        sev = labels.get("severity", "unknown").upper()
        name = labels.get("alertname", "Alert")
        summ = annotations.get("summary") or annotations.get("description") or ""
        starts = a.get("startsAt", "")
        src = labels.get("job") or labels.get("service") or labels.get("instance") or ""
        lines.append(f"[{sev}] {name} — {summ} {('('+src+')') if src else ''} @ {starts}")
    return "\n".join(lines[:10])  # cap to 10 lines


def _dispatch_notifications(status: str, alerts: List[Dict[str, Any]]):
    # Gate by config
    if not _notify_enabled():
        return
    if status == "resolved" and not _include_resolved():
        return
    if not alerts:
        return

    allowed = set(_notify_severities())
    selected: List[Dict[str, Any]] = []
    for a in alerts:
        sev = str(a.get("labels", {}).get("severity", "")).lower()
        if sev in allowed:
            selected.append(a)
    if not selected:
        return

    title = f"{_title_prefix()} Alerts ({status})"
    text = _format_alert_text(status, selected)
    cfg = _get_webhook_config()

    # Slack
    slack_url = cfg.slack_webhook_url.strip() if cfg.slack_webhook_url else ""
    if slack_url and requests is not None:
        try:
            payload = {"text": f"*{title}*\n{text}"}
            requests.post(slack_url, json=payload, timeout=_timeout_seconds())
        except Exception as e:
            logger.error(f"Slack notify failed: {e}")

    # Discord
    discord_url = cfg.discord_webhook_url.strip() if cfg.discord_webhook_url else ""
    if discord_url and requests is not None:
        try:
            payload = {"content": f"**{title}**\n{text}"}
            requests.post(discord_url, json=payload, timeout=_timeout_seconds())
        except Exception as e:
            logger.error(f"Discord notify failed: {e}")

    # Generic webhooks
    headers = _generic_webhook_headers()
    for url in _generic_webhook_urls():
        if requests is None:
            break
        try:
            payload = {
                "title": title,
                "status": status,
                "count": len(selected),
                "lines": text.split("\n"),
                "alerts": selected,
            }
            requests.post(url, json=payload, headers=headers or None, timeout=_timeout_seconds())
        except Exception as e:
            logger.error(f"Webhook notify failed ({url}): {e}")


@router.post("/alertmanager")
async def alertmanager_webhook(request: Request) -> Dict[str, str]:
    """
    Receive alerts from AlertManager.

    AlertManager sends POST requests with this structure:
    {
        "status": "firing" | "resolved",
        "groupLabels": {...},
        "commonLabels": {...},
        "commonAnnotations": {...},
        "alerts": [
            {
                "status": "firing" | "resolved",
                "labels": {"alertname": "...", "severity": "...", ...},
                "annotations": {"summary": "...", "description": "...", ...},
                "startsAt": "2021-01-01T00:00:00.000Z",
                "endsAt": "0001-01-01T00:00:00Z"
            },
            ...
        ],
        "receiver": "critical" | "warning" | "info",
        "groupKey": "...",
        "externalURL": "http://alertmanager:9093"
    }
    """
    try:
        data = await request.json()
        status = data.get("status", "unknown")
        alerts = data.get("alerts", [])

        # Log each alert
        for alert in alerts:
            _log_alert(alert)

            # Extract key info for logging
            alertname = alert.get("labels", {}).get("alertname", "Unknown")
            severity = alert.get("labels", {}).get("severity", "unknown")
            summary = alert.get("annotations", {}).get("summary", "No summary")
            description = alert.get("annotations", {}).get("description", "No description")

            # Log to application logger (will appear in container logs)
            log_level = {
                "critical": logging.CRITICAL,
                "warning": logging.WARNING,
                "info": logging.INFO
            }.get(severity, logging.INFO)

            logger.log(
                log_level,
                f"[{status.upper()}] {alertname} ({severity}): {summary}\n  {description}"
            )

        summary = _get_alert_summary(status, alerts)
        logger.info(f"AlertManager webhook: {summary}")

        # Outbound notifications (Slack/Discord/custom webhooks)
        try:
            _dispatch_notifications(status, alerts)
        except Exception as e:
            logger.error(f"Notification dispatch failed: {e}")

        # TODO: In production, integrate with notification services here:
        # - Slack: send_slack_notification(alerts)
        # - Email: send_email_notification(alerts)
        # - PagerDuty: trigger_pagerduty_incident(alerts)
        # - SMS: send_sms_alert(alerts)

        return {"status": "ok", "alerts_received": str(len(alerts))}

    except Exception as e:
        logger.error(f"Error processing AlertManager webhook: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


@router.get("/alertmanager/status")
async def alertmanager_status() -> Dict[str, Any]:
    """Get recent alert history."""
    try:
        alerts = []
        if ALERT_LOG.exists():
            with open(ALERT_LOG, "r") as f:
                lines = f.readlines()
                # Return last 100 alerts
                for line in lines[-100:]:
                    try:
                        alerts.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass

        return {
            "total_alerts_logged": len(alerts),
            "recent_alerts": alerts[-10:],  # Last 10
            "log_file": str(ALERT_LOG)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# --- Compatibility aliases for GUI (prevent 404s) ---
@monitoring_router.get("/logs/alerts")
async def monitoring_logs_alerts(limit: int = Query(100, ge=1, le=1000)) -> Dict[str, Any]:
    """Return recent Alertmanager webhook events (alias for /webhooks/alertmanager/status)."""
    try:
        alerts: List[Dict[str, Any]] = []
        if ALERT_LOG.exists():
            with open(ALERT_LOG, "r") as f:
                lines = f.readlines()[-max(1, int(limit)):]
                for line in lines:
                    try:
                        alerts.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
        return {"total_alerts_logged": len(alerts), "recent_alerts": alerts, "log_file": str(ALERT_LOG)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@monitoring_router.get("/logs/api-calls")
async def monitoring_logs_api_calls(limit: int = Query(100, ge=1, le=1000)) -> Dict[str, Any]:
    """Return recent API call tracking entries if present (data/tracking/api_calls.jsonl)."""
    try:
        path = Path(__file__).resolve().parents[1] / "data" / "tracking" / "api_calls.jsonl"
        entries: List[Dict[str, Any]] = []
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                lines = f.readlines()[-max(1, int(limit)):]
                for line in lines:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
        return {"count": len(entries), "entries": entries, "log_file": str(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@monitoring_router.get("/health/detailed")
async def monitoring_health_detailed() -> Dict[str, Any]:
    """Return a consolidated health snapshot for the Dashboard.

    Includes presence/size of logs, recent counts, and basic app timestamp.
    Avoids external network calls to keep it fast and reliable.
    """
    now = datetime.utcnow().isoformat() + "Z"
    alerts_info: Dict[str, Any] = {"exists": False, "size": 0, "recent": 0}
    api_calls_info: Dict[str, Any] = {"exists": False, "size": 0, "recent": 0}

    # Alerts log
    try:
        if ALERT_LOG.exists():
            alerts_info["exists"] = True
            try:
                alerts_info["size"] = ALERT_LOG.stat().st_size
            except Exception:
                pass
            try:
                with ALERT_LOG.open("r", encoding="utf-8") as f:
                    alerts_info["recent"] = sum(1 for _ in f)
            except Exception:
                pass
    except Exception:
        pass

    # API calls log
    try:
        api_calls_path = Path(__file__).resolve().parents[1] / "data" / "tracking" / "api_calls.jsonl"
        if api_calls_path.exists():
            api_calls_info["exists"] = True
            try:
                api_calls_info["size"] = api_calls_path.stat().st_size
            except Exception:
                pass
            try:
                with api_calls_path.open("r", encoding="utf-8") as f:
                    api_calls_info["recent"] = sum(1 for _ in f)
            except Exception:
                pass
    except Exception:
        pass

    return {
        "ok": True,
        "ts": now,
        "alerts_log": alerts_info,
        "api_calls_log": api_calls_info,
    }


@monitoring_router.get("/frequency-stats")
async def get_frequency_monitoring() -> Dict[str, Any]:
    """Get endpoint call frequency statistics to detect anomalies."""
    from server.frequency_limiter import get_frequency_stats
    return get_frequency_stats()


@monitoring_router.get("/top-queries")
async def get_top_queries(limit: int = 20) -> Dict[str, Any]:
    """Return top queries and basic attribution from logs to spot spam like 'test'."""
    if _config_registry is not None:
        log_path_str = _config_registry.get_str("AGRO_LOG_PATH", "data/logs/queries.jsonl")
    else:
        log_path_str = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")
    log_path = Path(log_path_str)
    counts: Dict[str, int] = {}
    by_query_route: Dict[str, Dict[str, int]] = {}
    by_query_ip: Dict[str, Dict[str, int]] = {}
    total = 0
    if log_path.exists():
        with log_path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    evt = json.loads(line)
                except Exception:
                    continue
                if evt.get("type") != "query":
                    continue
                q = (evt.get("query_raw") or "").strip()
                if not q:
                    continue
                total += 1
                counts[q] = counts.get(q, 0) + 1
                r = evt.get("route") or ""
                ip = evt.get("client_ip") or ""
                if q not in by_query_route:
                    by_query_route[q] = {}
                if q not in by_query_ip:
                    by_query_ip[q] = {}
                if r:
                    by_query_route[q][r] = by_query_route[q].get(r, 0) + 1
                if ip:
                    by_query_ip[q][ip] = by_query_ip[q].get(ip, 0) + 1

    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:max(1, limit)]
    out = []
    for q, c in top:
        out.append({
            "query": q,
            "count": c,
            "routes": sorted((by_query_route.get(q) or {}).items(), key=lambda kv: kv[1], reverse=True)[:5],
            "ips": sorted((by_query_ip.get(q) or {}).items(), key=lambda kv: kv[1], reverse=True)[:5],
        })
    return {"total_queries": total, "top": out}


@monitoring_router.get("/notify/config")
async def get_notify_config() -> Dict[str, Any]:
    """Return current notification settings (sanitized)."""
    webhook_cfg = _get_webhook_config()
    cfg = {
        "enabled": _notify_enabled(),
        "severities": _notify_severities(),
        "include_resolved": _include_resolved(),
        "slack": bool(webhook_cfg.slack_webhook_url),
        "discord": bool(webhook_cfg.discord_webhook_url),
        "timeout": _timeout_seconds(),
        "title_prefix": _title_prefix(),
    }
    return cfg


class TestNotifyPayload(Dict[str, Any]):
    pass


@monitoring_router.post("/notify/test")
async def post_notify_test(request: Request) -> Dict[str, Any]:
    """Send a test notification using current settings.

    Body JSON: { "severity": "critical|warning|info", "message": "..." }
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    severity = str((data or {}).get("severity", "critical")).lower()
    message = str((data or {}).get("message", "Test notification from AGRO")).strip()
    now = datetime.utcnow().isoformat() + "Z"
    fake_alert = {
        "status": "firing",
        "labels": {"alertname": "TestAlert", "severity": severity, "service": "agro"},
        "annotations": {"summary": message, "description": message},
        "startsAt": now,
        "endsAt": "0001-01-01T00:00:00Z",
    }
    _dispatch_notifications("firing", [fake_alert])
    return {"ok": True, "sent": True, "severity": severity}


@monitoring_router.get("/alert-thresholds")
async def get_alert_thresholds() -> Dict[str, Any]:
    """Get all configurable alert thresholds."""
    from server.alert_config import get_thresholds
    return get_thresholds()


@monitoring_router.post("/alert-thresholds")
async def update_alert_thresholds(request: Request) -> Dict[str, Any]:
    """Update alert thresholds.

    Body JSON: { "threshold_name": value, ... }
    Example: { "cost_burn_spike_usd_per_hour": 0.15, "token_burn_spike_per_minute": 6000 }
    """
    from server.alert_config import update_multiple_thresholds
    try:
        data = await request.json()
        if not isinstance(data, dict):
            return {"status": "error", "message": "Body must be a JSON object"}

        results = update_multiple_thresholds(data)
        updated = sum(1 for v in results.values() if v)
        failed = sum(1 for v in results.values() if not v)

        return {
            "status": "ok",
            "updated": updated,
            "failed": failed,
            "details": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@monitoring_router.get("/api-calls/stats")
async def get_api_call_stats(minutes: int = 5) -> Dict[str, Any]:
    """Get statistics on all outbound API calls (universal tracking).

    Tracks ALL external API calls (Cohere, OpenAI, Ollama, Qdrant, Slack, Discord, etc.)
    Returns call counts, rates, costs, and errors by provider.
    """
    try:
        from server.api_tracker import get_stats
        return get_stats(minutes=minutes)
    except Exception as e:
        return {"status": "error", "message": str(e)}


@monitoring_router.get("/api-calls/anomalies")
async def get_api_anomalies() -> Dict[str, Any]:
    """Check for API call anomalies (spikes, errors, etc.).

    Compares current call patterns against configured thresholds.
    Returns list of detected anomalies with severity levels.
    """
    try:
        from server.api_tracker import check_anomalies
        from server.alert_config import get_thresholds

        thresholds = get_thresholds()
        anomalies = check_anomalies(thresholds)

        return {
            "status": "ok",
            "total_anomalies": len(anomalies),
            "anomalies": anomalies
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@monitoring_router.get("/webhooks/config")
async def get_webhooks_config() -> Dict[str, Any]:
    """Get current webhook configuration (Slack, Discord URLs, settings)."""
    try:
        from server.webhook_config import get_webhooks
        config = get_webhooks()
        # Mask sensitive URLs in response
        config_copy = config.copy()
        if config_copy.get("slack_webhook_url"):
            config_copy["slack_webhook_url"] = "***" + config_copy["slack_webhook_url"][-10:]
        if config_copy.get("discord_webhook_url"):
            config_copy["discord_webhook_url"] = "***" + config_copy["discord_webhook_url"][-10:]
        return config_copy
    except Exception as e:
        return {"status": "error", "message": str(e)}


@monitoring_router.post("/webhooks/config")
async def update_webhooks_config(request: Request) -> Dict[str, Any]:
    """Update webhook configuration (Slack, Discord URLs, settings).

    Body JSON: {
        "slack_webhook_url": "https://hooks.slack.com/services/...",
        "discord_webhook_url": "https://discordapp.com/api/webhooks/...",
        "alert_notify_enabled": true,
        "alert_notify_severities": "critical,warning",
        "alert_include_resolved": true,
        "alert_webhook_timeout_seconds": 5.0
    }
    """
    try:
        data = await request.json()
        if not isinstance(data, dict):
            return {"status": "error", "message": "Body must be a JSON object"}

        from server.webhook_config import update_webhooks
        results = update_webhooks(data)
        updated = sum(1 for v in results.values() if v)
        failed = sum(1 for v in results.values() if not v)

        return {
            "status": "ok",
            "updated": updated,
            "failed": failed,
            "details": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
