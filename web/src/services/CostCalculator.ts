/**
 * Cost calculation service for embeddings, chat, and reranking operations.
 * Loads pricing data from prices.json and provides real-time cost estimates.
 */

import type { PricesData, PriceModel, CostBreakdown, CostEstimateRequest } from '@/types/cards';

interface PriceCache {
  data: PricesData | null;
  loadedAt: number;
}

const PRICE_TTL_MS = 60_000; // 1 minute cache
const priceCache: PriceCache = {
  data: null,
  loadedAt: 0,
};

function normKey(s: string): string {
  return String(s || '').trim().toLowerCase();
}

/**
 * Load pricing data from prices.json with caching
 */
async function loadPrices(): Promise<PricesData> {
  const now = Date.now();
  if (priceCache.data && now - priceCache.loadedAt < PRICE_TTL_MS) {
    return priceCache.data;
  }

  const response = await fetch('/prices.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load prices.json: ${response.status}`);
  }

  const data = await response.json();
  priceCache.data = data;
  priceCache.loadedAt = now;
  return data;
}

/**
 * Find model specification from pricing data
 */
function getModelSpec(prices: PricesData, providerName: string, modelName: string): PriceModel | null {
  const provider = normKey(providerName);
  const model = normKey(modelName);

  // Find model in prices array
  const spec = prices.models.find(
    m => normKey(m.provider) === provider && normKey(m.model) === model
  );

  return spec || null;
}

/**
 * Compute cost for a single operation (chat, embed, or rerank)
 */
function computeUnitCost(
  prices: PricesData,
  opt: {
    type: 'chat' | 'embed' | 'rerank';
    provider: string;
    model: string;
    input_tokens?: number;
    output_tokens?: number;
    embed_tokens?: number;
    requests?: number;
  }
): { costUSD: number; detail: any } {
  const spec = getModelSpec(prices, opt.provider, opt.model);

  if (!spec) {
    return {
      costUSD: 0,
      detail: { error: `Unknown model: ${opt.provider}/${opt.model}` }
    };
  }

  // Chat/Completion models
  if (opt.type === 'chat') {
    const inTok = Number(opt.input_tokens || 0);
    const outTok = Number(opt.output_tokens || 0);
    const inRate = Number(spec.input_per_1k || 0);
    const outRate = Number(spec.output_per_1k || 0);
    const inCost = (inTok / 1000) * inRate;
    const outCost = (outTok / 1000) * outRate;

    return {
      costUSD: inCost + outCost,
      detail: {
        type: 'chat',
        provider: opt.provider,
        model: opt.model,
        inTok,
        outTok,
        inRate,
        outRate,
        inCost,
        outCost,
      }
    };
  }

  // Embedding models
  if (opt.type === 'embed') {
    const eTok = Number(opt.embed_tokens || 0);
    const eRate = Number(spec.embed_per_1k || 0);
    const eCost = (eTok / 1000) * eRate;

    return {
      costUSD: eCost,
      detail: {
        type: 'embed',
        provider: opt.provider,
        model: opt.model,
        embed_tokens: eTok,
        embed_per_1k: eRate,
        embed_cost: eCost,
      }
    };
  }

  // Reranker models
  if (opt.type === 'rerank') {
    const calls = Math.max(0, Number(opt.requests || 0));
    const pricePerReq = Number(spec.per_request || spec.rerank_per_1k ? (spec.rerank_per_1k / 1000) : 0);
    const rCost = calls * pricePerReq;

    return {
      costUSD: rCost,
      detail: {
        type: 'rerank',
        provider: opt.provider,
        model: opt.model,
        requests: calls,
        price_per_request: pricePerReq,
        rerank_cost: rCost,
      }
    };
  }

  return {
    costUSD: 0,
    detail: { error: `Unsupported type for ${opt.provider}/${opt.model}` }
  };
}

/**
 * Public Cost Calculator API
 */
