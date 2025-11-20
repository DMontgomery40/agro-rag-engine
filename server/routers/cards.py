import os
import json
from typing import Dict, Any
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from common.config_loader import out_dir
from pathlib import Path

router = APIRouter()

@router.post("/api/cards/build")
def cards_build_legacy() -> Dict[str, Any]:
    import subprocess
    import sys
    res = subprocess.run([sys.executable, "-m", "indexer.build_cards"], capture_output=True, text=True)
    return {"ok": res.returncode == 0, "stdout": res.stdout, "stderr": res.stderr}

@router.post("/api/cards/build/start")
def cards_build_start(repo: str = Query(None), enrich: int = Query(1)):
    from server.cards_builder import start_job
    try:
        job = start_job(repo or os.getenv('REPO', 'agro'), enrich=bool(enrich))
        return {"job_id": job.job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/cards/build/stream/{job_id}")
def cards_build_stream(job_id: str):
    from server.cards_builder import get_job
    job = get_job(job_id)
    if not job: raise HTTPException(404, "Job not found")
    return StreamingResponse(job.events(), media_type='text/event-stream')

@router.get("/api/cards")
def cards_list() -> Dict[str, Any]:
    """Return cards index information (paginated - first 10 for UI)"""
    try:
        repo = os.getenv('REPO', 'agro').strip()
        base = Path(out_dir(repo))
        cards_path = base / "cards.jsonl"
        progress_path = base.parent / 'cards' / repo / 'progress.json'
        if not progress_path.exists():
             progress_path = base / 'progress.json'

        cards = []
        count = 0
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if not line.strip():
                        continue
                    if len(cards) < 10:
                        try:
                            cards.append(json.loads(line))
                        except Exception:
                            pass
                    count = i + 1
        last_build = None
        if progress_path.exists():
            try:
                last_build = json.loads(progress_path.read_text())
            except Exception:
                last_build = None
        return {"count": count, "cards": cards, "path": str(cards_path), "last_build": last_build}
    except Exception as e:
        return {"count": 0, "cards": [], "error": str(e)}

@router.get("/api/cards/all")
def cards_all() -> Dict[str, Any]:
    """Return ALL cards (for raw data view)"""
    try:
        repo = os.getenv('REPO', 'agro').strip()
        base = Path(out_dir(repo))
        cards_path = base / "cards.jsonl"

        cards = []
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        cards.append(json.loads(line))
                    except Exception:
                        pass
        return {"count": len(cards), "cards": cards}
    except Exception as e:
        return {"count": 0, "cards": [], "error": str(e)}

@router.get("/api/cards/raw-text")
def cards_raw_text() -> str:
    """Return all cards as formatted text (for terminal view)"""
    try:
        repo = os.getenv('REPO', 'agro').strip()
        base = Path(out_dir(repo))
        cards_path = base / "cards.jsonl"

        lines = []
        count = 0
        if cards_path.exists():
            with cards_path.open('r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    try:
                        card = json.loads(line)
                        count += 1
                        symbol = (card.get('symbols', [None])[0] or card.get('file_path', 'Unknown')).split('/')[-1]
                        lines.append(f"\n{'='*80}")
                        lines.append(f"[Card #{count}] {symbol}")
                        lines.append(f"{'='*80}")
                        lines.append(f"File: {card.get('file_path', 'N/A')}")
                        if card.get('start_line'):
                            lines.append(f"Line: {card.get('start_line', 'N/A')}")
                        lines.append(f"\nPurpose:\n{card.get('purpose', 'N/A')}")
                        if card.get('technical_details'):
                            lines.append(f"\nTechnical Details:\n{card.get('technical_details', '')}")
                        if card.get('domain_concepts'):
                            lines.append(f"\nDomain Concepts: {', '.join(card.get('domain_concepts', []))}")
                    except Exception as e:
                        lines.append(f"\n[ERROR parsing card at line {line_num}]: {str(e)}")
        lines.append(f"\n{'='*80}")
        lines.append(f"Total: {count} cards loaded from {cards_path}")
        lines.append(f"{'='*80}\n")
        return '\n'.join(lines)
    except Exception as e:
        return f"Error loading cards: {str(e)}"

@router.get("/api/cards/build/status/{job_id}")
def cards_build_status(job_id: str) -> Dict[str, Any]:
    from server.cards_builder import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    snap = job.snapshot()
    snap.update({"status": job.status})
    if job.error:
        snap["error"] = job.error
    return snap

@router.post("/api/cards/build/cancel/{job_id}")
def cards_build_cancel(job_id: str) -> Dict[str, Any]:
    from server.cards_builder import cancel_job
    ok = cancel_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}

@router.get("/api/cards/build/logs")
def cards_build_logs() -> Dict[str, Any]:
    from server.cards_builder import read_logs
    return read_logs()
