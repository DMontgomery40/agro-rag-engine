#!/usr/bin/env python3
from __future__ import annotations
from fastapi.testclient import TestClient
import io
from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# Provide a lightweight stub for rerankers to avoid import-time type errors
import types as _types
if 'rerankers' not in sys.modules:
    m = _types.ModuleType('rerankers')
    class Reranker:  # minimal placeholder
        def __init__(self, *a, **k):
            pass
    m.Reranker = Reranker
    sys.modules['rerankers'] = m
import serve_rag


def main() -> int:
    app = serve_rag.app
    c = TestClient(app)

    # Prices
    r = c.get('/api/prices')
    assert r.status_code == 200, r.text
    models = r.json().get('models', [])
    print('prices models:', len(models))

    # Upsert a model
    r = c.post('/api/prices/upsert', json={"provider":"local","model":"qwen3-coder:14b","unit":"request"})
    assert r.status_code == 200 and r.json().get('ok'), r.text

    # Cost estimate
    r = c.post('/api/cost/estimate', json={"provider":"openai","model":"gpt-4o-mini","tokens_in":500,"tokens_out":800,"embeds":0,"reranks":0,"requests_per_day":100})
    assert r.status_code == 200, r.text
    print('cost:', r.json().get('daily'), r.json().get('monthly'))

    # Secrets ingest
    buf = io.BytesIO(b"OPENAI_API_KEY=sk-test-xyz\nREPO=agro\n")
    files = {"file": ("tmp.env", buf, "text/plain")}
    data = {"persist": "true"}
    r = c.post('/api/secrets/ingest', files=files, data=data)
    assert r.status_code == 200, r.text
    r = c.get('/api/config')
    env = r.json().get('env', {})
    assert env.get('OPENAI_API_KEY') == 'sk-test-xyz', env
    print('env OPENAI_API_KEY:', env.get('OPENAI_API_KEY'))

    # Autotune
    r = c.get('/api/autotune/status')
    assert r.status_code == 200
    print('autotune:', r.json())

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
