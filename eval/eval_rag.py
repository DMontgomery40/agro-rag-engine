#!/usr/bin/env python3
import os
import json
import time
import logging
from typing import List
from dotenv import load_dotenv
from pathlib import Path
from retrieval.hybrid_search import search_routed, search_routed_multi

load_dotenv(override=True)  # Override shell env vars with .env values

logger = logging.getLogger("agro.eval")

# Module-level cached configuration
_config_registry = None

def _get_config_registry():
    """Get config registry with lazy initialization and retry on failure."""
    global _config_registry
    if _config_registry is None:
        try:
            from server.services.config_registry import get_config_registry
            _config_registry = get_config_registry()
        except ImportError as e:
            logger.warning("Config registry import failed: %s", e)
        except Exception as e:
            logger.warning("Config registry initialization failed: %s", e)
    return _config_registry

def _resolve_golden_path() -> str:
    """Resolve the golden questions path robustly.

    Priority:
      1) Respect config registry or $GOLDEN_PATH if it exists
      2) If path is relative and doesn't exist, try under data/
      3) Fallback to repo-standard 'data/golden.json'
    """
    registry = _get_config_registry()
    if registry is not None:
        env_val = registry.get_str('GOLDEN_PATH', 'data/evaluation_dataset.json')
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

# Load eval config from registry (lazy initialization)
def _get_eval_config():
    """Get eval configuration with fallback to env vars."""
    registry = _get_config_registry()
    if registry is not None:
        return {
            'USE_MULTI': registry.get_int('EVAL_MULTI', 1) == 1,
            'FINAL_K': registry.get_int('EVAL_FINAL_K', 5),
            'MULTI_M': registry.get_int('EVAL_MULTI_M', 10)
        }
    return {
        'USE_MULTI': os.getenv('EVAL_MULTI', '1') == '1',
        'FINAL_K': int(os.getenv('EVAL_FINAL_K', '5')),
        'MULTI_M': int(os.getenv('EVAL_MULTI_M', '10'))
    }

# Module-level defaults (can be overridden at call time)
_eval_cfg = _get_eval_config()
USE_MULTI = _eval_cfg['USE_MULTI']
FINAL_K = _eval_cfg['FINAL_K']
MULTI_M = _eval_cfg['MULTI_M']

def stamp_eval_runtime_config(
    config_snapshot: dict,
    use_multi_val: bool,
    final_k_val: int,
    multi_m_val: int | None = None,
) -> dict:
    """Return a copy of the config snapshot with the actual run-time values stamped in.

    Without stamping, per-run overrides (use_multi/final_k/multi_m) never reach
    the saved eval JSON, so the UI shows no config diff or AI analysis.
    """
    cfg = dict(config_snapshot or {})
    cfg['eval_multi'] = int(bool(use_multi_val))
    cfg['use_multi'] = bool(use_multi_val)
    cfg['eval_final_k'] = int(final_k_val)
    cfg['final_k'] = int(final_k_val)
    if multi_m_val is not None:
        cfg['eval_multi_m'] = int(multi_m_val)
        cfg['multi_m'] = int(multi_m_val)
    return cfg

"""
Golden file format (golden.json):
[
  {"q": "Where is ProviderSetupWizard rendered?", "repo": "project", "expect_paths": ["core/admin_ui/src/components/ProviderSetupWizard.tsx"]},
  {"q": "Where do we mask PHI in events?", "repo": "project", "expect_paths": ["app/..."]}
]
"""

def capture_eval_config() -> dict:
    """Capture RAG-relevant config settings for eval tracking.

    Only captures keys that affect retrieval accuracy (RAG_EVAL_CONFIG_KEYS),
    not UI/infrastructure settings like Grafana theme, editor port, etc.

    This allows the EvalAnalysis UI to show which settings were used
    and diff between runs to identify what changes improved/degraded accuracy.

    Uses lazy initialization with retry - if the config registry wasn't available
    at module import time, we try again here. This handles cases where the
    module was imported before the server was fully initialized.
    """
    registry = _get_config_registry()

    if registry is None:
        logger.warning(
            "Config registry unavailable in capture_eval_config() - "
            "eval config will be empty. This may indicate a server initialization issue."
        )
        return {}

    try:
        from server.models.agro_config_model import RAG_EVAL_CONFIG_KEYS
    except ImportError as e:
        logger.error("Failed to import RAG_EVAL_CONFIG_KEYS: %s", e)
        return {}

    # Get all config values from the registry
    try:
        all_config = registry.get_all_with_sources()
    except Exception as e:
        logger.error("Failed to get config from registry: %s", e)
        return {}

    # Exclude secrets (API keys, tokens, etc.) from eval tracking
    # Keys ending with _TOKEN are usually secrets, but TOKENIZER is not
    secret_suffixes = ['_API_KEY', '_SECRET', '_TOKEN', '_PASSWORD', '_CREDENTIAL']
    # But explicitly allow these keys that contain TOKEN but aren't secrets
    token_whitelist = {'BM25_TOKENIZER', 'MAX_CHUNK_TOKENS', 'EMBEDDING_MAX_TOKENS',
                       'GEN_MAX_TOKENS', 'CHAT_THINKING_BUDGET_TOKENS'}

    config = {}
    for key, info in all_config.items():
        key_upper = key.upper()

        # Only include RAG-relevant keys from the whitelist
        if key_upper not in RAG_EVAL_CONFIG_KEYS:
            continue

        # Skip secrets - check suffixes, but allow whitelisted keys
        if key_upper not in token_whitelist:
            if any(key_upper.endswith(suffix) for suffix in secret_suffixes):
                continue

        # Store with lowercase key for consistency
        config[key.lower()] = info['value']

    if not config:
        logger.warning(
            "capture_eval_config() returned empty config - "
            "RAG_EVAL_CONFIG_KEYS whitelist may not match registry keys"
        )

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
