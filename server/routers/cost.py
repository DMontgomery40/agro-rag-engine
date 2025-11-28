from typing import Dict, Any, Optional
from fastapi import APIRouter
from server.utils import read_json
from common.paths import gui_dir

router = APIRouter()

def _find_price_kind(provider: str, model: Optional[str], kind: str) -> Optional[Dict[str, Any]]:
    """Find a price row constrained by kind: 'gen' | 'embed' | 'rerank'."""
    data = read_json(gui_dir() / "prices.json", {"models": []})
    models = data.get("models", [])
    prov = str(provider or '').lower()
    mdl = str(model or '').lower()

    def is_embed(m):
        return (m is not None) and (('embed_per_1k' in m) or ('embed' in str(m.get('family','')).lower()))

    def is_rerank(m):
        fam_mod = (str(m.get('family','')) + str(m.get('model',''))).lower()
        return (m is not None) and (('rerank_per_1k' in m) or ('rerank' in fam_mod))

    def is_gen(m):
        u = str(m.get('unit','')).lower()
        return (u == '1k_tokens') and (not is_embed(m)) and (not is_rerank(m))

    kind_pred = {'gen': is_gen, 'embed': is_embed, 'rerank': is_rerank}.get(kind, lambda _m: True)

    cand = [m for m in models if kind_pred(m)]
    # exact provider+model
    for m in cand:
        if (str(m.get('provider','')).lower() == prov) and (not mdl or str(m.get('model','')).lower() == mdl):
            return m
    # model-only
    if mdl:
        for m in cand:
            if str(m.get('model','')).lower() == mdl:
                return m
    # first for provider among kind
    for m in cand:
        if str(m.get('provider','')).lower() == prov:
            return m
    return None

def _estimate_cost(
    gen_provider: str,
    gen_model: Optional[str],
    tokens_in: int,
    tokens_out: int,
    embeds: int,
    reranks: int,
    requests_per_day: int,
    embed_provider: Optional[str] = None,
    embed_model: Optional[str] = None,
    rerank_provider: Optional[str] = None,
    rerank_model: Optional[str] = None,
) -> Dict[str, Any]:
    """Estimate daily and monthly costs using gui/prices.json."""
    rpd = max(1, int(requests_per_day or 0))

    # Generation
    price_gen = _find_price_kind(gen_provider, gen_model, 'gen') or {}
    per_1k_in = float(price_gen.get("input_per_1k", 0.0) or 0.0)
    per_1k_out = float(price_gen.get("output_per_1k", 0.0) or 0.0)
    per_req = float(price_gen.get("per_request", 0.0) or 0.0)
    # tokens_in/out are per request
    gen_cost = (tokens_in/1000.0) * per_1k_in * rpd + (tokens_out/1000.0) * per_1k_out * rpd + per_req * rpd

    # Embeddings (separate provider/model); "embeds" is tokens PER REQUEST
    emb_cost = 0.0
    emb_row = None
    if embeds > 0:
        if not embed_provider and gen_provider == 'openai':
            embed_provider = 'openai'
            embed_model = embed_model or 'text-embedding-3-small'
        emb_row = _find_price_kind(embed_provider or gen_provider, embed_model, 'embed')
        if emb_row:
            # Cost = (tokens_per_req / 1000) * rate_per_1k * requests_per_day
            emb_cost = (embeds/1000.0) * float(emb_row.get("embed_per_1k", 0.0) or 0.0) * rpd

    # Rerank; "reranks" is rerank ops PER REQUEST
    rr_cost = 0.0
    rr_row = None
    if reranks > 0:
        rr_row = _find_price_kind(rerank_provider or 'cohere', rerank_model or 'rerank-3.5', 'rerank')
        if rr_row:
            per_1k_rr = float(rr_row.get("rerank_per_1k", 0.0) or 0.0)
            per_req_rr = float(rr_row.get("per_request", 0.0) or 0.0)
            unit = str(rr_row.get("unit") or '').lower()
            
            # Calculate cost PER REQUEST first
            cost_per_req = 0.0
            
            if unit == 'request':
                # "reranks" = number of rerank requests per main request
                if per_req_rr > 0.0:
                    cost_per_req = float(reranks) * per_req_rr
                elif per_1k_rr > 0.0:
                     # 1 request = 1 search step? Assume "reranks" is count of docs if price is per 1k?
                     # But standard Cohere Rerank is per search step. 
                     # If unit is 'request', assume "reranks" is number of search steps.
                     # Fallback to treating per_1k as per 1000 requests
                     cost_per_req = (reranks/1000.0) * per_1k_rr
            elif per_1k_rr > 0.0:
                # Price per 1k units (e.g. docs). "reranks" = num docs
                cost_per_req = (reranks/1000.0) * per_1k_rr
            elif per_req_rr > 0.0:
                cost_per_req = float(reranks) * per_req_rr
                
            rr_cost = cost_per_req * rpd

    daily = float(gen_cost + emb_cost + rr_cost)
    breakdown = {
        "generation": {
            "row": price_gen,
            "tokens_in_per_req": tokens_in,
            "tokens_out_per_req": tokens_out,
            "requests_per_day": rpd,
            "cost_daily": round(gen_cost, 6),
        },
        "embeddings": {
            "row": (emb_row or None),
            "tokens_daily": embeds,
            "cost_daily": round(emb_cost, 6),
        } if embeds > 0 else None,
        "rerank": {
            "row": (rr_row or None),
            "units_daily": reranks,
            "cost_daily": round(rr_cost, 6),
        } if reranks > 0 else None,
    }
    return {"daily": round(daily, 6), "monthly": round(daily*30.0, 4), "breakdown": breakdown}

@router.post("/api/cost/estimate")
def cost_estimate(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _estimate_cost(
        str(payload.get("gen_provider") or payload.get("provider") or "openai"),
        payload.get("gen_model"),
        int(payload.get("tokens_in") or 0),
        int(payload.get("tokens_out") or 0),
        int(payload.get("embeds") or 0),
        int(payload.get("reranks") or 0),
        int(payload.get("requests_per_day") or 0),
        embed_provider=payload.get("embed_provider"),
        embed_model=payload.get("embed_model"),
        rerank_provider=payload.get("rerank_provider"),
        rerank_model=payload.get("rerank_model")
    )

@router.post("/api/cost/estimate_pipeline")
def cost_estimate_pipeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    return cost_estimate(payload)
