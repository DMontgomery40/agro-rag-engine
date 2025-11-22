
/**
 * Cost logic for AGRO GUI (browser-only, no bundler).
 * - Loads gui/prices.json (same origin).
 * - Supports chat/completions, embeddings, and rerankers.
 * - Returns per-request cost breakdown.
 */

const PRICE_CACHE = { json: null, loadedAt: 0 };
const PRICE_TTL_MS = 60_000;

function normKey(s) {
  return String(s || '').trim().toLowerCase();
}

// Expect prices.json shape:
// {
//   "models": [
//     { "provider": "openai", "model": "gpt-4o-mini", "input_per_1k": 0.15, "output_per_1k": 0.6, "unit": "1k_tokens" },
//     { "provider": "openai", "model": "text-embedding-3-large", "embed_per_1k": 0.13, "unit": "1k_tokens" },
//     { "provider": "cohere", "model": "rerank-3.5", "per_request": 0.002, "unit": "request" }
//   ]
// }

async function loadPrices() {
  const now = Date.now();
  if (PRICE_CACHE.json && now - PRICE_CACHE.loadedAt < PRICE_TTL_MS) {
    return PRICE_CACHE.json;
  }
  const res = await fetch('./prices.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load prices.json: ${res.status}`);
  const json = await res.json();
  PRICE_CACHE.json = json;
  PRICE_CACHE.loadedAt = now;
  return json;
}

function getModelType(model) {
  // Determine model type based on available fields
  if (model.embed_per_1k !== undefined) return 'embed';
  if (model.rerank_per_1k !== undefined || model.per_request !== undefined) return 'rerank';
  if (model.input_per_1k !== undefined || model.output_per_1k !== undefined) return 'chat';
  return null;
}

function getModelSpec(prices, providerName, modelName) {
  const models = prices?.models || [];
  const prov = normKey(providerName);
  const mdl = normKey(modelName);
  
  // Try exact match first
  for (const m of models) {
    if (normKey(m.provider) === prov && normKey(m.model) === mdl) {
      return { ...m, type: getModelType(m) };
    }
  }
  
  // Try model name only
  if (mdl) {
    for (const m of models) {
      if (normKey(m.model) === mdl) {
        return { ...m, type: getModelType(m) };
      }
    }
  }
  
  // Try provider only (first match)
  for (const m of models) {
    if (normKey(m.provider) === prov) {
      return { ...m, type: getModelType(m) };
    }
  }
  
  return null;
}

/**
 * Compute cost for a single “operation”.
 * @param {Object} opt
 * @param {"chat"|"embed"|"rerank"} opt.type
 * @param {string} opt.provider
 * @param {string} opt.model
 * @param {number} [opt.input_tokens]  - for chat
 * @param {number} [opt.output_tokens] - for chat
 * @param {number} [opt.embed_tokens]  - for embed
 * @param {number} [opt.requests]      - for rerank (number of calls)
 * @returns {Object} { costUSD, detail }
 */
function computeUnitCost(prices, opt) {
  const provider = normKey(opt.provider);
  const model = opt.model;
  const spec = getModelSpec(prices, provider, model);
  if (!spec) {
    return { costUSD: 0, detail: { error: `Unknown model: ${provider}/${model}` } };
  }
  const type = spec.type;

  if (type === 'chat') {
    const inTok = Number(opt.input_tokens || 0);
    const outTok = Number(opt.output_tokens || 0);
    const inRate = Number(spec.input_per_1k || 0);   // $/1K input tokens
    const outRate = Number(spec.output_per_1k || 0); // $/1K output tokens
    const inCost = (inTok / 1000) * inRate;
    const outCost = (outTok / 1000) * outRate;
    return {
      costUSD: inCost + outCost,
      detail: { type, provider, model, inTok, outTok, inRate, outRate, inCost, outCost }
    };
  }

  if (type === 'embed') {
    const eTok = Number(opt.embed_tokens || 0);
    const eRate = Number(spec.embed_per_1k || 0); // $/1K embed tokens
    const eCost = (eTok / 1000) * eRate;
    return {
      costUSD: eCost,
      detail: { type, provider, model, embed_tokens: eTok, embed_per_1k: eRate, embed_cost: eCost }
    };
  }

  if (type === 'rerank') {
    const calls = Math.max(0, Number(opt.requests || 0));
    const pricePerReq = Number(spec.price_per_request || 0); // $/request
    const rCost = calls * pricePerReq;
    return {
      costUSD: rCost,
      detail: { type, provider, model, requests: calls, price_per_request: pricePerReq, rerank_cost: rCost }
    };
  }

  return { costUSD: 0, detail: { error: `Unsupported type for ${provider}/${model}` } };
}

/**
 * Public API used by GUI:
 *   await CostLogic.estimate({
 *     chat: { provider:"openai", model:"gpt-4o-mini", input_tokens:1200, output_tokens:200 },
 *     embed:{ provider:"openai", model:"text-embedding-3-large", embed_tokens:3882000 },
 *     rerank:{ provider:"cohere", model:"rerank-v3.5", requests:50 }
 *   })
 */
export const CostLogic = {
  async estimate(req) {
    const prices = await loadPrices();
    let total = 0;
    const breakdown = {};

    if (req?.chat) {
      const r = computeUnitCost(prices, { type:'chat', ...req.chat });
      breakdown.chat = r;
      total += r.costUSD;
    }
    if (req?.embed) {
      const r = computeUnitCost(prices, { type:'embed', ...req.embed });
      breakdown.embed = r;
      total += r.costUSD;
    }
    if (req?.rerank) {
      const r = computeUnitCost(prices, { type:'rerank', ...req.rerank });
      breakdown.rerank = r;
      total += r.costUSD;
    }
    return { totalUSD: Number(total.toFixed(6)), breakdown, pricesVersion: prices?.version || null };
  },

  // Quick helpers the GUI can call
  async listProviders() {
    const prices = await loadPrices();
    const models = prices?.models || [];
    const providers = new Set();
    models.forEach(m => {
      if (m.provider) {
        const p = normKey(m.provider);
        if (p === 'ollama' || p === 'huggingface' || p === 'local') {
          providers.add('Local');
        } else {
          providers.add(m.provider);
        }
      }
    });
    return Array.from(providers).sort();
  },
  async listModels(providerName, modelType = null) {
    const prices = await loadPrices();
    const models = prices?.models || [];
    const prov = normKey(providerName);
    
    const filtered = models.filter(m => {
      const mProv = normKey(m.provider);
      
      // Handle "Local" group
      if (prov === 'local') {
        if (mProv !== 'local' && mProv !== 'ollama' && mProv !== 'huggingface') return false;
      } else {
        if (mProv !== prov) return false;
      }

      if (modelType) {
        const type = getModelType(m);
        return type === modelType;
      }
      return true;
    });
    return filtered.map(m => m.model).filter(Boolean).sort();
  },

  // Read form inputs and estimate cost via backend API
  async estimateFromUI(apiBase) {
    function readInt(id, d){ const el=document.getElementById(id); const v=el?el.value:''; const n=parseInt(v||'',10); return Number.isFinite(n)?n:(d||0); }
    function readStr(id, d){ const el=document.getElementById(id); const v=el?el.value:''; return (v||d||'').toString(); }

    const payload = {
      gen_provider: readStr('cost-provider','openai').trim(),
      gen_model: readStr('cost-model','gpt-4o-mini').trim(),
      tokens_in: readInt('cost-in', 500),
      tokens_out: readInt('cost-out', 800),
      embed_provider: readStr('cost-embed-provider','openai').trim(),
      embed_model: readStr('cost-embed-model','text-embedding-3-small').trim(),
      embeds: readInt('cost-embeds', 0),
      rerank_provider: readStr('cost-rerank-provider','cohere').trim(),
      rerank_model: readStr('cost-rerank-model','rerank-3.5').trim(),
      reranks: readInt('cost-rerank', 0),
      requests_per_day: readInt('cost-rpd', 100),
    };

    // apiBase already includes /api, so don't add it again
    const base = (apiBase||'').replace(/\/$/,'');
    let r = await fetch(base + '/cost/estimate_pipeline', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      r = await fetch(base + '/cost/estimate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
    }
    if (!r.ok) throw new Error(await r.text() || 'Cost estimate failed');
    return await r.json();
  }
};

// Attach to window so it's accessible from other scripts
window.CostLogic = CostLogic;

// Initialization function called by config.js when profiles view mounts
// Does NOT register view - config.js handles that
window.initCostLogic = function() {
  console.log('[cost_logic.js] Initializing cost logic for profiles view');
  // Initialize cost calculation state here if needed
  // Currently uses async load + cache, so nothing to do
};

console.log('[cost_logic.js] Module loaded (coordination with config.js for profiles view)');

// For inline testing in the browser console:
// (async () => { console.log(await CostLogic.estimate({ chat:{provider:"openai",model:"gpt-4o-mini",input_tokens:1000,output_tokens:200}, embed:{provider:"openai",model:"text-embedding-3-large",embed_tokens:3882000}, rerank:{provider:"cohere",model:"rerank-v3.5",requests:50} })); })();
