#!/usr/bin/env python3
import os
import json
import time
from typing import List
from dotenv import load_dotenv
from pathlib import Path
from retrieval.hybrid_search import search_routed, search_routed_multi

load_dotenv(override=True)  # Override shell env vars with .env values

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

def _resolve_golden_path() -> str:
    """Resolve the golden questions path robustly.

    Priority:
      1) Respect config registry or $GOLDEN_PATH if it exists
      2) If path is relative and doesn't exist, try under data/
      3) Fallback to repo-standard 'data/golden.json'
    """
    if _config_registry is not None:
        env_val = _config_registry.get_str('GOLDEN_PATH', 'data/evaluation_dataset.json')
    else:
        env_val = os.getenv('GOLDEN_PATH', 'data/evaluation_dataset.json')

    if env_val:
        p = Path(env_val)
        if p.exists():
            return str(p)
        # Common legacy value was 'golden.json' at repo root –
        # transparently upgrade to data/golden.json if present
        alt = Path('data') / p.name
        if alt.exists():
            return str(alt)
    # Default to repo-standard location used by tests and UI
    return 'data/golden.json'

GOLDEN_PATH = _resolve_golden_path()

# Load eval config from registry
if _config_registry is not None:
    USE_MULTI = _config_registry.get_int('EVAL_MULTI', 1) == 1
    FINAL_K = _config_registry.get_int('EVAL_FINAL_K', 5)
    MULTI_M = _config_registry.get_int('EVAL_MULTI_M', 10)
else:
    USE_MULTI = os.getenv('EVAL_MULTI','1') == '1'
    FINAL_K = int(os.getenv('EVAL_FINAL_K','5'))
    MULTI_M = int(os.getenv('EVAL_MULTI_M', '10'))

"""
Golden file format (golden.json):
[
  {"q": "Where is ProviderSetupWizard rendered?", "repo": "project", "expect_paths": ["core/admin_ui/src/components/ProviderSetupWizard.tsx"]},
  {"q": "Where do we mask PHI in events?", "repo": "project", "expect_paths": ["app/..."]}
]
"""

def capture_eval_config() -> dict:
    """Capture ALL current RAG config settings for eval tracking.

    This allows the EvalAnalysis UI to show which settings were used
    and diff between runs to identify what changes improved/degraded accuracy.

    We capture ALL config keys (not just a subset) because any setting
    could potentially affect retrieval accuracy.
    """
    if _config_registry is None:
        return {}

    # Get ALL config values from the registry
    all_config = _config_registry.get_all_with_sources()

    # Exclude secrets (API keys, tokens, etc.) from eval tracking
    secret_patterns = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'CREDENTIAL']

    config = {}
    for key, info in all_config.items():
        # Skip secrets
        if any(pattern in key.upper() for pattern in secret_patterns):
            continue
        # Store with lowercase key for consistency
        config[key.lower()] = info['value']

    return config


def hit(paths: List[str], expect: List[str]) -> bool:
    return any(any(exp in p for p in paths) for exp in expect)

def main():
    if not os.path.exists(GOLDEN_PATH):
        print('No golden file found at', GOLDEN_PATH)
        return
    gold = json.load(open(GOLDEN_PATH))
    # Filter out comment entries
    gold = [row for row in gold if 'q' in row]
    total = len(gold)
    hits_top1 = 0
    hits_topk = 0
    results = []
    t0 = time.time()
    for i, row in enumerate(gold, 1):
        q = row['q']
        # REPO is infrastructure, not tunable - keep as env var
        repo = row.get('repo') or os.getenv('REPO','project')
        expect = row.get('expect_paths') or []
        if USE_MULTI:
            docs = search_routed_multi(q, repo_override=repo, m=MULTI_M, final_k=FINAL_K)
        else:
            docs = search_routed(q, repo_override=repo, final_k=FINAL_K)
        paths = [d.get('file_path','') for d in docs]
        top1_hit = hit(paths[:1], expect) if paths else False
        topk_hit = hit(paths, expect) if paths else False
        if top1_hit:
            hits_top1 += 1
        if topk_hit:
            hits_topk += 1
        results.append({
            'question': q,
            'repo': repo,
            'expect_paths': expect,
            'top_paths': paths[:FINAL_K],
            'top1_path': paths[:1],
            'top1_hit': top1_hit,
            'topk_hit': topk_hit
        })
        print(f"[{i}/{total}] repo={repo} q={q}\n  top1={paths[:1]}\n  top{FINAL_K} hit={topk_hit}")
    dt = time.time() - t0

    # Build summary
    run_id = time.strftime("%Y%m%d_%H%M%S")

    # Capture current config for tracking what settings produced these results
    eval_config = capture_eval_config()

    summary = {
        'run_id': run_id,
        'total': total,
        'top1_hits': hits_top1,
        'topk_hits': hits_topk,
        'top1_accuracy': round(hits_top1 / max(1, total), 3),
        'topk_accuracy': round(hits_topk / max(1, total), 3),
        'final_k': FINAL_K,
        'use_multi': USE_MULTI,
        'duration_secs': round(dt, 2),
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
        'config': eval_config,  # RAG settings used for this eval run
        'results': results
    }

    # Save to disk for EvalAnalysis tab
    output_dir = Path('data/evals')
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f'eval_{run_id}.json'
    with open(output_file, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"\nResults saved to {output_file}")

    # Print summary
    print(json.dumps({
        'total': total,
        'top1': hits_top1,
        'topk': hits_topk,
        'final_k': FINAL_K,
        'use_multi': USE_MULTI,
        'secs': round(dt,2)
    }, indent=2))

if __name__ == '__main__':
    main()
