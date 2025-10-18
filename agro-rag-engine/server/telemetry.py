import json
import time
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

# Get log path, ensure it's relative to repo root
_log_path_str = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")
if Path(_log_path_str).is_absolute():
    # If absolute path, use as-is
    LOG_PATH = Path(_log_path_str)
else:
    # If relative, make it relative to repo root
    from common.paths import repo_root
    LOG_PATH = repo_root() / _log_path_str

# Create parent directory if it doesn't exist
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def log_query_event(
    query_raw: str,
    query_rewritten: Optional[str],
    retrieved: List[Dict[str, Any]],  # [{"doc_id": str, "score": float, "text": str, "clicked": bool}]
    answer_text: str,
    ground_truth_refs: Optional[List[str]] = None,
    latency_ms: Optional[int] = None,
    cost_usd: Optional[float] = None,
    route: Optional[str] = None,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> str:
    """Log a query event and return event_id for later feedback correlation.
    
    Args:
        query_raw: Original user query
        query_rewritten: Rewritten/expanded query (if any)
        retrieved: List of retrieved documents with scores and text
        answer_text: Generated answer
        ground_truth_refs: Known correct document IDs (for eval)
        latency_ms: Query latency in milliseconds
        cost_usd: Estimated cost in USD
        
    Returns:
        event_id: Unique identifier for this query event
    """
    event_id = str(uuid.uuid4())
    evt = {
        "type": "query",
        "event_id": event_id,
        "ts": _now(),
        "query_raw": query_raw,
        "query_rewritten": query_rewritten or "",
        "retrieval": retrieved or [],
        "answer_text": answer_text,
        "ground_truth_refs": ground_truth_refs or [],
        "latency_ms": latency_ms,
        "cost_usd": cost_usd,
        "route": route or "",
        "client_ip": client_ip or "",
        "user_agent": user_agent or "",
    }
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(evt, ensure_ascii=False) + "\n")
    return event_id

def log_feedback_event(event_id: str, feedback: Dict[str, Any]) -> None:
    """Log feedback for a previous query event.
    
    Args:
        event_id: The event_id from log_query_event
        feedback: Feedback dict with 'signal', optional 'doc_id', 'note'
    """
    evt = {
        "type": "feedback",
        "event_id": event_id,
        "ts": _now(),
        "feedback": feedback,
    }
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(evt, ensure_ascii=False) + "\n")

