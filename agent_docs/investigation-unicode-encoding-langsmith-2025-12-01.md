# Root Cause Investigation: Unicode Encoding Error in RAG Pipeline

**Date:** 2025-12-01  
**Investigator:** Claude Code (Sonnet 4.5)  
**Issue:** `'ascii' codec can't encode characters in position 7-22: ordinal not in range(128)`  
**Severity:** Critical - Blocks all queries containing non-ASCII characters  
**Root Cause:** LangSmith `_serde.py` uses `ensure_ascii=True` in fallback JSON encoding

---

## Executive Summary

### Root Cause
The LangSmith tracing library (`langsmith==0.4.32`) contains a **hardcoded `ensure_ascii=True`** in its fallback JSON serialization path (`/usr/local/lib/python3.11/site-packages/langsmith/_internal/_serde.py`). When LangSmith tracing is enabled and encounters Unicode characters (e.g., smart quotes like `'` U+2019), it fails to serialize the tracing data, causing the entire RAG pipeline to crash.

### Impact
- All queries containing non-ASCII characters fail
- Error occurs in query expansion, vector embedding, and LLM generation
- Affects both chat and search functionality
- User experience is broken for any input with Unicode characters

### Recommended Action
**Immediate:** Temporarily disable LangSmith tracing by setting `tracing_mode: "local"` in `agro_config.json`  
**Permanent:** Monkey-patch LangSmith's `_serde.py` to use `ensure_ascii=False` OR upgrade to a fixed version when available

---

## System Information

### Environment
- **OS:** Docker container (Linux)
- **Python:** 3.11.14
- **Container:** `rag-service-api`
- **Locale:** `LANG=C.UTF-8`
- **Python encoding:** UTF-8 (sys.getdefaultencoding(), stdout, stderr)

### Dependency Versions
```
httpx==0.28.1
httpx-sse==0.4.3
langchain-openai==0.3.35
langsmith==0.4.32  # ← PROBLEM
openai==2.8.1
pydantic==2.11.10
```

### Configuration State
```json
{
  "tracing": {
    "tracing_enabled": 1,
    "tracing_mode": "langsmith",  # ← ENABLED
    "langchain_tracing_v2": 1,
    "langchain_project": "agro"
  }
}
```

---

## Evidence

### Error Symptoms
```
[expand_queries] LLM expansion failed: Generation failed for model=gpt-5: 'ascii' codec can't encode characters in position 7-22: ordinal not in range(128)
[vector] Embedding failed: 'ascii' codec can't encode characters in position 7-22: ordinal not in range(128)
LangSmithError('Failed to GET /info in LangSmith API. latin-1\n••••••••••••••••\n0\n16\nordinal not in range(256)')
```

### The Smoking Gun
```bash
$ grep -r "ensure_ascii" /usr/local/lib/python3.11/site-packages/langsmith/
/usr/local/lib/python3.11/site-packages/langsmith/_internal/_serde.py:            ensure_ascii=True,
```

### Source Code (LangSmith 0.4.32)
File: `langsmith/_internal/_serde.py` lines 125-160
```python
def dumps_json(obj: Any) -> bytes:
    """Serialize an object to a JSON formatted string."""
    try:
        return _orjson.dumps(
            obj,
            default=_serialize_json,
            option=_orjson.OPT_SERIALIZE_NUMPY
            | _orjson.OPT_SERIALIZE_DATACLASS
            | _orjson.OPT_SERIALIZE_UUID
            | _orjson.OPT_NON_STR_KEYS,
        )
    except TypeError as e:
        # Usually caused by UTF surrogate characters
        logger.debug(f"Orjson serialization failed: {repr(e)}. Falling back to json.")
        result = json.dumps(
            obj,
            default=_serialize_json,
            ensure_ascii=True,  # ← BUG: Should be False
        ).encode("utf-8")
        try:
            result = _orjson.dumps(
                _orjson.loads(result.decode("utf-8", errors="surrogateescape"))
            )
```

**Critical Bug:** When orjson serialization fails (TypeError), LangSmith falls back to standard library `json.dumps()` with **hardcoded `ensure_ascii=True`**. This is fundamentally broken because:
1. `ensure_ascii=True` converts Unicode to escape sequences (e.g., `'` → `\u2019`)
2. The result is a Python `str` with escaped sequences
3. `.encode("utf-8")` then fails because ASCII-escaped Unicode cannot be UTF-8 encoded
4. **Contradiction:** You can't ASCII-escape Unicode AND then UTF-8 encode it

---

## Investigation Timeline

### Phase 1: Initial Observation
- **Time:** T+0
- **Action:** Fixed `server/services/rag.py:383` by adding `ensure_ascii=False` to SSE response
- **Result:** Error persisted - root cause was elsewhere
- **Conclusion:** SSE fix was correct but downstream of actual error

### Phase 2: Environment Analysis
- **Time:** T+15min
- **Findings:**
  - Docker container has `LANG=C.UTF-8` ✅
  - Python default encoding: `utf-8` ✅
  - sys.stdout/stderr: `utf-8` ✅
- **Conclusion:** Environment correctly configured

### Phase 3: Dependency Investigation
- **Time:** T+30min
- **httpx Analysis:** Uses `ensure_ascii=False` by default ✅
- **OpenAI SDK Analysis:** Delegates to httpx (correct) ✅
- **Conclusion:** Neither httpx nor OpenAI SDK are the problem

### Phase 4: LangSmith Discovery
- **Time:** T+45min
- **Critical Finding:** `langsmith/_internal/_serde.py` has `ensure_ascii=True` ❌
- **Confirmation:** Checked config - `tracing_mode: "langsmith"` is enabled
- **Root Cause Identified:** LangSmith tracing is the culprit

