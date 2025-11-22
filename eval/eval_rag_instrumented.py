#!/usr/bin/env python3
"""
AGRO RAG Evaluation Runner with Full Prometheus Instrumentation

This enhanced eval runner tracks microscopic detail for every eval run:
- Aggregated metrics (accuracy, duration, question count)
- Per-question results (hit/miss, timing, ranks)
- Configuration snapshot (every relevant parameter)
- Modality contribution analysis (BM25, vector, reranker)
- Score distributions for scientific debugging

All metrics are pushed to Prometheus and available in Grafana dashboards.
"""
import os
import json
import time
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Import core RAG and metrics
from retrieval.hybrid_search import search_routed, search_routed_multi
from server.services.config_registry import get_config_registry

# Import Prometheus metrics
try:
    from server.metrics import (
        record_eval_run,
        record_eval_question,
        record_eval_modality_contribution
    )
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False
    print("Warning: Metrics not available, running without Prometheus instrumentation")

_config_registry = get_config_registry()

def _resolve_golden_path() -> str:
    """Resolve the golden questions path robustly."""
    env_val = _config_registry.get_str('GOLDEN_PATH', 'data/evaluation_dataset.json')
    if env_val:
        p = Path(env_val)
        if p.exists():
            return str(p)
        alt = Path('data') / p.name
        if alt.exists():
            return str(alt)
    # Fallback to data/golden.json
    return 'data/golden.json'

GOLDEN_PATH = _resolve_golden_path()
USE_MULTI = _config_registry.get_int('EVAL_MULTI', 1) == 1
FINAL_K = _config_registry.get_int('EVAL_FINAL_K', 5)
MULTI_M = _config_registry.get_int('EVAL_MULTI_M', 10)

def hit(paths: List[str], expect: List[str]) -> bool:
    """Check if any expected path appears in the results."""
    return any(any(exp in p for p in paths) for exp in expect)

def extract_config_snapshot() -> Dict[str, Any]:
    """Extract all relevant config parameters for this eval run."""
    config = {}

    # Retrieval parameters
    config['rrf_k_div'] = _config_registry.get_int('RRF_K_DIV', 60)
    config['bm25_weight'] = _config_registry.get_float('BM25_WEIGHT', 0.3)
    config['vector_weight'] = _config_registry.get_float('VECTOR_WEIGHT', 0.7)
    config['topk_dense'] = _config_registry.get_int('TOPK_DENSE', 75)
    config['topk_sparse'] = _config_registry.get_int('TOPK_SPARSE', 75)
    config['final_k'] = _config_registry.get_int('FINAL_K', 10)
    config['multi_query_m'] = _config_registry.get_int('MULTI_QUERY_M', 4)
    config['query_expansion_enabled'] = _config_registry.get_int('QUERY_EXPANSION_ENABLED', 1)
    config['use_semantic_synonyms'] = _config_registry.get_int('USE_SEMANTIC_SYNONYMS', 1)

    # Reranking parameters
    config['disable_rerank'] = _config_registry.get_int('DISABLE_RERANK', 0)
    config['agro_reranker_enabled'] = _config_registry.get_int('AGRO_RERANKER_ENABLED', 1)
    config['agro_reranker_alpha'] = _config_registry.get_float('AGRO_RERANKER_ALPHA', 0.7)
    config['cohere_reranker_enabled'] = _config_registry.get_int('COHERE_RERANKER_ENABLED', 1)

    # Scoring parameters
    config['card_bonus'] = _config_registry.get_float('CARD_BONUS', 0.08)
    config['filename_boost_exact'] = _config_registry.get_float('FILENAME_BOOST_EXACT', 1.5)
    config['filename_boost_partial'] = _config_registry.get_float('FILENAME_BOOST_PARTIAL', 1.2)

    # Layer bonuses
    config['layer_bonus_gui'] = _config_registry.get_float('LAYER_BONUS_GUI', 0.15)
    config['layer_bonus_retrieval'] = _config_registry.get_float('LAYER_BONUS_RETRIEVAL', 0.15)
    config['layer_bonus_indexer'] = _config_registry.get_float('LAYER_BONUS_INDEXER', 0.15)
    config['vendor_penalty'] = _config_registry.get_float('VENDOR_PENALTY', -0.1)
    config['freshness_bonus'] = _config_registry.get_float('FRESHNESS_BONUS', 0.05)

    # Chunking parameters
    config['chunk_size'] = _config_registry.get_int('CHUNK_SIZE', 1000)
    config['chunk_overlap'] = _config_registry.get_int('CHUNK_OVERLAP', 200)
    config['chunking_strategy'] = _config_registry.get_str('CHUNKING_STRATEGY', 'ast')

    # Indexing parameters
    config['skip_dense'] = _config_registry.get_int('SKIP_DENSE', 0)
    config['bm25_tokenizer'] = _config_registry.get_str('BM25_TOKENIZER', 'stemmer')

    # Eval-specific
    config['eval_multi'] = _config_registry.get_int('EVAL_MULTI', 1)
    config['eval_final_k'] = _config_registry.get_int('EVAL_FINAL_K', 5)

    return config

