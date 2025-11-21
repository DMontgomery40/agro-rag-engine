import os
from typing import Optional, Dict, Any, Tuple

try:
    from openai import OpenAI
except Exception as e:
    raise RuntimeError("openai>=1.x is required for Responses API") from e

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached generation parameters
_GEN_MODEL = None
_GEN_TEMPERATURE = None
_GEN_MAX_TOKENS = None
_GEN_TOP_P = None
_GEN_TIMEOUT = None
_GEN_RETRY_MAX = None
_ENRICH_MODEL = None
_ENRICH_BACKEND = None
_ENRICH_DISABLED = None
_OLLAMA_NUM_CTX = None

def _load_cached_config():
    """Load all generation config values into module-level cache."""
    global _GEN_MODEL, _GEN_TEMPERATURE, _GEN_MAX_TOKENS, _GEN_TOP_P, _GEN_TIMEOUT
    global _GEN_RETRY_MAX, _ENRICH_MODEL, _ENRICH_BACKEND, _ENRICH_DISABLED, _OLLAMA_NUM_CTX

    if _config_registry is None:
        # Fallback to env vars
        _GEN_MODEL = os.getenv('GEN_MODEL', 'gpt-4o-mini')
        _GEN_TEMPERATURE = float(os.getenv('GEN_TEMPERATURE', '0.0') or '0.0')
        _GEN_MAX_TOKENS = int(os.getenv('GEN_MAX_TOKENS', '2048') or '2048')
        _GEN_TOP_P = float(os.getenv('GEN_TOP_P', '1.0') or '1.0')
        _GEN_TIMEOUT = int(os.getenv('GEN_TIMEOUT', '60') or '60')
        _GEN_RETRY_MAX = int(os.getenv('GEN_RETRY_MAX', '2') or '2')
        _ENRICH_MODEL = os.getenv('ENRICH_MODEL', 'gpt-4o-mini')
        _ENRICH_BACKEND = os.getenv('ENRICH_BACKEND', 'openai')
        _ENRICH_DISABLED = int(os.getenv('ENRICH_DISABLED', '0') or '0')
        _OLLAMA_NUM_CTX = int(os.getenv('OLLAMA_NUM_CTX', '8192') or '8192')
    else:
        _GEN_MODEL = _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
        _GEN_TEMPERATURE = _config_registry.get_float('GEN_TEMPERATURE', 0.0)
        _GEN_MAX_TOKENS = _config_registry.get_int('GEN_MAX_TOKENS', 2048)
        _GEN_TOP_P = _config_registry.get_float('GEN_TOP_P', 1.0)
        _GEN_TIMEOUT = _config_registry.get_int('GEN_TIMEOUT', 60)
        _GEN_RETRY_MAX = _config_registry.get_int('GEN_RETRY_MAX', 2)
        _ENRICH_MODEL = _config_registry.get_str('ENRICH_MODEL', 'gpt-4o-mini')
        _ENRICH_BACKEND = _config_registry.get_str('ENRICH_BACKEND', 'openai')
        _ENRICH_DISABLED = _config_registry.get_int('ENRICH_DISABLED', 0)
        _OLLAMA_NUM_CTX = _config_registry.get_int('OLLAMA_NUM_CTX', 8192)

def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()

# Initialize cache on module import
_load_cached_config()

_DEFAULT_MODEL = _GEN_MODEL
_DEFAULT_TEMPERATURE = _GEN_TEMPERATURE

_client = None
_mlx_model = None
_mlx_tokenizer = None

def _get_mlx_model():
    global _mlx_model, _mlx_tokenizer
    if _mlx_model is None:
        from mlx_lm import load
        # Use cached config value
        model_name = _GEN_MODEL or "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit"
        _mlx_model, _mlx_tokenizer = load(model_name)
    return _mlx_model, _mlx_tokenizer

def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client

def _extract_text(resp: Any) -> str:
    txt = ""
    if hasattr(resp, "output_text") and isinstance(getattr(resp, "output_text"), str):
        txt = resp.output_text
        if txt:
            return txt
    try:
        out = getattr(resp, "output", None)
        if out and len(out) > 0:
            cont = getattr(out[0], "content", None)
            if cont and len(cont) > 0 and hasattr(cont[0], "text"):
                return cont[0].text or ""
    except Exception:
        pass
    return txt or ""

