from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from .telemetry import log_feedback_event

router = APIRouter()

class FeedbackBody(BaseModel):
    event_id: str = Field(..., description="event id returned by the ask call")
    signal: str = Field(..., description="thumbsup | thumbsdown | click | noclick")
    doc_id: Optional[str] = None
    note: Optional[str] = None

@router.post("/api/feedback")
def post_feedback(body: FeedbackBody) -> Dict[str, Any]:
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
    log_feedback_event(body.event_id, feedback)
    return {"ok": True}

