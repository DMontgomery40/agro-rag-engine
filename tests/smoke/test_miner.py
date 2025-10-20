import os
import sys
import json
import subprocess
from pathlib import Path


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def test_miner_respects_env_and_dedups(tmp_path: Path):
    repo_root = Path(__file__).resolve().parents[2]
    log_path = tmp_path / 'queries.jsonl'

    # Build a minimal query event with retrieval and a feedback click
    event_id = 'evt-123'
    doc_id = '/path/file.py:10-20'
    rows = [
        {
            'type': 'query',
            'event_id': event_id,
            'ts': '2025-01-01T00:00:00Z',
            'query_raw': 'foo',
            'query_rewritten': '',
            'retrieval': [
                {'doc_id': doc_id, 'score': 0.7, 'text': 'hello world', 'clicked': False},
                {'doc_id': '/x', 'score': 0.6, 'text': 'bye', 'clicked': False},
            ],
            'answer_text': '...',
        },
        {
            'type': 'feedback',
            'event_id': event_id,
            'ts': '2025-01-01T00:00:01Z',
            'feedback': {'signal': 'click', 'doc_id': doc_id},
        },
    ]
    write_jsonl(log_path, rows)

    env = os.environ.copy()
    env['AGRO_LOG_PATH'] = str(log_path)
    # Ensure a clean OUT for this test location
    out_file = repo_root / 'data' / 'training' / 'triplets.jsonl'
    if out_file.exists():
        out_file.unlink()

    # First run should produce 1 triplet
    r1 = subprocess.run([sys.executable, 'scripts/mine_triplets.py'], cwd=str(repo_root), env=env, capture_output=True, text=True)
    assert r1.returncode == 0, r1.stderr
    assert out_file.exists()
    lines = out_file.read_text(encoding='utf-8').splitlines()
    assert len(lines) == 1

    # Second run should not duplicate (dedup by source_event_id)
    r2 = subprocess.run([sys.executable, 'scripts/mine_triplets.py'], cwd=str(repo_root), env=env, capture_output=True, text=True)
    assert r2.returncode == 0, r2.stderr
    lines2 = out_file.read_text(encoding='utf-8').splitlines()
    assert len(lines2) == 1

