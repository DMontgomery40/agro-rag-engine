from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from .telemetry import log_feedback_event

router = APIRouter()

class FeedbackBody(BaseModel):
    event_id: str = Field(..., description="event id returned by the ask call")
    signal: str = Field(..., description="thumbsup | thumbsdown | click | noclick")
    doc_id: Optional[str] = None
    note: Optional[str] = None

def _is_test_request(request: Request) -> bool:
    try:
        ua = (request.headers.get('user-agent') or '').lower()
        if 'playwright' in ua:
            return True
        if (request.headers.get('x-agro-test') or '').strip() in {'1','true','yes','on'}:
            return True
    except Exception:
        pass
    return False


@router.post("/api/feedback")
def post_feedback(body: FeedbackBody, request: Request) -> Dict[str, Any]:
    """Record user feedback for a query event.
    
    The signal can be:
    - thumbsup: User found the answer helpful
    - thumbsdown: User found the answer unhelpful
    - star1-star5: 1-5 star rating
    - click: User clicked on a specific document
    - noclick: User did not interact with a document
    - note: User submitted a note (can combine with other signals)
    
    For click events, doc_id should specify which document was clicked.
    """
    valid_signals = {"thumbsup", "thumbsdown", "click", "noclick", "note", "star1", "star2", "star3", "star4", "star5"}
    if body.signal not in valid_signals:
        raise HTTPException(status_code=400, detail="invalid signal")
    feedback = {"signal": body.signal}
    if body.doc_id:
        feedback["doc_id"] = body.doc_id
    if body.note:
        feedback["note"] = body.note
    # Skip writing feedback from automated tests to protect training data
    if not _is_test_request(request):
        log_feedback_event(body.event_id, feedback)
    return {"ok": True}