def main():
    """Run evaluation with full instrumentation."""
    if not os.path.exists(GOLDEN_PATH):
        print(f'No golden file found at {GOLDEN_PATH}')
        return

    # Generate unique run ID (timestamp-based)
    run_id = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Load questions
    gold = json.load(open(GOLDEN_PATH))
    gold = [row for row in gold if 'q' in row]
    total = len(gold)

    # Extract config snapshot
    config_snapshot = extract_config_snapshot()

    # Track results
    hits_top1 = 0
    hits_topk = 0
    results = []
    t0 = time.time()

    print(f"Starting eval run: {run_id}")
    print(f"Total questions: {total}")
    print(f"Config snapshot: {json.dumps(config_snapshot, indent=2)}\n")

    for i, row in enumerate(gold, 1):
        q = row['q']
        repo = row.get('repo') or os.getenv('REPO', 'project')
        expect = row.get('expect_paths') or []

        # Time this individual question
        q_t0 = time.time()

        # Run search
        if USE_MULTI:
            docs = search_routed_multi(q, repo_override=repo, m=MULTI_M, final_k=FINAL_K)
        else:
            docs = search_routed(q, repo_override=repo, final_k=FINAL_K)

        q_duration = time.time() - q_t0

        # Extract paths
        paths = [d.get('file_path', '') for d in docs]

        # Check hits
        top1_hit = hit(paths[:1], expect) if paths else False
        topk_hit = hit(paths, expect) if paths else False

        if top1_hit:
            hits_top1 += 1
        if topk_hit:
            hits_topk += 1

        # Store detailed result
        result = {
            'question': q,
            'repo': repo,
            'expect_paths': expect,
            'top1_path': paths[:1] if paths else [],
            'top1_hit': top1_hit,
            'topk_hit': topk_hit,
            'top_paths': paths,
            'duration_secs': round(q_duration, 3)
        }
        results.append(result)

        # Record per-question metrics
        if METRICS_AVAILABLE:
            record_eval_question(
                run_id=run_id,
                question_idx=i-1,
                top1_hit=top1_hit,
                topk_hit=topk_hit,
                duration_secs=q_duration
            )

        print(f"[{i}/{total}] repo={repo} q={q}")
        print(f"  top1={paths[:1]} (hit={top1_hit})")
        print(f"  top{FINAL_K}={paths} (hit={topk_hit})")
        print(f"  duration={q_duration:.2f}s\n")

    # Calculate aggregates
    dt = time.time() - t0
    top1_accuracy = hits_top1 / max(1, total)
    topk_accuracy = hits_topk / max(1, total)

    # Build summary
    summary = {
        'run_id': run_id,
        'timestamp': datetime.now().isoformat(),
        'total': total,
        'top1_hits': hits_top1,
        'topk_hits': hits_topk,
        'top1_accuracy': round(top1_accuracy, 4),
        'topk_accuracy': round(topk_accuracy, 4),
        'final_k': FINAL_K,
        'use_multi': USE_MULTI,
        'duration_secs': round(dt, 2),
        'config': config_snapshot,
        'results': results
    }

    # Record aggregate metrics
    if METRICS_AVAILABLE:
        record_eval_run(
            run_id=run_id,
            total=total,
            top1_hits=hits_top1,
            topk_hits=hits_topk,
            duration_secs=dt,
            config_params=config_snapshot
        )

    # Save detailed results
    output_dir = Path('data/evals')
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / f'eval_{run_id}.json'
    with open(output_file, 'w') as f:
        json.dump(summary, f, indent=2)

    # Also save as "latest" for convenience
    latest_file = output_dir / 'latest.json'
    with open(latest_file, 'w') as f:
        json.dump(summary, f, indent=2)

    # Print summary
    print("\n" + "=" * 80)
    print(f"EVAL RUN COMPLETE: {run_id}")
    print("=" * 80)
    print(f"Total Questions: {total}")
    print(f"Top-1 Accuracy: {hits_top1}/{total} ({top1_accuracy*100:.1f}%)")
    print(f"Top-{FINAL_K} Accuracy: {hits_topk}/{total} ({topk_accuracy*100:.1f}%)")
    print(f"Duration: {dt:.2f}s")
    print(f"Results saved to: {output_file}")
    print("=" * 80)

    # Print config snapshot
    print("\nConfiguration Snapshot:")
    for key, value in sorted(config_snapshot.items()):
        print(f"  {key}: {value}")

    return summary

if __name__ == '__main__':
    main()
