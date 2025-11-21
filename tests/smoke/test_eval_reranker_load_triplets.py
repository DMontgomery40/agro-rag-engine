import os
import sys
import types
import importlib.util
from pathlib import Path


def _import_eval_reranker():
    # Stub sentence_transformers to avoid heavy dep during this smoke test
    if 'sentence_transformers' not in sys.modules:
        stub = types.ModuleType('sentence_transformers')
        class _StubCE:  # pragma: no cover
            def __init__(self, *args, **kwargs):
                self.model = type('M', (), {'device': 'cpu'})
        setattr(stub, 'CrossEncoder', _StubCE)
        sys.modules['sentence_transformers'] = stub

    # Import scripts/eval_reranker.py by file path to access load_triplets
    repo_root = Path(__file__).resolve().parents[2]
    mod_path = repo_root / 'scripts' / 'eval_reranker.py'
    spec = importlib.util.spec_from_file_location('eval_reranker', str(mod_path))
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules['eval_reranker'] = mod
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


def test_load_triplets_tolerates_malformed_lines(tmp_path: Path):
    mod = _import_eval_reranker()
    p = tmp_path / 'triplets.jsonl'

    valid = {
        "query": "q1",
        "positive_text": "p1",
        "negative_texts": ["n1", "n2"],
    }
    # Malformed: includes an unescaped control char and truncation
    bad_line = '{"query":"q2","positive_text":"p2"\x07,"negative_texts":["n3"\n'

    with p.open('w', encoding='utf-8') as f:
        f.write(__import__('json').dumps(valid) + "\n")
        f.write(bad_line)

    items = mod.load_triplets(p)
    assert isinstance(items, list)
    assert len(items) == 1
    assert items[0]["query"] == "q1"
