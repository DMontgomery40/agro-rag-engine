
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
//   "providers": {
//     "openai": {
//       "models": {
//         "gpt-4o-mini": { "type": "chat", "input_per_1k": 0.00015, "output_per_1k": 0.00060 },
//         "o3-mini":     { "type": "chat", "input_per_1k": 0.0003,  "output_per_1k": 0.0012  },
//         "text-embedding-3-large": { "type": "embed", "embed_per_1k": 0.00013 },
//         "text-embedding-3-small": { "type": "embed", "embed_per_1k": 0.00002 }
//       }
//     },
//     "cohere": {
//       "models": {
//         "rerank-v3.5": { "type": "rerank", "price_per_request": 0.002 }, // $2 / 1000
//         "rerank-english-v3.0": { "type": "rerank", "price_per_request": 0.0015 }
//       }
//     },
//     "voyage": {
//       "models": {
//         "voyage-code-3": { "type": "embed", "embed_per_1k": 0.00012 },
//         "voyage-law-2":  { "type": "embed", "embed_per_1k": 0.00012 }
//       }
//     }
//   }
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

function getModelSpec(prices, providerName, modelName) {
  const p = prices?.providers?.[normKey(providerName)];
  if (!p) return null;
  const spec = p.models?.[modelName] || p.models?.[normKey(modelName)];
  return spec || null;
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
    return Object.keys(prices?.providers || {});
  },
  async listModels(providerName) {
    const prices = await loadPrices();
    const p = prices?.providers?.[normKey(providerName)];
    return p ? Object.keys(p.models || {}) : [];
  }
};

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
