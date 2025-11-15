from __future__ import annotations

import os
from typing import Dict, Any


def enrich(file_path: str, lang: str, code: str) -> Dict[str, Any]:
    """Enrich code metadata using LLM.

    Extracts symbols, purpose, and keywords from code chunks.
    Falls back to heuristic parsing if LLM fails.

    Args:
        file_path: Path to the file being enriched
        lang: Language/extension (e.g., 'py', 'ts', 'js')
        code: Source code content
    """
    import json
    import re

    # Try LLM enrichment if enabled
    try:
        from server.env_model import generate_text

        # Only enrich if code is not too small and enrichment is enabled
        if len(code or "") < 50 or os.getenv('ENRICH_DISABLED') == '1':
            raise ValueError("Skip LLM enrichment")

        prompt = (
            "Analyze this code and return a JSON object with: "
            "symbols (array of function/class/component names), "
            "purpose (one sentence description), "
            "keywords (array of technical terms). "
            "Be concise. Return ONLY valid JSON.\n\n"
        )
        user_input = prompt + (code or "")[:1000]

        text, _ = generate_text(
            user_input=user_input,
            system_instructions=None,
            reasoning_effort=None,
            response_format={"type": "json_object"}
        )

        if text:
            try:
                result = json.loads(text)
                return {
                    "summary": result.get("purpose", "")[:240],
                    "keywords": result.get("keywords", [])[:10],
                    "symbols": result.get("symbols", [])[:10],
                    "file_path": file_path,
                    "lang": lang,
                }
            except (json.JSONDecodeError, ValueError):
                pass
    except Exception:
        pass

    # Heuristic fallback
    symbols = []
    keywords = []
    try:
        # Extract function/class names
        patterns = {
            'py': r'\b(def|class)\s+([A-Za-z_][A-Za-z0-9_]*)',
            'ts': r'\b(function|class|interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)',
            'js': r'\b(function|class)\s+([A-Za-z_][A-Za-z0-9_]*)',
            'go': r'\bfunc\s+\(?\w+\)?\s*([A-Za-z_][A-Za-z0-9_]*)',
        }
        pattern = patterns.get(lang or 'py', patterns['py'])
        symbols = [m[1] for m in re.findall(pattern, code or "")][:10]

        # Extract keywords (common technical terms)
        code_lower = (code or "").lower()
        tech_keywords = ['async', 'await', 'promise', 'callback', 'event', 'stream',
                         'cache', 'queue', 'pool', 'thread', 'lock', 'mutex', 'semaphore',
                         'http', 'rest', 'api', 'websocket', 'rpc', 'grpc',
                         'database', 'sql', 'orm', 'transaction', 'index']
        keywords = [kw for kw in tech_keywords if kw in code_lower][:10]
    except Exception:
        pass

    # Create summary from first meaningful lines
    summary_lines = [line.strip() for line in (code or "").splitlines()[:8] if line.strip()]
    summary = " ".join(summary_lines)[:240]
    if not summary and symbols:
        summary = f"Defines {', '.join(symbols[:3])}"

    return {
        "summary": summary,
        "keywords": keywords,
        "symbols": symbols,
        "file_path": file_path,
        "lang": lang,
    }

