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
    K_base = max(256.0, float(int(Tout // 4)))
    K_tokens = _safe_num(workload.get("rerank_tokens_per_req"), K_base) * MQ
    return dict(R=R, Tin=Tin, Tout=Tout, MQ=MQ, E_tokens=E_tokens, K_tokens=K_tokens)


def _weights(wl: Dict[str, Number]) -> Dict[str, Number]:
    W_GEN = wl["R"] * (wl["Tin"] + wl["Tout"])
    W_EMB = wl["R"] * wl["E_tokens"]
    W_RR = wl["R"] * wl["K_tokens"]
    total = W_GEN + W_EMB + W_RR
    if total <= 0:
        return dict(Wg=1 / 3, We=1 / 3, Wr=1 / 3)
    return dict(Wg=W_GEN / total, We=W_EMB / total, Wr=W_RR / total)


def _allowed_set(policy: Dict[str, Any]) -> set:
    providers = policy.get("providers_allowed") or []
    return set([p.lower() for p in providers if isinstance(p, str)])


def _meets_policy_maps(candidate: Dict[str, Any], policy: Dict[str, Any]) -> bool:
    regions_allowed = policy.get("regions_allowed")
    compliance = policy.get("compliance")
    for comp in ("GEN", "EMB", "RERANK"):
        row = candidate.get(comp, {})
        if not row:
            return False
        region = row.get("region")
        comp_flags = set(row.get("compliance", []) or [])
        if regions_allowed and region and region not in regions_allowed:
            return False
        if compliance and comp_flags and not comp_flags.issuperset(set(compliance)):
            return False
    return True


def _decorate_row(m: Dict[str, Any], comp_type: str, use_heuristics: bool = False) -> Dict[str, Any]:
    out = dict(m)
    out["comp"] = comp_type.upper()
    out["provider"] = (out.get("provider") or "").lower()
    qs = out.get("quality_score")
    if qs is None:
        out["quality_score"] = _infer_quality_score(out, comp_type) if use_heuristics else 0.5
    else:
        out["quality_score"] = _safe_num(qs, 0.5)
    if out.get("latency_p95_ms") is not None:
        out["latency_p95_ms"] = _safe_num(out["latency_p95_ms"], None)
    if out.get("throughput_qps") is not None:
        out["throughput_qps"] = _safe_num(out["throughput_qps"], None)
    return out


def _infer_quality_score(row: Dict[str, Any], comp_type: str) -> Number:
    """Heuristic quality when not provided in prices.json.
    Tries to be sensible for performance mode ranking.
    """
    prov = (row.get("provider") or "").lower()
    fam = (row.get("family") or "").lower()
    model = (row.get("model") or "").lower()
    c = comp_type.upper()

    if c == "GEN":
        # OpenAI / o-series / GPT-4 family hierarchy
        if prov == "openai":
            if model.startswith("o1"):
                return 0.95
            if model.startswith("o3"):
                return 0.90
            if "gpt-4o" in model and "mini" not in model:
                return 0.88
            if "gpt-4-turbo" in model:
                return 0.86
            if model.startswith("gpt-4"):
                return 0.85
            if "gpt-4o-mini" in model:
                return 0.78
        if prov == "anthropic":
            if "opus" in model:
                return 0.98
            if "3-5-sonnet" in model or "3.5-sonnet" in model or "sonnet" in model:
                return 0.92
            if "3-5-haiku" in model or "3.5-haiku" in model or "haiku" in model:
                return 0.82
        if prov == "google":
            if "gemini-1.5-pro" in model:
                return 0.87
            if "gemini-1.5-flash" in model:
                return 0.78
        if prov == "meta" and "70b" in model:
            return 0.83
        if prov == "mistral" and "large" in model:
            return 0.82
        if prov == "cohere" and "command-r-plus" in model:
            return 0.84
        # local or unknown
        return 0.72 if prov != "local" else 0.60

    if c == "EMB":
        if prov == "openai":
            if "3-large" in model:
                return 0.90
            if "3-small" in model:
                return 0.82
        if prov == "voyage":
            return 0.86
        if prov == "cohere":
            return 0.78
        return 0.70 if prov != "local" else 0.60

    if c == "RERANK":
        if prov == "cohere" and ("3.5" in model or "rerank-3.5" in model):
            return 0.90
        if prov in ("hf", "local") and ("bge-reranker" in model or "reranker" in model):
            return 0.82
        return 0.75 if prov != "local" else 0.65

    return 0.5


def _component_rows(
    comp_type: str,
    ALLOW: set,
    prices: Dict[str, Any],
    include_local: bool = False,
    use_heuristics: bool = False,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    models = prices.get("models") or []
    comp = comp_type.upper()

    for m in models:
        prov = (m.get("provider") or "").lower()
        model_id = (m.get("model") or "").lower()
        fam = (m.get("family") or "").lower()
        allow_this = (prov in ALLOW) or (fam in ALLOW)
        if not allow_this:
            continue
        if not include_local and _looks_local(model_id):
            continue
        if comp not in (m.get("components") or []):
            continue
        rows.append(_decorate_row(m, comp, use_heuristics=use_heuristics))
    return rows


def _score_row(row: Dict[str, Any], wl: Dict[str, Number], comp: str) -> Number:
    # Base score: 1 / (cost per request)
    # Then adjust by quality and latency if available
    cost = _safe_num(row.get("price_per_1k_tokens_usd"), 0.01)
    if cost <= 0:
        cost = 0.01
    base = 1.0 / cost
    q = _safe_num(row.get("quality_score"), 0.5)
    # Latency lower is better; invert to a [0..1] penalty
    latency = _safe_num(row.get("latency_p95_ms"), 0.0)
    lat_pen = 1.0
    if latency and latency > 0:
        lat_pen = max(0.5, min(1.0, 2000.0 / latency))
    # Weight by component importance
    if comp == "GEN":
        return base * (0.7 * q + 0.3 * lat_pen)
    if comp == "EMB":
        return base * (0.6 * q + 0.4 * lat_pen)
    if comp == "RERANK":
        return base * (0.5 * q + 0.5 * lat_pen)
    return base * q


def autoprofile(request: Dict[str, Any], prices: Dict[str, Any]) -> Tuple[Dict[str, str], Dict[str, Any]]:
    """Select an environment profile given workload, policy, and model pricing.

    Returns a tuple of (env_vars, debug_details) or ({}, reason_if_failure)
    """
    wl = _normalize_workload(request.get("workload") or {})
    W = _weights(wl)
    policy = request.get("policy") or {}
    ALLOW = _allowed_set(policy)
    include_local = bool(request.get("include_local", False))
    prefer_quality = bool(request.get("prefer_quality", True))
    use_heuristics = bool(request.get("use_heuristics", True))

    # Build candidate sets per component
    GEN = _component_rows("GEN", ALLOW, prices, include_local, use_heuristics)
    EMB = _component_rows("EMB", ALLOW, prices, include_local, use_heuristics)
    RER = _component_rows("RERANK", ALLOW, prices, include_local, use_heuristics)

    if not GEN or not EMB or not RER:
        return {}, {"error": "No candidates for one or more components", "allow": list(ALLOW)}

    # Score rows
    for row in GEN:
        row["score"] = _score_row(row, W, "GEN")
    for row in EMB:
        row["score"] = _score_row(row, W, "EMB")
    for row in RER:
        row["score"] = _score_row(row, W, "RERANK")

    # Pick winner per component (quality bias or cost bias)
    def pick(rows: List[Dict[str, Any]], bias: str) -> Dict[str, Any]:
        if bias == "quality":
            return max(rows, key=lambda r: (r.get("quality_score", 0.0), r.get("score", 0.0)))
        return max(rows, key=lambda r: r.get("score", 0.0))

    bias = "quality" if prefer_quality else "cost"
    winner_gen = pick(GEN, bias)
    winner_emb = pick(EMB, bias)
    winner_rer = pick(RER, bias)

    # Assemble env
    env: Dict[str, str] = {}
    env["GEN_MODEL"] = str(winner_gen.get("model") or "")
    env["EMBEDDING_TYPE"] = str((winner_emb.get("provider") or "openai")).lower()
    if env["EMBEDDING_TYPE"] == "openai":
        env["EMBEDDING_DIM"] = ""
    else:
        env["EMBEDDING_DIM"] = str(int(_safe_num(winner_emb.get("output_dimension"), 512)))
    prov_rer = str((winner_rer.get("provider") or "cohere")).lower()
    env["RERANK_BACKEND"] = "cohere" if prov_rer == "cohere" else ("local" if prov_rer in {"local", "hf"} else prov_rer)
    env["COHERE_RERANK_MODEL"] = str(winner_rer.get("model") or "")

    debug = {
        "workload": wl,
        "weights": W,
        "policy_allow": list(ALLOW),
        "winners": {
            "gen": winner_gen,
            "emb": winner_emb,
            "rerank": winner_rer,
        },
        "bias": bias,
    }
    return env, debug

