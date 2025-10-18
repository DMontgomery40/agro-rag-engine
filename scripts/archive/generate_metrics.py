#!/usr/bin/env python3
"""Generate fake metrics to populate Grafana dashboard (archived debug script).

Moved to scripts/archive/ per Debug Artifacts Policy. Do not use in production.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__) + '/../../')

from server.metrics import record_canary, set_retrieval_quality, record_tokens, record_cost
import random
import time

def generate_reranker_metrics():
    """Generate reranker canary metrics"""
    print("Generating reranker metrics...")

    for i in range(50):
        margin = random.uniform(0.01, 0.3)
        passed = margin > 0.05
        winner = "reranker" if margin > 0.1 else ("baseline" if margin < 0.05 else "tie")

        record_canary(
            provider="local",
            model="cross-encoder-agro",
            passed=passed,
            margin=margin,
            winner=winner
        )

        if i % 10 == 0:
            print(f"  Generated {i} canary records...")

    print(f"✓ Generated 50 reranker canary metrics")

def generate_retrieval_metrics():
    """Generate retrieval quality metrics"""
    print("Generating retrieval quality metrics...")

    # MRR
    set_retrieval_quality(topk=5, hits=4, mrr=0.85)
    set_retrieval_quality(topk=10, hits=8, mrr=0.85)
    set_retrieval_quality(topk=20, hits=16, mrr=0.85)

    print("✓ Generated retrieval quality metrics")

def generate_token_cost_metrics():
    """Generate token and cost metrics"""
    print("Generating token/cost metrics...")

    for i in range(100):
        model = random.choice(["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"])
        provider = "openai" if "gpt" in model else "anthropic"

        prompt_tokens = random.randint(500, 2000)
        completion_tokens = random.randint(100, 800)

        record_tokens("prompt", provider, model, prompt_tokens)
        record_tokens("completion", provider, model, completion_tokens)

        # Cost estimation
        if model == "gpt-4o-mini":
            cost = (prompt_tokens * 0.00015 + completion_tokens * 0.0006) / 1000
        elif model == "gpt-4o":
            cost = (prompt_tokens * 0.0025 + completion_tokens * 0.010) / 1000
        else:  # claude
            cost = (prompt_tokens * 0.003 + completion_tokens * 0.015) / 1000

        record_cost(provider, model, cost)

        if i % 20 == 0:
            print(f"  Generated {i} token/cost records...")

    print("✓ Generated 100 token/cost metrics")

if __name__ == '__main__':
    print("=== GENERATING METRICS FOR GRAFANA DASHBOARD (ARCHIVED) ===\n")

    generate_reranker_metrics()
    generate_retrieval_metrics()
    generate_token_cost_metrics()

    print("\n=== DONE ===")
    print("Metrics available at http://127.0.0.1:8012/metrics")
    print("Dashboard at http://localhost:3000/d/agro-overview/agro-overview")
