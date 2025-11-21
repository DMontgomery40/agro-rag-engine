from fastapi.testclient import TestClient
import types


def _get_app():
    try:
        from server.asgi import create_app  # type: ignore
        return create_app()
    except Exception:
        from server.app import app  # type: ignore
        return app


class _StubProc:
    def __init__(self):
        self.stdout = types.SimpleNamespace(__iter__=lambda s: iter([]))
        self.returncode = 0
    def wait(self, timeout=None):
        self.returncode = 0


def test_train_accepts_max_length(monkeypatch):
    # Stub subprocess.Popen to avoid running training
    calls = {}
    def _fake_popen(args, **kwargs):  # pragma: no cover
        calls['args'] = args
        return _StubProc()

    import subprocess
    monkeypatch.setattr(subprocess, 'Popen', _fake_popen)

    app = _get_app()
    cl = TestClient(app)
    r = cl.post('/api/reranker/train', json={"epochs": 1, "batch_size": 2, "max_length": 128})
    assert r.status_code == 200
    # Verify CLI args include our max_length (runner spawns in a background thread)
    import time
    argv = []
    for _ in range(20):  # wait up to ~1s
        argv = calls.get('args') or []
        if argv:
            break
        time.sleep(0.05)
    assert '--max_length' in argv
    assert '128' in argv
