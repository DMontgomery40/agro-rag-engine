import sys
import types

# Stub retrieval.hybrid_search to avoid importing heavy deps during test collection
fake_retrieval_module = types.ModuleType("retrieval")
fake_hybrid_search = types.ModuleType("retrieval.hybrid_search")
fake_hybrid_search.search_routed = lambda *args, **kwargs: []
fake_hybrid_search.search_routed_multi = lambda *args, **kwargs: []
sys.modules["retrieval"] = fake_retrieval_module
sys.modules["retrieval.hybrid_search"] = fake_hybrid_search

from eval.eval_rag import stamp_eval_runtime_config


def test_stamp_eval_runtime_config_overrides_and_preserves_original():
    base = {
        "eval_multi": 0,
        "use_multi": False,
        "eval_final_k": 5,
        "final_k": 5,
        "multi_m": 8,
        "eval_multi_m": 8,
    }

    stamped = stamp_eval_runtime_config(base, use_multi_val=True, final_k_val=11, multi_m_val=12)

    # Original input should be unchanged
    assert base["final_k"] == 5
    assert base["use_multi"] is False

    # Stamped copy should carry the overrides
    assert stamped["eval_multi"] == 1
    assert stamped["use_multi"] is True
    assert stamped["eval_final_k"] == 11
    assert stamped["final_k"] == 11
    assert stamped["multi_m"] == 12
    assert stamped["eval_multi_m"] == 12


def test_stamp_eval_runtime_config_handles_missing_snapshot():
    stamped = stamp_eval_runtime_config({}, use_multi_val=False, final_k_val=3, multi_m_val=None)

    assert stamped["eval_multi"] == 0
    assert stamped["use_multi"] is False
    assert stamped["eval_final_k"] == 3
    assert stamped["final_k"] == 3
    # multi_m keys should not appear when not provided
    assert "multi_m" not in stamped
    assert "eval_multi_m" not in stamped
