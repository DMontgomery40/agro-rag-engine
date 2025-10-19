#!/usr/bin/env python3
"""
Standalone verification script for metrics instrumentation.
Run this to verify all tracking code is in place.
"""

import os
import json
from pathlib import Path


def check_file(filepath, checks, description):
    """Check if a file contains required code patterns"""
    print(f"\n{'='*60}")
    print(f"Checking: {description}")
    print(f"File: {filepath}")
    print(f"{'='*60}")

    if not filepath.exists():
        print(f"❌ FAIL: File not found")
        return False

    content = filepath.read_text()
    all_passed = True

    for check_name, pattern in checks.items():
        if pattern in content:
            print(f"✓ {check_name}")
        else:
            print(f"❌ MISSING: {check_name}")
            all_passed = False

    return all_passed


def main():
    root = Path(__file__).parent.parent.parent
    results = []

    # Test 1: Cohere tracking in rerank.py
    results.append(check_file(
        root / "retrieval" / "rerank.py",
        {
            "Tracking imports": "from server.api_tracker import track_api_call, APIProvider",
            "Time import": "import time",
            "Cohere provider": "provider=APIProvider.COHERE",
            "Cohere endpoint": 'endpoint="https://api.cohere.ai/v1/rerank"',
            "Tracking call": "track_api_call(",
        },
        "Cohere Rerank Tracking"
    ))

    # Test 2: Voyage tracking in hybrid_search.py
    results.append(check_file(
        root / "retrieval" / "hybrid_search.py",
        {
            "Tracking imports": "from server.api_tracker import track_api_call, APIProvider",
            "Voyage provider": "APIProvider.VOYAGE",
            "Voyage endpoint": '"https://api.voyageai.com/v1/embeddings"',
        },
        "Voyage Embeddings Tracking"
    ))

    # Test 3: OpenAI tracking in hybrid_search.py
    results.append(check_file(
        root / "retrieval" / "hybrid_search.py",
        {
            "OpenAI provider": "APIProvider.OPENAI",
            "OpenAI embeddings endpoint": '"https://api.openai.com/v1/embeddings"',
        },
        "OpenAI Embeddings Tracking"
    ))

    # Test 4: OpenAI generation tracking in env_model.py
    results.append(check_file(
        root / "server" / "env_model.py",
        {
            "Tracking imports": "from server.api_tracker import track_api_call, APIProvider",
            "OpenAI provider": "APIProvider.OPENAI",
            "Responses endpoint": '"https://api.openai.com/v1/responses"',
            "Chat completions endpoint": '"https://api.openai.com/v1/chat/completions"',
        },
        "OpenAI Generation Tracking"
    ))

    # Test 5: Response headers in app.py
    results.append(check_file(
        root / "server" / "app.py",
        {
            "X-Provider header": 'response.headers["X-Provider"]',
            "X-Model header": 'response.headers["X-Model"]',
            "JSONResponse import": "from fastapi.responses import JSONResponse",
        },
        "Response Headers in /api/chat"
    ))

    # Test 6: Check pricing data
    print(f"\n{'='*60}")
    print(f"Checking: Pricing Data")
    print(f"File: gui/prices.json")
    print(f"{'='*60}")

    prices_file = root / "gui" / "prices.json"
    if prices_file.exists():
        with open(prices_file) as f:
            prices = json.load(f)

        models = prices.get("models", [])
        cohere_models = [m for m in models if m.get("provider") == "cohere"]
        voyage_models = [m for m in models if m.get("provider") == "voyage"]
        openai_models = [m for m in models if m.get("provider") == "openai"]

        print(f"✓ Loaded {len(models)} total models")
        print(f"✓ Cohere: {len(cohere_models)} models")
        print(f"✓ Voyage: {len(voyage_models)} models")
        print(f"✓ OpenAI: {len(openai_models)} models")

        # Check for specific models
        has_rerank = any("rerank" in m.get("model", "").lower() for m in cohere_models)
        has_voyage_code = any("voyage-code" in m.get("model", "") for m in voyage_models)
        has_openai_embed = any("embedding" in m.get("model", "") for m in openai_models)

        if has_rerank:
            print(f"✓ Cohere rerank models present")
        else:
            print(f"❌ No Cohere rerank models")

        if has_voyage_code:
            print(f"✓ Voyage code embeddings present")
        else:
            print(f"❌ No Voyage code embeddings")

        if has_openai_embed:
            print(f"✓ OpenAI embeddings present")
        else:
            print(f"❌ No OpenAI embeddings")

        results.append(has_rerank and has_voyage_code and has_openai_embed)
    else:
        print(f"❌ prices.json not found")
        results.append(False)

    # Test 7: Check tracking logs
    print(f"\n{'='*60}")
    print(f"Checking: API Call Logging")
    print(f"{'='*60}")

    tracking_dir = root / "data" / "tracking"
    api_calls_log = tracking_dir / "api_calls.jsonl"

    if tracking_dir.exists():
        print(f"✓ Tracking directory exists: {tracking_dir}")
    else:
        print(f"❌ Tracking directory not found")
        results.append(False)

    if api_calls_log.exists():
        with open(api_calls_log) as f:
            lines = f.readlines()

        print(f"✓ API calls log exists: {len(lines)} entries")

        # Check for provider diversity
        providers = set()
        for line in lines[-100:]:  # Check last 100
            try:
                call = json.loads(line)
                providers.add(call.get("provider", "unknown"))
            except:
                pass

        print(f"✓ Providers logged: {sorted(providers)}")

        # Check for Cohere specifically
        has_cohere = any("cohere" in line for line in lines[-100:])
        if has_cohere:
            print(f"✓ Cohere calls found in logs")
        else:
            print(f"⚠️  No recent Cohere calls (check RERANK_BACKEND=cohere)")

        results.append(True)
    else:
        print(f"❌ API calls log not found (will be created on first API call)")
        results.append(True)  # Not a failure, just not used yet

    # Test 8: Check environment
    print(f"\n{'='*60}")
    print(f"Checking: Environment Configuration")
    print(f"{'='*60}")

    from dotenv import load_dotenv
    load_dotenv()

    rerank_backend = os.getenv('RERANK_BACKEND', 'local')
    embedding_type = os.getenv('EMBEDDING_TYPE', 'openai')

    print(f"✓ RERANK_BACKEND: {rerank_backend}")
    print(f"✓ EMBEDDING_TYPE: {embedding_type}")

    # Check API keys (don't print values)
    has_cohere = bool(os.getenv('COHERE_API_KEY'))
    has_voyage = bool(os.getenv('VOYAGE_API_KEY'))
    has_openai = bool(os.getenv('OPENAI_API_KEY'))

    print(f"✓ COHERE_API_KEY: {'SET' if has_cohere else 'NOT SET'}")
    print(f"✓ VOYAGE_API_KEY: {'SET' if has_voyage else 'NOT SET'}")
    print(f"✓ OPENAI_API_KEY: {'SET' if has_openai else 'NOT SET'}")

    results.append(True)

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")

    passed = sum(1 for r in results if r)
    total = len(results)

    print(f"\nTests passed: {passed}/{total}")

    if all(results):
        print(f"\n✅ ALL CHECKS PASSED")
        print(f"\nAll metrics instrumentation is in place:")
        print(f"  1. ✓ Cohere rerank tracking (retrieval/rerank.py)")
        print(f"  2. ✓ Voyage embeddings tracking (retrieval/hybrid_search.py)")
        print(f"  3. ✓ OpenAI embeddings tracking (retrieval/hybrid_search.py)")
        print(f"  4. ✓ OpenAI generation tracking (server/env_model.py)")
        print(f"  5. ✓ Response headers (server/app.py)")
        print(f"  6. ✓ Pricing data (gui/prices.json)")
        print(f"  7. ✓ API call logging (data/tracking/api_calls.jsonl)")
        print(f"  8. ✓ Environment configuration")
        return 0
    else:
        print(f"\n❌ SOME CHECKS FAILED")
        return 1


if __name__ == "__main__":
    exit(main())