export class CostCalculator {
  /**
   * Estimate costs for a complete pipeline (chat + embed + rerank)
   */
  static async estimate(req: CostEstimateRequest): Promise<CostBreakdown> {
    const prices = await loadPrices();
    let total = 0;
    const breakdown: CostBreakdown = {};

    if (req.chat) {
      const result = computeUnitCost(prices, { type: 'chat', ...req.chat });
      breakdown.chat = result;
      total += result.costUSD;
    }

    if (req.embed) {
      const result = computeUnitCost(prices, { type: 'embed', ...req.embed });
      breakdown.embed = result;
      total += result.costUSD;
    }

    if (req.rerank) {
      const result = computeUnitCost(prices, { type: 'rerank', ...req.rerank });
      breakdown.rerank = result;
      total += result.costUSD;
    }

    breakdown.totalUSD = Number(total.toFixed(6));
    return breakdown;
  }

  /**
   * Calculate embedding cost based on file count and average size
   */
  static calculateEmbeddingCost(fileCount: number, avgSize: number, provider = 'openai', model = 'text-embedding-3-large'): number {
    // Estimate tokens: average 4 chars per token
    const totalChars = fileCount * avgSize;
    const estimatedTokens = totalChars / 4;

    // Use the estimate method to calculate cost
    return this.estimate({
      embed: {
        provider,
        model,
        embed_tokens: estimatedTokens,
      }
    }).then(breakdown => breakdown.totalUSD || 0);
  }

  /**
   * Calculate storage cost (example placeholder - adjust based on actual pricing)
   */
  static calculateStorageCost(sizeGB: number): number {
    const costPerGB = 0.023; // Example: Qdrant cloud pricing
    return Number((sizeGB * costPerGB).toFixed(6));
  }

  /**
   * Calculate total pipeline cost for a typical RAG operation
   */
  static async calculatePipelineCost(options: {
    filesCount: number;
    avgFileSize: number;
    embedProvider?: string;
    embedModel?: string;
    chatProvider?: string;
    chatModel?: string;
    chatInputTokens?: number;
    chatOutputTokens?: number;
    rerankProvider?: string;
    rerankModel?: string;
    rerankRequests?: number;
  }): Promise<CostBreakdown> {
    const {
      filesCount,
      avgFileSize,
      embedProvider = 'openai',
      embedModel = 'text-embedding-3-large',
      chatProvider = 'openai',
      chatModel = 'gpt-4o-mini',
      chatInputTokens = 0,
      chatOutputTokens = 0,
      rerankProvider = 'cohere',
      rerankModel = 'rerank-3.5',
      rerankRequests = 0,
    } = options;

    // Calculate embedding tokens
    const totalChars = filesCount * avgFileSize;
    const embedTokens = totalChars / 4;

    const request: CostEstimateRequest = {};

    if (embedTokens > 0) {
      request.embed = {
        provider: embedProvider,
        model: embedModel,
        embed_tokens: embedTokens,
      };
    }

    if (chatInputTokens > 0 || chatOutputTokens > 0) {
      request.chat = {
        provider: chatProvider,
        model: chatModel,
        input_tokens: chatInputTokens,
        output_tokens: chatOutputTokens,
      };
    }

    if (rerankRequests > 0) {
      request.rerank = {
        provider: rerankProvider,
        model: rerankModel,
        requests: rerankRequests,
      };
    }

    return this.estimate(request);
  }

  /**
   * List available providers from pricing data
   */
  static async listProviders(): Promise<string[]> {
    const prices = await loadPrices();
    const providers = new Set(prices.models.map(m => m.provider));
    return Array.from(providers).sort();
  }

  /**
   * List available models for a specific provider
   */
  static async listModels(providerName: string): Promise<PriceModel[]> {
    const prices = await loadPrices();
    const provider = normKey(providerName);
    return prices.models.filter(m => normKey(m.provider) === provider);
  }

  /**
   * Get pricing information for a specific model
   */
  static async getModelPrice(providerName: string, modelName: string): Promise<PriceModel | null> {
    const prices = await loadPrices();
    return getModelSpec(prices, providerName, modelName);
  }

  /**
   * Format cost as currency string
   */
  static formatCost(costUSD: number): string {
    if (costUSD === 0) return '$0.00';
    if (costUSD < 0.01) return `$${costUSD.toFixed(6)}`;
    return `$${costUSD.toFixed(2)}`;
  }

  /**
   * Clear the price cache (useful for testing or forcing reload)
   */
  static clearCache(): void {
    priceCache.data = null;
    priceCache.loadedAt = 0;
  }
}

// Export for backward compatibility with legacy code
export const CostLogic = CostCalculator;