def generate_text(
    user_input: str,
    *,
    system_instructions: Optional[str] = None,
    model: Optional[str] = None,
    reasoning_effort: Optional[str] = None,
    response_format: Optional[Dict[str, Any]] = None,
    store: bool = False,
    previous_response_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Tuple[str, Any]:
    mdl = model or _DEFAULT_MODEL
    kwargs: Dict[str, Any] = {
        "model": mdl,
        "input": user_input,
        "store": store,
    }
    # Use cached temperature value
    temp = _GEN_TEMPERATURE
    kwargs["temperature"] = temp
    if system_instructions:
        kwargs["instructions"] = system_instructions
    if reasoning_effort:
        kwargs["reasoning"] = {"effort": reasoning_effort}
    if response_format:
        kwargs["response_format"] = response_format
    if previous_response_id:
        kwargs["previous_response_id"] = previous_response_id
    if extra:
        kwargs.update(extra)

    # Use cached enrich backend
    ENRICH_BACKEND = (_ENRICH_BACKEND or "").lower()
    is_mlx_model = mdl.startswith("mlx-community/") if mdl else False
    prefer_mlx = (ENRICH_BACKEND == "mlx") or is_mlx_model

    if prefer_mlx:
        try:
            from mlx_lm import generate
            model, tokenizer = _get_mlx_model()
            sys_text = (system_instructions or "").strip()
            prompt = (f"<system>{sys_text}</system>\n" if sys_text else "") + user_input
            text = generate(
                model,
                tokenizer,
                prompt=prompt,
                max_tokens=2048,
                verbose=False
            )
            return text, {"response": text, "backend": "mlx"}
        except Exception:
            pass

    OLLAMA_URL = os.getenv("OLLAMA_URL")
    prefer_ollama = bool(OLLAMA_URL)
    if prefer_ollama:
        try:
            import requests
            import json as _json
            import time
            sys_text = (system_instructions or "").strip()
            prompt = (f"<system>{sys_text}</system>\n" if sys_text else "") + user_input
            url = OLLAMA_URL.rstrip("/") + "/generate"
            max_retries = 2
            chunk_timeout = 60
            total_timeout = 300
            for attempt in range(max_retries + 1):
                start_time = time.time()
                try:
                    with requests.post(url, json={
                        "model": mdl,
                        "prompt": prompt,
                        "stream": True,
                        "options": {"temperature": temp, "num_ctx": 8192},
                    }, timeout=chunk_timeout, stream=True) as r:
                        r.raise_for_status()
                        buf = []
                        last = None
                        for line in r.iter_lines(decode_unicode=True):
                            if time.time() - start_time > total_timeout:
                                partial = ("".join(buf) or "").strip()
                                if partial:
                                    return partial + " [TIMEOUT]", {"response": partial, "timeout": True}
                                break
                            if not line:
                                continue
                            try:
                                obj = _json.loads(line)
                            except Exception:
                                continue
                            if isinstance(obj, dict):
                                seg = (obj.get("response") or "")
                                if seg:
                                    buf.append(seg)
                                last = obj
                                if obj.get("done") is True:
                                    break
                        text = ("".join(buf) or "").strip()
                        if text:
                            return text, (last or {"response": text})
                    resp = requests.post(url, json={
                        "model": mdl,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": temp, "num_ctx": 8192},
                    }, timeout=total_timeout)
                    resp.raise_for_status()
                    data = resp.json()
                    text = (data.get("response") or "").strip()
                    if text:
                        return text, data
                except (requests.Timeout, requests.ConnectionError):
                    if attempt < max_retries:
                        backoff = 2 ** attempt
                        time.sleep(backoff)
                        continue
                except Exception:
                    break
        except Exception:
            pass

    import time as timer
    from server.api_tracker import track_api_call, APIProvider

    try:
        # OpenAI Responses API (supports temperature)
        start = timer.time()
        resp = client().responses.create(**kwargs)
        duration_ms = (timer.time() - start) * 1000
        text = _extract_text(resp)

        # Track API call
        tokens_used = getattr(getattr(resp, 'usage', None), 'total_tokens', 0) or 0
        prompt_tokens = getattr(getattr(resp, 'usage', None), 'prompt_tokens', 0) or tokens_used // 2
        completion_tokens = getattr(getattr(resp, 'usage', None), 'completion_tokens', 0) or tokens_used // 2
        # gpt-4o-mini pricing: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
        cost_usd = (prompt_tokens / 1_000_000) * 0.15 + (completion_tokens / 1_000_000) * 0.60

        track_api_call(
            provider=APIProvider.OPENAI,
            endpoint="https://api.openai.com/v1/responses",
            method="POST",
            duration_ms=duration_ms,
            status_code=200,
            tokens_estimated=tokens_used,
            cost_usd=cost_usd
        )

        return text, resp
    except Exception:
        try:
            messages = []
            if system_instructions:
                messages.append({"role": "system", "content": system_instructions})
            messages.append({"role": "user", "content": user_input})
            # Chat Completions fallback (supports temperature as well)
            ckwargs: Dict[str, Any] = {"model": mdl, "messages": messages, "temperature": temp}
            if response_format and isinstance(response_format, dict):
                ckwargs["response_format"] = response_format

            start = timer.time()
            cc = client().chat.completions.create(**ckwargs)
            duration_ms = (timer.time() - start) * 1000

            text = (cc.choices[0].message.content if getattr(cc, "choices", []) else "") or ""

            # Track API call
            tokens_used = getattr(getattr(cc, 'usage', None), 'total_tokens', 0) or 0
            prompt_tokens = getattr(getattr(cc, 'usage', None), 'prompt_tokens', 0) or tokens_used // 2
            completion_tokens = getattr(getattr(cc, 'usage', None), 'completion_tokens', 0) or tokens_used // 2
            # gpt-4o-mini pricing: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
            cost_usd = (prompt_tokens / 1_000_000) * 0.15 + (completion_tokens / 1_000_000) * 0.60

            track_api_call(
                provider=APIProvider.OPENAI,
                endpoint="https://api.openai.com/v1/chat/completions",
                method="POST",
                duration_ms=duration_ms,
                status_code=200,
                tokens_estimated=tokens_used,
                cost_usd=cost_usd
            )

            return text, cc
        except Exception as e:
            raise RuntimeError(f"Generation failed for model={mdl}: {e}")
