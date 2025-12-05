import os
import sys
import pytest
from dataclasses import replace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval import hybrid_search
from retrieval.hybrid_search import RetrievalOutput


@pytest.fixture
def stub_pipeline(monkeypatch):
    """Stub expensive steps so tests stay deterministic and fast."""
    monkeypatch.setattr(hybrid_search, "expand_query_with_synonyms", lambda q, repo, max_expansions=3: q)
    monkeypatch.setattr(hybrid_search, "_load_chunks", lambda repo: [{"id": "placeholder", "file_path": "tmp", "language": "text"}])
    monkeypatch.setattr(hybrid_search, "_load_tokenizer", lambda repo: None)
    monkeypatch.setattr(hybrid_search, "_card_hit_ids", lambda *args, **kwargs: set())
    monkeypatch.setattr(hybrid_search, "_hydrate_if_needed", lambda *args, **kwargs: None)
    monkeypatch.setattr(hybrid_search, "ce_rerank", lambda q, docs, top_k=10, trace=None: docs[:top_k])


def test_bm25_only_mode(monkeypatch, stub_pipeline):
    sparse = RetrievalOutput(
        pairs=[("s1", {"id": "s1", "file_path": "notes/readme.txt", "language": "text", "bm25_score": 2.5})],
        scores={"s1": 2.5},
        source="bm25",
    )
    monkeypatch.setattr(hybrid_search, "_vector_search_stage", lambda *args, **kwargs: RetrievalOutput([], {}, "dense"))
    monkeypatch.setattr(hybrid_search, "_bm25_search_stage", lambda *args, **kwargs: sparse)

    results = hybrid_search.search("bm25 only check", repo="agro", topk_dense=0, topk_sparse=5, final_k=3)

    assert results, "Expected sparse-only search to return results"
    assert results[0]["id"] == "s1"
    assert results[0].get("bm25_score") == pytest.approx(2.5)
    assert results[0].get("rerank_score", 0) > 0


def test_dense_only_mode(monkeypatch, stub_pipeline):
    dense = RetrievalOutput(
        pairs=[("v1", {"id": "v1", "file_path": "src/vector.py", "language": "python"})],
        scores={"v1": 0.9},
        source="dense",
    )
    original_cfg = hybrid_search._HYBRID_CFG
    monkeypatch.setattr(hybrid_search, "_HYBRID_CFG", replace(original_cfg, vector_weight=1.0, bm25_weight=0.0))
    monkeypatch.setattr(hybrid_search, "_vector_search_stage", lambda *args, **kwargs: dense)
    monkeypatch.setattr(hybrid_search, "_bm25_search_stage", lambda *args, **kwargs: RetrievalOutput([], {}, "bm25"))

    results = hybrid_search.search("dense only check", repo="agro", topk_dense=5, topk_sparse=0, final_k=3)

    assert results, "Expected dense-only search to return results"
    assert results[0]["id"] == "v1"
    assert results[0].get("hybrid_score", 0) > 0
    assert results[0].get("bm25_score", 0) == 0 or "bm25_score" not in results[0]


def test_hybrid_fusion_prefers_overlap(monkeypatch, stub_pipeline):
    dense = RetrievalOutput(
        pairs=[
            ("A", {"id": "A", "file_path": "src/a.py", "language": "python"}),
            ("B", {"id": "B", "file_path": "src/b.py", "language": "python"}),
        ],
        scores={"A": 0.7, "B": 0.6},
        source="dense",
    )
    sparse = RetrievalOutput(
        pairs=[
            ("A", {"id": "A", "file_path": "notes/a.txt", "language": "text", "bm25_score": 1.2}),
            ("C", {"id": "C", "file_path": "src/c.py", "language": "python", "bm25_score": 1.8}),
        ],
        scores={"A": 1.2, "C": 1.8},
        source="bm25",
    )
    monkeypatch.setattr(hybrid_search, "_vector_search_stage", lambda *args, **kwargs: dense)
    monkeypatch.setattr(hybrid_search, "_bm25_search_stage", lambda *args, **kwargs: sparse)

    results = hybrid_search.search("hybrid fusion check", repo="agro", topk_dense=5, topk_sparse=5, final_k=3)
    ids = [r["id"] for r in results]

    assert ids[0] == "A", "Doc present in both dense and sparse should be prioritized"
    assert set(ids) >= {"A", "B", "C"}


