import os
import sys
import types
import importlib.util
from pathlib import Path


def _import_train_reranker():
    # Stub sentence_transformers.CrossEncoder to avoid heavy training
    st = types.ModuleType('sentence_transformers')
    class _StubCE:  # pragma: no cover
        def __init__(self, *args, **kwargs):
            self.kw = kwargs
        def predict(self, pairs, batch_size=16):
            # Return 0.6 for first item, 0.4 for others to exercise accuracy path
            return [0.6] + [0.4] * (len(pairs) - 1)
        def fit(self, *args, **kwargs):
            return None
        def save(self, out):
            Path(out).mkdir(parents=True, exist_ok=True)
            (Path(out) / 'config.json').write_text('{}')
    class InputExample:  # pragma: no cover
        def __init__(self, texts=None, label: float = 0.0):
            self.texts = texts or ["", ""]
            self.label = label
    setattr(st, 'CrossEncoder', _StubCE)
    setattr(st, 'InputExample', InputExample)
    sys.modules['sentence_transformers'] = st

    # Import the script module
    repo_root = Path(__file__).resolve().parents[2]
    mod_path = repo_root / 'scripts' / 'train_reranker.py'
    spec = importlib.util.spec_from_file_location('train_reranker', str(mod_path))
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules['train_reranker'] = mod
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


def test_train_cli_accepts_max_length(tmp_path: Path, monkeypatch):
    mod = _import_train_reranker()
    # Create a minimal triplets file
    trip = tmp_path / 'trip.jsonl'
    trip.write_text('{"query":"q","positive_text":"p","negative_texts":["n"]}\n')

    # Patch sys.argv to run main with small settings
    argv = [
        'train_reranker.py',
        '--triplets', str(trip),
        '--base', 'cross-encoder/ms-marco-MiniLM-L-12-v2',
        '--out', str(tmp_path / 'model'),
        '--epochs', '1',
        '--batch', '1',
        '--max_length', '128',
    ]
    monkeypatch.setenv('PYTHONHASHSEED', '0')
    monkeypatch.setitem(sys.modules, 'sentence_transformers', sys.modules['sentence_transformers'])
    monkeypatch.setenv('TOKENIZERS_PARALLELISM', 'false')

    # Run main; expect 0 exit code
    old_argv = sys.argv
    sys.argv = argv
    try:
        rc = mod.main()
    finally:
        sys.argv = old_argv
    assert rc == 0
