import os
from retrieval.hybrid_search import search_routed_multi

TESTS = [
    ('project','ai studio','easy'),
    ('project','TBAC trait system','easy'),
    ('project','plugin builder','easy'),
    ('project','webhook verification','easy'),
    ('project','three lane gateway','medium'),
    ('project','plugin sandbox isolation','medium'),
    ('project','provider adapter traits','medium'),
    ('project','canonical event normalization','medium'),
    ('project','how does TBAC prevent PHI access','hard'),
    ('project','what is the general purpose of project','hard'),
    ('project','how do different providers interact','hard'),
]

os.environ.setdefault('EMBEDDING_TYPE', 'local')

by_diff = {}
for repo, q, d in TESTS:
    docs = search_routed_multi(q, repo_override=repo, final_k=5)
    s = (docs or [{}])[0].get('rerank_score', 0.0)
    by_diff.setdefault(d, []).append(s)

print('\n' + '='*80)
print('FINAL PERFORMANCE METRICS')
print('='*80)

TARGET = {'easy':0.80, 'medium':0.70, 'hard':0.65}
all_scores = []
for d, arr in by_diff.items():
    avg = sum(arr)/max(1,len(arr))
    all_scores.extend(arr)
    status = '✓' if avg >= TARGET[d] else '✗'
    print(f"{status} {d.upper():7} | Avg: {avg:.3f} | Target: {TARGET[d]:.3f}")

overall = sum(all_scores)/max(1,len(all_scores))
print(f"\n{'Overall Average:':20} {overall:.3f}")
print('='*80)
