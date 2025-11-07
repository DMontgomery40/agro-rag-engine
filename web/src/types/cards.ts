/**
 * Card system types for RAG data quality features
 */

export interface Card {
  id: string;
  file_path: string;
  start_line?: number;
  end_line?: number;
  symbols?: string[];
  purpose?: string;
  text?: string;
  created_at?: string;
}

export interface CardsBuildStatus {
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  stage: 'scan' | 'chunk' | 'summarize' | 'sparse' | 'write' | 'finalize';
  total: number;
  done: number;
  pct: number;
  tip?: string;
  model?: string;
  throughput?: string;
  eta_s?: number;
  repo?: string;
  error?: string;
}

export interface CardsBuildResult {
  success: boolean;
  cards_written?: number;
  duration_s?: number;
  started_at?: string;
  job_id?: string;
}

export interface LastBuild {
  started_at?: string;
  result?: CardsBuildResult;
}

export interface CardsResponse {
  cards: Card[];
  last_build?: LastBuild;
}

export interface CardsBuildOptions {
  repo: string;
  enrich?: boolean;
  exclude_dirs?: string;
  exclude_patterns?: string;
  exclude_keywords?: string;
}

export interface CostBreakdown {
  chat?: {
    costUSD: number;
    detail: {
      type: string;
      provider: string;
      model: string;
      inTok: number;
      outTok: number;
      inRate: number;
      outRate: number;
      inCost: number;
      outCost: number;
    };
  };
  embed?: {
    costUSD: number;
    detail: {
      type: string;
      provider: string;
      model: string;
      embed_tokens: number;
      embed_per_1k: number;
      embed_cost: number;
    };
  };
  rerank?: {
    costUSD: number;
    detail: {
      type: string;
      provider: string;
      model: string;
      requests: number;
      price_per_request: number;
      rerank_cost: number;
    };
  };
  totalUSD?: number;
}

export interface CostEstimateRequest {
  chat?: {
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
  };
  embed?: {
    provider: string;
    model: string;
    embed_tokens: number;
  };
  rerank?: {
    provider: string;
    model: string;
    requests: number;
  };
}

export interface PriceModel {
  provider: string;
  family: string;
  model: string;
  unit: string;
  input_per_1k?: number;
  output_per_1k?: number;
  embed_per_1k?: number;
  rerank_per_1k?: number;
  per_request?: number;
  context?: number;
  dimensions?: number;
  notes?: string;
}

export interface PricesData {
  last_updated: string;
  currency: string;
  models: PriceModel[];
}