def test_rerank_disabled_skips_cross_encoder(monkeypatch, stub_pipeline):
    calls = []

    def _recording_rerank(q, docs, top_k=10, trace=None):
        calls.append(q)
        return docs[:top_k]

    monkeypatch.setattr(hybrid_search, "ce_rerank", _recording_rerank)
    original_cfg = hybrid_search._HYBRID_CFG
    monkeypatch.setattr(hybrid_search, "_HYBRID_CFG", replace(original_cfg, disable_rerank=True))

    fake = RetrievalOutput(
        pairs=[("x", {"id": "x", "file_path": "src/x.py", "language": "python", "bm25_score": 1.0})],
        scores={"x": 1.0},
        source="bm25",
    )
    monkeypatch.setattr(hybrid_search, "_vector_search_stage", lambda *args, **kwargs: RetrievalOutput([], {}, "dense"))
    monkeypatch.setattr(hybrid_search, "_bm25_search_stage", lambda *args, **kwargs: fake)

    results = hybrid_search.search("skip rerank path", repo="agro", topk_dense=0, topk_sparse=5, final_k=1)

    assert results and results[0]["id"] == "x"
    assert calls == [], "ce_rerank should not be called when reranking is disabled"


def test_rerank_enabled_invokes_cross_encoder(monkeypatch, stub_pipeline):
    calls = []

    def _rerank_reverse(q, docs, top_k=10, trace=None):
        """Stub reranker that reverses docs and assigns descending rerank_scores.
        
        Real ce_rerank sets rerank_score on each doc, which _apply_agro_bonuses
        uses as the base score. We must do the same to ensure our ordering persists.
        """
        calls.append(q)
        reversed_docs = list(reversed(docs))[:top_k]
        # Assign descending rerank_scores so ordering is preserved after bonus application
        for i, doc in enumerate(reversed_docs):
            doc['rerank_score'] = 1.0 - (i * 0.1)  # First gets 1.0, second gets 0.9, etc.
        return reversed_docs

    monkeypatch.setattr(hybrid_search, "ce_rerank", _rerank_reverse)
    original_cfg = hybrid_search._HYBRID_CFG
    monkeypatch.setattr(hybrid_search, "_HYBRID_CFG", replace(original_cfg, disable_rerank=False, reranker_backend="local"))

    dense = RetrievalOutput(
        pairs=[
            ("one", {"id": "one", "file_path": "src/one.py", "language": "python"}),
            ("two", {"id": "two", "file_path": "src/two.py", "language": "python"}),
        ],
        scores={"one": 0.9, "two": 0.8},
        source="dense",
    )
    monkeypatch.setattr(hybrid_search, "_vector_search_stage", lambda *args, **kwargs: dense)
    monkeypatch.setattr(hybrid_search, "_bm25_search_stage", lambda *args, **kwargs: RetrievalOutput([], {}, "bm25"))

    results = hybrid_search.search("rerank enabled path", repo="agro", topk_dense=5, topk_sparse=0, final_k=2)

    assert calls, "ce_rerank should be invoked when reranking is enabled"
    assert [r["id"] for r in results] == ["two", "one"], "Reranker should reverse ordering (via rerank_score)"


def test_multi_query_disabled_uses_single_variant(monkeypatch, stub_pipeline):
    calls = []

    def _recording_search(q, repo, **kwargs):
        calls.append(q)
        return [{"id": q, "file_path": f"src/{q}.py", "language": "python", "rerank_score": 1.0}]

    monkeypatch.setattr(hybrid_search, "search", _recording_search)
    monkeypatch.setattr(hybrid_search, "expand_queries", lambda q, m=1: [q])
    # Mock RERANKER_MODE='none' to disable reranking
    monkeypatch.setattr(hybrid_search._cfg, "get_str", lambda k, d='': 'none' if k == 'RERANKER_MODE' else d)

    results = hybrid_search.search_routed_multi("single shot", repo_override="agro", m=1, final_k=2)

    assert calls == ["single shot"]
    assert [r["id"] for r in results] == ["single shot"]


def test_multi_query_expands_and_merges(monkeypatch, stub_pipeline):
    calls = []

    def _recording_search(q, repo, **kwargs):
        calls.append(q)
        return [{"id": q, "file_path": f"src/{q}.py", "language": "python", "rerank_score": float(len(calls))}]

    monkeypatch.setattr(hybrid_search, "search", _recording_search)
    monkeypatch.setattr(hybrid_search, "expand_queries", lambda q, m=2: [q, f"{q} alt"])
    # Mock RERANKER_MODE='none' to disable reranking
    monkeypatch.setattr(hybrid_search._cfg, "get_str", lambda k, d='': 'none' if k == 'RERANKER_MODE' else d)

    results = hybrid_search.search_routed_multi("fan out", repo_override="agro", m=2, final_k=3)

    assert calls == ["fan out", "fan out alt"]
    assert {r["id"] for r in results} == {"fan out", "fan out alt"}


def test_bonus_application_adds_card_and_path(monkeypatch):
    doc = {"id": "card1", "file_path": "api/service.py", "language": "python", "rerank_score": 1.0, "code": ""}
    docs = [doc]

    hybrid_search._apply_agro_bonuses(docs, query="status handler", card_chunk_ids={"card1"}, repo="agro")

    assert docs[0]["card_hit"] is True
    assert docs[0]["rerank_score"] >= 1.0 + hybrid_search._CARD_BONUS
