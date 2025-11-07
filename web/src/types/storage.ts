// Storage Calculator Types
// Comprehensive types for storage calculation and configuration

export interface StorageUnit {
  value: number;
  unit: 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB';
}

export interface CalculatorInputs {
  repoSize: number;
  repoUnit: number; // Multiplier: 1024 = KiB, 1048576 = MiB, 1073741824 = GiB, etc.
  chunkSize: number;
  chunkUnit: number;
  embeddingDim: number;
  precision: 1 | 2 | 4; // int8=1, float16=2, float32=4
  qdrantOverhead: number; // Multiplier, typically 1.5
  hydrationPercent: number; // 0-100
  redisMiB: number;
  replicationFactor: number;
}

export interface Calculator2Inputs extends Omit<CalculatorInputs, 'precision' | 'qdrantOverhead' | 'hydrationPercent' | 'redisMiB' | 'replicationFactor'> {
  targetSize: number;
  targetUnit: number;
  bm25Percent: number; // 0-100
  cardsPercent: number; // 0-100
}

export interface StorageResults {
  chunks: number;
  rawEmbeddings: number; // bytes
  qdrantSize: number; // bytes
  bm25Index: number; // bytes
  cardsSummary: number; // bytes
  hydration: number; // bytes
  reranker: number; // bytes
  redis: number; // bytes
  singleInstance: number; // bytes
  replicated: number; // bytes
}

export interface PrecisionResults {
  float32: number; // bytes
  float16: number; // bytes
  int8: number; // bytes
  pq8: number; // bytes (Product Quantization)
}

export interface OptimizationPlan {
  name: string;
  description: string[];
  total: number; // bytes
  replicated: number; // bytes
  fits: boolean;
}

export interface Calculator2Results {
  chunks: number;
  baseStorage: number; // bytes
  precisions: PrecisionResults;
  aggressivePlan: OptimizationPlan; // Minimal (no hydration)
  conservativePlan: OptimizationPlan; // Low Latency (full cache)
  statusMessage: string;
  statusType: 'success' | 'warning' | 'error';
}

export interface AutotuneStatus {
  enabled: boolean;
  currentMode: string | null;
}

export interface AutotuneResults {
  recommendations?: Record<string, any>;
  [key: string]: any;
}

export interface ModelFlow {
  id: string;
  name: string;
  provider: string;
  model: string;
  family: 'gen' | 'embed' | 'rerank' | 'misc';
  baseUrl?: string;
  unit?: 'request' | '1k_tokens';
}

export interface PriceEntry {
  provider: string;
  model: string;
  family: 'gen' | 'embed' | 'rerank' | 'misc';
  base_url?: string;
  unit?: 'request' | '1k_tokens';
  input_cost?: number;
  output_cost?: number;
  request_cost?: number;
}

export interface MCPSearchResult {
  file_path: string;
  start_line: number;
  end_line: number;
  code: string;
  score: number;
  rerank_score?: number;
}

export interface MCPAnswerResult {
  answer: string;
  documents: MCPSearchResult[];
  event_id?: string;
}

export interface MCPFeedback {
  query_id: string;
  rating: number; // 1-5
  comment?: string;
}
