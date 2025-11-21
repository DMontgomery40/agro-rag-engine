from __future__ import annotations

import os
from typing import Dict, Any

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached enrichment parameters
_ENRICH_DISABLED = None
_ENRICH_MIN_CHARS = None
_ENRICH_MAX_CHARS = None

def _load_cached_config():
    """Load enrichment config values into module-level cache."""
    global _ENRICH_DISABLED, _ENRICH_MIN_CHARS, _ENRICH_MAX_CHARS

    if _config_registry is None:
        # Fallback to env vars
        _ENRICH_DISABLED = int(os.getenv('ENRICH_DISABLED', '0') or '0')
        _ENRICH_MIN_CHARS = int(os.getenv('ENRICH_MIN_CHARS', '50') or '50')
        _ENRICH_MAX_CHARS = int(os.getenv('ENRICH_MAX_CHARS', '1000') or '1000')
    else:
        _ENRICH_DISABLED = _config_registry.get_int('ENRICH_DISABLED', 0)
        _ENRICH_MIN_CHARS = _config_registry.get_int('ENRICH_MIN_CHARS', 50)
        _ENRICH_MAX_CHARS = _config_registry.get_int('ENRICH_MAX_CHARS', 1000)

def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()

# Initialize cache on module import
_load_cached_config()


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

        # Use cached config values
        if len(code or "") < _ENRICH_MIN_CHARS or _ENRICH_DISABLED == 1:
            raise ValueError("Skip LLM enrichment")

        prompt = (
            "Analyze this code and return a JSON object with: "
            "symbols (array of function/class/component names), "
            "purpose (one sentence description), "
            "keywords (array of technical terms). "
            "Be concise. Return ONLY valid JSON.\n\n"
        )
        user_input = prompt + (code or "")[:_ENRICH_MAX_CHARS]

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

