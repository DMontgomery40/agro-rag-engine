"""Data Quality API Router"""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ExcludeKeywordsRequest(BaseModel):
    keywords: str

@router.post("/api/data-quality/exclude-keywords")
async def save_exclude_keywords(request: ExcludeKeywordsRequest):
    """Save exclude keywords to file"""
    try:
        # Save keywords to data/exclude_keywords.txt
        keywords_file = "data/exclude_keywords.txt"

        # Parse keywords (comma-separated)
        keywords_list = [k.strip() for k in request.keywords.split(',') if k.strip()]

        # Save to file (one per line)
        with open(keywords_file, 'w') as f:
            for keyword in keywords_list:
                f.write(keyword + '\n')

        return {"success": True, "count": len(keywords_list)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/data-quality/exclude-keywords")
async def get_exclude_keywords():
    """Get current exclude keywords"""
    try:
        keywords_file = "data/exclude_keywords.txt"

        if not os.path.exists(keywords_file):
            return {"keywords": ""}

        with open(keywords_file, 'r') as f:
            keywords_list = [line.strip() for line in f if line.strip()]

        # Return as comma-separated string
        return {"keywords": ", ".join(keywords_list)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))