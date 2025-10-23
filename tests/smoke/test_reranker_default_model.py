import os
import sys
import importlib
from pathlib import Path


def test_reranker_default_paths():
    # Ensure env does not override defaults
    for k in ["AGRO_RERANKER_MODEL_PATH", "RERANKER_MODEL"]:
        if k in os.environ:
            del os.environ[k]

    # Ensure repo root on sys.path
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Provide a stub for sentence_transformers to avoid heavy dependency during smoke test
    if 'sentence_transformers' not in sys.modules:
        import types
        stub = types.ModuleType('sentence_transformers')
        class _StubCE:  # pragma: no cover
            def __init__(self, *args, **kwargs):
                self.model = type('M', (), {'device': 'cpu'})
        setattr(stub, 'CrossEncoder', _StubCE)
        sys.modules['sentence_transformers'] = stub

    # Prevent python-dotenv from loading .env overrides in retrieval/rerank.py
    if 'dotenv' not in sys.modules:
        import types
        stub3 = types.ModuleType('dotenv')
        def _noop_load_dotenv(*args, **kwargs):  # pragma: no cover
            return False
        setattr(stub3, 'load_dotenv', _noop_load_dotenv)
        sys.modules['dotenv'] = stub3

    # Stub rerankers as well (module used by retrieval/rerank.py)
    if 'rerankers' not in sys.modules:
        import types
        stub2 = types.ModuleType('rerankers')
        class _StubRR:  # pragma: no cover
            def __init__(self, *args, **kwargs): pass
        setattr(stub2, 'Reranker', _StubRR)
        sys.modules['rerankers'] = stub2

    # Reload modules to pick up default constants
    rr_mod = importlib.import_module("server.reranker")
    importlib.reload(rr_mod)
    info = rr_mod.get_reranker_info()
    assert info["path"] == "cross-encoder/ms-marco-MiniLM-L-12-v2"

    r_mod = importlib.import_module("retrieval.rerank")
    importlib.reload(r_mod)
    assert getattr(r_mod, "DEFAULT_MODEL", None) == "cross-encoder/ms-marco-MiniLM-L-12-v2"

    # Shared loader flag should honor AGRO_RERANKER_MODEL_PATH when enabled
    os.environ['AGRO_RERANKER_SHARED_LOADER'] = '1'
    os.environ['AGRO_RERANKER_MODEL_PATH'] = 'cross-encoder/custom-shared'
    importlib.reload(r_mod)
    assert getattr(r_mod, "DEFAULT_MODEL", None) == "cross-encoder/custom-shared"

    os.environ.pop('AGRO_RERANKER_SHARED_LOADER', None)
    os.environ.pop('AGRO_RERANKER_MODEL_PATH', None)
