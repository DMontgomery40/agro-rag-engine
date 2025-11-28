import os
import sys

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def test_generate_text_uses_openai_when_model_not_ollama(monkeypatch):
    # Ensure OLLAMA_URL is set but model is non-Ollama (no colon)
    monkeypatch.setenv("OLLAMA_URL", "http://127.0.0.1:11434/api")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    # Provide stub openai module so server.env_model import succeeds
    import types
    openai_stub = types.ModuleType('openai')
    class _DummyResponses:
        def create(self, **kwargs):
            class _Usage:
                total_tokens = 10
                prompt_tokens = 5
                completion_tokens = 5
            class _Resp:
                output_text = "OK"
                usage = _Usage()
            return _Resp()
    class OpenAI:  # noqa: N801 - emulate openai.OpenAI class
        def __init__(self):
            self.responses = _DummyResponses()
    openai_stub.OpenAI = OpenAI
    sys.modules['openai'] = openai_stub

    # Import target module fresh per test
    import importlib
    import server.env_model as em
    importlib.reload(em)

    # Guard: if generate_text tries to import requests (Ollama path), fail the test
    class _RequestsBlocker:
        def post(self, *a, **k):
            raise AssertionError("requests.post should not be called for non-Ollama model")
        def get(self, url, timeout=None):  # tags probe should be allowed but return empty
            class _Resp:
                status_code = 200
                def json(self):
                    return {"models": []}
            return _Resp()

    sys.modules['requests'] = _RequestsBlocker()  # type: ignore

    # Ensure our stub client is used
    monkeypatch.setattr(em, "_client", None, raising=False)
    monkeypatch.setattr(em, "client", lambda: OpenAI(), raising=False)

    text, meta = em.generate_text(user_input="hi", model="gpt-4o-mini")
    assert text == "OK"


def test_generate_text_uses_ollama_when_model_has_tag(monkeypatch):
    # Configure OLLAMA_URL and an Ollama-tagged model
    monkeypatch.setenv("OLLAMA_URL", "http://127.0.0.1:11434/api")

    # Provide stub openai module as above
    import types
    openai_stub = types.ModuleType('openai')
    class _DummyResponses2:
        def create(self, **kwargs):
            class _Usage:
                total_tokens = 10
                prompt_tokens = 5
                completion_tokens = 5
            class _Resp:
                output_text = "OK"
                usage = _Usage()
            return _Resp()
    class OpenAI2:  # noqa: N801
        def __init__(self):
            self.responses = _DummyResponses2()
    openai_stub.OpenAI = OpenAI2
    sys.modules['openai'] = openai_stub

    # Prepare a stub requests module to satisfy import inside generate_text
    class _StreamResp:
        status_code = 200

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def raise_for_status(self):
            return None

        def iter_lines(self, decode_unicode=False):
            import json as _json
            # Simulate two streaming chunks then done
            yield _json.dumps({"response": "Hello ", "done": False})
            yield _json.dumps({"response": "world", "done": True})

    class _RequestsStub:
        def get(self, url, timeout=None):
            # Simulate ollama tags endpoint containing the model
            class _Resp:
                status_code = 200
                def json(self):
                    return {"models": [{"name": "qwen3-coder:14b"}]}
            return _Resp()
        def post(self, url, json=None, timeout=None, stream=False):  # noqa: A002 - keep signature
            if stream:
                return _StreamResp()
            class _Resp:
                def raise_for_status(self):
                    return None
                def json(self):
                    return {"response": "Hello world"}
            return _Resp()

    sys.modules['requests'] = _RequestsStub()  # type: ignore

    # Import target module fresh per test to pick up stub
    import importlib
    if 'server.env_model' in sys.modules:
        del sys.modules['server.env_model']
    import server.env_model as em

    text, meta = em.generate_text(user_input="hi", model="qwen3-coder:14b")
    assert "Hello" in text
