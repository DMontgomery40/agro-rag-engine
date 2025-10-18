A) autoprofile.py — pure function (no framework), ~300 LOC
# autoprofile.py
# Deterministic auto-profile selector for RAG SaaS (v1.2)
# - No estimator calls
# - No RAM/VRAM thresholds
# - Capability + Policy + Catalog + Objective + Constraints
# - Returns (env, reason)

from typing import Any, Dict, List, Optional, Tuple

Number = float

def _looks_local(model_id: Optional[str]) -> bool:
    return bool(model_id) and (":" in model_id)

def _any_true(d: Dict[str, Any], keys: List[str]) -> bool:
    return any(bool(d.get(k)) for k in keys)

def _safe_num(x: Any, default: Number = 0.0) -> Number:
    try:
        n = float(x)
        if n != n:  # NaN
            return default
        return n
    except Exception:
        return default

def _normalize_workload(workload: Dict[str, Any]) -> Dict[str, Number]:
    R = _safe_num(workload.get("requests_per_day"), 0)
    Tin = _safe_num(workload.get("tokens_in_per_req"), 0)
    Tout = _safe_num(workload.get("tokens_out_per_req"), 0)
    MQ = _safe_num(workload.get("mq_rewrites"), 1)
    E_tokens = _safe_num(workload.get("embed_tokens_per_req"), Tin) * MQ
    K_base = max(256.0, float(int(Tout // 4)))  # conservative default
    K_tokens = _safe_num(workload.get("rerank_tokens_per_req"), K_base) * MQ
    return dict(R=R, Tin=Tin, Tout=Tout, MQ=MQ, E_tokens=E_tokens, K_tokens=K_tokens)

def _weights(wl: Dict[str, Number]) -> Dict[str, Number]:
    # Workload-proportional weights (normalize to sum==1)
    W_GEN = wl["R"] * (wl["Tin"] + wl["Tout"])
    W_EMB = wl["R"] * wl["E_tokens"]
    W_RR  = wl["R"] * wl["K_tokens"]
    total = W_GEN + W_EMB + W_RR
    if total <= 0:
        return dict(Wg=1/3, We=1/3, Wr=1/3)
    return dict(Wg=W_GEN/total, We=W_EMB/total, Wr=W_RR/total)

def _allowed_set(policy: Dict[str, Any]) -> set:
    providers = policy.get("providers_allowed") or []
    return set([p.lower() for p in providers if isinstance(p, str)])

def _meets_policy_maps(candidate: Dict[str, Any], policy: Dict[str, Any]) -> bool:
    # Optional: if you don't maintain maps, this returns True
    regions_allowed = policy.get("regions_allowed")
    compliance = policy.get("compliance")
    # Candidate may propagate provider row metadata to its components
    for comp in ("GEN", "EMB", "RERANK"):
        row = candidate.get(comp, {})
        if not row:
            return False
        region = row.get("region")  # optional
        comp_flags = set(row.get("compliance", []) or [])
        if regions_allowed and region and region not in regions_allowed:
            return False
        if compliance and comp_flags and not comp_flags.issuperset(set(compliance)):
            return False
    return True

def _component_rows(
    comp_type: str,
    ALLOW: set,
    prices: Dict[str, Any],
    include_local: bool = False
) -> List[Dict[str, Any]]:
    """Return a small list of viable rows for a component.
       For GEN: generative cloud rows with token pricing + local stub (optional).
       For EMB: rows with embed_per_1k > 0 + optional local stub.
       For RERANK: rows with rerank_per_1k > 0 (or per_request) + optional local stub.
    """
    rows = []
    models = prices.get("models") or []
    comp = comp_type.upper()

    for m in models:
        prov = (m.get("provider") or "").lower()
        if prov == "local":
            continue
        if prov not in ALLOW:
            continue

        unit = (m.get("unit") or "")
        # classify
        if comp == "GEN":
            # generative rows must have 1k token pricing and be non-zero on either side
            if unit == "1k_tokens" and (_safe_num(m.get("input_per_1k")) > 0 or _safe_num(m.get("output_per_1k")) > 0):
                rows.append(_decorate_row(m, comp))
        elif comp == "EMB":
            if _safe_num(m.get("embed_per_1k")) > 0:
                rows.append(_decorate_row(m, comp))
        elif comp == "RERANK":
            if _safe_num(m.get("rerank_per_1k")) > 0 or unit == "request":
                rows.append(_decorate_row(m, comp))

    # include local stubs (cost=0) if requested
    if include_local:
        local_stub = dict(provider="local", model="local", unit="request",
                          quality_score=0.5, latency_p95_ms=None, throughput_qps=None)
        rows.insert(0, _decorate_row(local_stub, comp))

    # sort by quality_score desc (fallback handled in _decorate_row)
    rows.sort(key=lambda r: r["quality_score"], reverse=True)
    # keep only a small top list to avoid cartesian explosion
    cap = 4 if comp == "GEN" else 3
    return rows[:cap]

def _decorate_row(m: Dict[str, Any], comp_type: str) -> Dict[str, Any]:
    # Ensure required keys exist with safe fallbacks for quality/latency
    out = dict(m)
    out["comp"] = comp_type.upper()
    out["provider"] = (out.get("provider") or "").lower()
    qs = out.get("quality_score")
    out["quality_score"] = 0.5 if qs is None else _safe_num(qs, 0.5)
    # passthrough latency/throughput if present
    if out.get("latency_p95_ms") is not None:
        out["latency_p95_ms"] = _safe_num(out["latency_p95_ms"], None)
    if out.get("throughput_qps") is not None:
        out["throughput_qps"] = _safe_num(out["throughput_qps"], None)
    return out

def _pair_limited(GENs, EMBs, RRs, limit: int = 60) -> List[Dict[str, Any]]:
    # bounded cross-product
    out = []
    for g in GENs:
        for e in EMBs:
            for r in RRs:
                out.append({"GEN": g, "EMB": e, "RERANK": r})
                if len(out) >= limit:
                    return out
    return out

def _valid_pipeline(c: Dict[str, Any]) -> bool:
    g = c.get("GEN")
    return bool(g and g.get("provider") and g.get("model"))

def _meets_slos(c: Dict[str, Any], slo: Dict[str, Any]) -> bool:
    # Optional hard filters
    target_ms = slo.get("latency_target_ms")
    min_qps   = slo.get("min_qps")
    if target_ms is None and min_qps is None:
        return True

    for comp in ("GEN", "EMB", "RERANK"):
        row = c.get(comp, {})
        if target_ms is not None and row.get("latency_p95_ms") is not None:
            if _safe_num(row.get("latency_p95_ms")) > float(target_ms):
                return False
        if min_qps is not None and row.get("throughput_qps") is not None:
            if _safe_num(row.get("throughput_qps")) < float(min_qps):
                return False
    return True

def _monthly_cost(c: Dict[str, Any], wl: Dict[str, Number]) -> Number:
    R = wl["R"]; Tin = wl["Tin"]; Tout = wl["Tout"]
    E_tokens = wl["E_tokens"]; K_tokens = wl["K_tokens"]
    P = 30.0

    def gen_cost(row):
        if row.get("provider") == "local":
            return 0.0
        inp = _safe_num(row.get("input_per_1k"))
        out = _safe_num(row.get("output_per_1k"))
        return (Tin/1000.0)*inp + (Tout/1000.0)*out

    def emb_cost(row):
        if row.get("provider") == "local":
            return 0.0
        emb = _safe_num(row.get("embed_per_1k"))
        return (E_tokens/1000.0)*emb

    def rr_cost(row):
        if row.get("provider") == "local":
            return 0.0
        # prefer rerank_per_1k when available; otherwise unit 'request' per_request
        rrk = row.get("rerank_per_1k")
        if rrk is not None:
            return (K_tokens/1000.0)*_safe_num(rrk)
        # unit per request
        return _safe_num(row.get("per_request"))

    per_req = gen_cost(c["GEN"]) + emb_cost(c["EMB"]) + rr_cost(c["RERANK"])
    return per_req * R * P

def _lat_bonus(lat_ms: Optional[Number], target_ms: Optional[Number], alpha=0.02, beta=0.05) -> Number:
    if lat_ms is None or target_ms is None:
        return 0.0
    if lat_ms <= target_ms:
        return alpha
    return -beta * ((lat_ms - target_ms) / target_ms)

def _utility(c: Dict[str, Any], wl_w: Dict[str, Number], defaults: Dict[str, Any], slo: Dict[str, Any]) -> Number:
    # Quality scores
    Qg = _safe_num(c["GEN"].get("quality_score"), 0.5)
    Qe = _safe_num(c["EMB"].get("quality_score"), 0.5)
    Qr = _safe_num(c["RERANK"].get("quality_score"), 0.5)

    # Latency soft bonus/penalty if SLO target exists and metadata present
    target_ms = slo.get("latency_target_ms")
    Lg = _lat_bonus(c["GEN"].get("latency_p95_ms"), target_ms)
    Le = _lat_bonus(c["EMB"].get("latency_p95_ms"), target_ms)
    Lr = _lat_bonus(c["RERANK"].get("latency_p95_ms"), target_ms)

    U_gen = Qg + Lg
    U_emb = Qe + Le
    U_rr  = Qr + Lr

    U = wl_w["Wg"]*U_gen + wl_w["We"]*U_emb + wl_w["Wr"]*U_rr

    # default GEN tie-breaker (tiny nudge, never dominates)
    def_gen = defaults.get("gen_model")
    if def_gen and c["GEN"].get("model") == def_gen:
        U += 0.01
    return U

def _select_cost(C: List[Dict[str, Any]], B: Optional[Number]) -> Dict[str, Any]:
    if B is not None:
        feasible = [c for c in C if c["monthly"] <= B]
        if feasible:
            return min(feasible, key=lambda x: x["monthly"])
    return min(C, key=lambda x: x["monthly"])

def _select_performance(C: List[Dict[str, Any]]) -> Dict[str, Any]:
    # maximize utility; tie-break by min cost
    bestU = max(c["utility"] for c in C)
    top = [c for c in C if c["utility"] == bestU]
    return min(top, key=lambda x: x["monthly"])

def _select_balanced(C: List[Dict[str, Any]], B: Optional[Number]) -> Dict[str, Any]:
    if B is not None:
        feasible = [c for c in C if c["monthly"] <= B]
        if feasible:
            # choose max utility, tie by min cost
            bestU = max(c["utility"] for c in feasible)
            top = [c for c in feasible if c["utility"] == bestU]
            return min(top, key=lambda x: x["monthly"])
        # No feasible: use U - λ·overshoot
        lam = 1.0 / (B if B and B > 0 else 1.0)
        def score(c): return c["utility"] - lam * (c["monthly"] - B)
        return max(C, key=score)
    # No budget: behave like performance
    return _select_performance(C)

def autoprofile(request: Dict[str, Any], prices: Dict[str, Any]) -> Tuple[Dict[str, str], Dict[str, Any]]:
    """
    request: {hardware, policy, workload, objective, defaults}
    prices : price catalog dict (with optional quality/latency metadata)
    returns: (env_map, reason)
    """
    hw = request.get("hardware", {})
    rt = hw.get("runtimes", {}) or {}
    policy = request.get("policy", {}) or {}
    wl = _normalize_workload(request.get("workload", {}) or {})
    obj = request.get("objective", {}) or {}
    defaults = request.get("defaults", {}) or {}

    ALLOW = _allowed_set(policy)
    local_cap = _any_true(rt, ["cuda","ollama","coreml","openvino","vpu","npu"])
    B = obj.get("monthly_budget_usd")
    mode = (obj.get("mode") or "balanced").lower()
    slo = {
        "latency_target_ms": obj.get("latency_target_ms"),
        "min_qps": obj.get("min_qps")
    }

    W = _weights(wl)

    # Build candidate sets
    C: List[Dict[str, Any]] = []

    # Local-hybrid path (GEN can be local or cloud; EMB/RR can be local or cloud)
    if local_cap:
        gen_local = defaults.get("gen_model") if _looks_local(defaults.get("gen_model")) else None
        top_cloud_gen = _component_rows("GEN", ALLOW, prices, include_local=False)
        GENs = [{"provider":"local","model":gen_local}] if gen_local else top_cloud_gen
        EMBs = _component_rows("EMB", ALLOW, prices, include_local=True)   # include local
        RRs  = _component_rows("RERANK", ALLOW, prices, include_local=True) # include local
        C.extend(_pair_limited(GENs, EMBs, RRs, limit=60))

    # Pure cloud
    GENs = _component_rows("GEN", ALLOW, prices, include_local=False)
    EMBs = _component_rows("EMB", ALLOW, prices, include_local=local_cap)    # allow local ER too
    RRs  = _component_rows("RERANK", ALLOW, prices, include_local=local_cap)
    C.extend(_pair_limited(GENs, EMBs, RRs, limit=60))

    # Validate and optional filters
    C = [c for c in C if _valid_pipeline(c)]
    C = [c for c in C if _meets_slos(c, slo)]
    # Optional compliance/region maps: if absent, skip
    try:
        C = [c for c in C if _meets_policy_maps(c, policy)]
    except Exception:
        pass

    if not C:
        return {}, {"error":"no_viable_candidate", "why":"after building/filters"}

    # Cost & Utility
    for c in C:
        c["monthly"] = _monthly_cost(c, wl)
        c["utility"] = _utility(c, W, defaults, slo)

    # Select by objective
    if mode == "cost":
        winner = _select_cost(C, B)
    elif mode == "performance":
        winner = _select_performance(C)
    else:
        winner = _select_balanced(C, B)

    # Build env
    env: Dict[str, str] = {
        "HYDRATION_MODE": "lazy",
        "MQ_REWRITES": str(int(wl["MQ"]) if wl["MQ"] > 0 else 1),
        "GEN_MODEL": winner["GEN"]["model"] if winner["GEN"]["provider"] != "local"
                     else winner["GEN"]["model"],
        "EMBEDDING_TYPE": "local" if winner["EMB"]["provider"] == "local" else winner["EMB"]["provider"],
        "RERANK_BACKEND": "local" if winner["RERANK"]["provider"] == "local" else winner["RERANK"]["provider"]
    }
    if env["RERANK_BACKEND"] == "cohere":
        env["COHERE_RERANK_MODEL"] = winner["RERANK"]["model"]

    reason = {
        "objective": mode,
        "budget": B,
        "workload": wl,
        "weights": W,
        "selected": {
            "gen": winner["GEN"],
            "embed": winner["EMB"],
            "rerank": winner["RERANK"],
            "monthly": winner["monthly"],
            "utility": winner["utility"]
        }
    }
    return env, reason

B) Add a tiny endpoint to your FastAPI backend

Append this to serve_rag.py (paths may differ in your repo; keep it minimal and safe):

# --- BEGIN: /api/profile/autoselect (minimal) ---
from typing import Any, Dict
import json, os
from fastapi import Body, HTTPException

try:
    from autoprofile import autoprofile as _ap_select
except Exception as e:
    _ap_select = None

def _read_prices_fallback() -> Dict[str, Any]:
    # Try common locations; fall back to empty catalog
    candidates = [
        os.path.join("gui", "prices.json"),
        os.path.join("gui_phase_1", "gui", "prices.json"),
        "prices.json"
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return json.loads(open(p, "r", encoding="utf-8").read())
            except Exception:
                pass
    return {"models": []}

@app.post("/api/profile/autoselect")
def api_profile_autoselect(payload: Dict[str, Any] = Body(...)):
    if _ap_select is None:
        raise HTTPException(status_code=500, detail="autoprofile module not available")
    prices = _read_prices_fallback()
    env, reason = _ap_select(payload, prices)
    if not env:
        raise HTTPException(status_code=422, detail=reason)
    return {"env": env, "reason": reason}
# --- END: /api/profile/autoselect ---

C) One-shot installer (safe to paste)
# from repo root
set -euo pipefail

echo ">>> write autoprofile.py"
cat > autoprofile.py <<'PY'
# (paste the ENTIRE contents of autoprofile.py from section A here, verbatim)
PY

echo ">>> back up serve_rag.py and append endpoint"
cp -n serve_rag.py serve_rag.py.bak || true
cat >> serve_rag.py <<'PY'

# --- BEGIN: /api/profile/autoselect (minimal) ---
from typing import Any, Dict
import json, os
from fastapi import Body, HTTPException

try:
    from autoprofile import autoprofile as _ap_select
except Exception as e:
    _ap_select = None

def _read_prices_fallback() -> Dict[str, Any]:
    candidates = [
        os.path.join("gui", "prices.json"),
        os.path.join("gui_phase_1", "gui", "prices.json"),
        "prices.json"
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return json.loads(open(p, "r", encoding="utf-8").read())
            except Exception:
                pass
    return {"models": []}

@app.post("/api/profile/autoselect")
def api_profile_autoselect(payload: Dict[str, Any] = Body(...)):
    if _ap_select is None:
        raise HTTPException(status_code=500, detail="autoprofile module not available")
    prices = _read_prices_fallback()
    env, reason = _ap_select(payload, prices)
    if not env:
        raise HTTPException(status_code=422, detail=reason)
    return {"env": env, "reason": reason}
# --- END: /api/profile/autoselect ---
PY

echo ">>> done"

D) How to call it (GUI or CLI)
# Example “balanced” request (no estimator involved)
curl -s http://127.0.0.1:8012/api/profile/autoselect \
  -H 'Content-Type: application/json' \
  -d '{
    "hardware": { "runtimes": { "cuda": true, "openvino": false, "vpu": false, "ollama": false, "coreml": false, "npu": false },
                  "meta": { "gpu_count": 2, "is_apple_silicon": false } },
    "policy":   { "providers_allowed": ["cohere","openai"], "regions_allowed": ["us"], "compliance": ["soc2"] },
    "workload": { "requests_per_day": 5000, "tokens_in_per_req": 600, "tokens_out_per_req": 1200, "mq_rewrites": 4,
                  "embed_tokens_per_req": null, "rerank_tokens_per_req": null },
    "objective":{ "mode":"balanced", "monthly_budget_usd": 300 },
    "defaults": { "gen_model": "qwen3-coder:30b" }
  }' | jq


Returns:

{
  "env": {
    "GEN_MODEL": "...",
    "EMBEDDING_TYPE": "local|openai|voyage|...",
    "RERANK_BACKEND": "local|cohere|hf",
    "COHERE_RERANK_MODEL": "rerank-3.5",
    "MQ_REWRITES": "4",
    "HYDRATION_MODE": "lazy"
  },
  "reason": {
    "objective": "balanced",
    "budget": 300,
    "workload": { "...": "..." },
    "weights": { "Wg": 0.25, "We": 0.60, "Wr": 0.15 },
    "selected": { "gen": {...}, "embed": {...}, "rerank": {...}, "monthly": 123.45, "utility": 0.87 }
  }
}