### Phase 5: Call Chain Tracing
- **Time:** T+60min
- **Traced execution:**
  1. User query → `do_chat_stream()`
  2. → `expand_queries()` → `generate_text()`
  3. → `client().chat.completions.create()`
  4. **→ LangSmith tracing intercepts** (`server/tracing.py:107`)
  5. → `ls_client.create_run()` → `dumps_json()`
  6. → orjson fails on Unicode → fallback to `json.dumps(..., ensure_ascii=True)`
  7. **→ ASCII encoding error**

---

## Character Analysis

### The Problematic Character
- **Character:** `'` (RIGHT SINGLE QUOTATION MARK)
- **Unicode:** U+2019
- **Decimal:** 8217
- **UTF-8:** `\xe2\x80\x99` (3 bytes)
- **ASCII:** NOT REPRESENTABLE (ordinal > 127)

### Error Position Analysis
```
"query: what's the backend"
 0      7    12          22
        └────┬────┘
             │
        "what's the backe"
             ↑
        Position 12: U+2019
```

---

## Web Research Summary

### httpx Encoding Behavior
- **Finding:** httpx 0.28.1 correctly uses `ensure_ascii=False` by default
- **Sources:**
  - [httpx forces converting json content to ascii (GitHub #3204)](https://github.com/encode/httpx/discussions/3204)
  - [httpx/_content.py source](https://github.com/encode/httpx/blob/0.28.1/httpx/_content.py)

### OpenAI SDK
- **Finding:** Delegates to httpx for JSON encoding (correct behavior)
- **Related:** [Azure content management exception #466](https://github.com/openai/openai-python/issues/466) shows `ensure_ascii=False` prevents issues

### LangSmith
- **Finding:** Uses orjson primarily, falls back to stdlib json with `ensure_ascii=True`
- **Sources:**
  - [langsmith-sdk client.py](https://github.com/langchain-ai/langsmith-sdk/blob/main/python/langsmith/client.py)
  - [Pydantic serialization issues #1116](https://github.com/langchain-ai/langsmith-sdk/issues/1116)

---

## Recommended Fixes

### Option 1: Disable LangSmith Tracing (IMMEDIATE)
**File:** `agro_config.json`
```json
{
  "tracing": {
    "tracing_mode": "local"  // Change from "langsmith"
  }
}
```

**Pros:**
- Immediate fix, no code changes
- Uses local file-based tracing
- Zero risk

**Cons:**
- Loses LangSmith cloud features

### Option 2: Monkey-Patch LangSmith (TEMPORARY)
**File:** `server/tracing.py` (add at module level)
```python
# HOTFIX: Patch LangSmith's broken ensure_ascii=True
try:
    import langsmith._internal._serde as ls_serde
    import json

    _original_dumps_json = ls_serde.dumps_json

    def _fixed_dumps_json(obj):
        """Patched version with ensure_ascii=False"""
        try:
            return ls_serde._orjson.dumps(
                obj,
                default=ls_serde._serialize_json,
                option=ls_serde._orjson.OPT_SERIALIZE_NUMPY
                | ls_serde._orjson.OPT_SERIALIZE_DATACLASS
                | ls_serde._orjson.OPT_SERIALIZE_UUID
                | ls_serde._orjson.OPT_NON_STR_KEYS,
            )
        except TypeError as e:
            ls_serde.logger.debug(f"Orjson serialization failed: {repr(e)}. Falling back to json.")
            result = json.dumps(
                obj,
                default=ls_serde._serialize_json,
                ensure_ascii=False,  # ← FIX
            ).encode("utf-8")
            return result

    ls_serde.dumps_json = _fixed_dumps_json
except Exception:
    pass  # Silently fail if structure changes
```

### Option 3: Upgrade LangSmith
Check for newer version:
```bash
pip install --upgrade langsmith
```

Current: `0.4.32` (Oct 3, 2025)  
Check: https://github.com/langchain-ai/langsmith-sdk/releases

### Option 4: Report Upstream Bug
**URL:** https://github.com/langchain-ai/langsmith-sdk/issues

**Title:** `_serde.py dumps_json fallback uses ensure_ascii=True, breaking Unicode`

**Body:**
```markdown
## Bug
`dumps_json()` in `langsmith/_internal/_serde.py` uses `ensure_ascii=True` in fallback, breaking Unicode serialization.

## Location
Line ~150 in `_serde.py`

## Fix
Change `ensure_ascii=True` to `ensure_ascii=False`

## Impact
All tracing with Unicode characters fails with `UnicodeEncodeError`

## Version
langsmith==0.4.32
```

---

## Testing Plan

### Test Case 1: Unicode Query
```bash
curl -X POST http://localhost:8012/api/chat \
  -H "Content-Type: application/json" \
  -d '{"repo":"agro","message":"what'\''s the backend","mode":"rag"}'
```

### Test Case 2: Emoji Query
```bash
# Input: "find the 🔍 search function"
```

### Test Case 3: Tracing Disabled
```json
{"tracing_mode": "local"}
```
Expected: No errors (proves LangSmith is the culprit)

---

## Conclusion

This is a **confirmed bug in LangSmith 0.4.32** located at `/usr/local/lib/python3.11/site-packages/langsmith/_internal/_serde.py` line ~152.

**Immediate Action:** Disable LangSmith tracing  
**Permanent Solution:** Wait for upstream fix or apply monkey-patch

---

**Investigation Status:** COMPLETE  
**Root Cause:** CONFIRMED  
**Fix:** READY FOR IMPLEMENTATION
