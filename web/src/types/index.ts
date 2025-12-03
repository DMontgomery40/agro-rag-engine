// Shared front-end types mirrored from backend Pydantic models and used by Zustand stores
// Core API Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
}

// Health Types
export interface HealthStatus {
  ok: boolean;
  status: 'healthy' | 'unhealthy' | 'unknown';
  ts: string;
}

// Docker Types
export interface DockerStatus {
  running: boolean;
  runtime: string;
  containers_count: number;
}

export interface DockerContainer {
  id: string;
  short_id?: string;
  name: string;
  image: string;
  state: 'running' | 'paused' | 'exited' | 'created' | 'restarting' | 'removing' | 'dead';
  raw_state?: string;
  status: string;
  ports?: string | Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  created?: string;
  created_at?: string;
  running_for?: string;
  compose_project?: string | null;
  compose_service?: string | null;
  agro_managed?: boolean;
  paused?: boolean;
}

// Config Types
export interface EnvConfig {
  [key: string]: string | number | boolean;
  REPO?: string;
  THEME_MODE?: 'auto' | 'dark' | 'light';
  API_BASE_URL?: string;
  // Eval settings (Pydantic-validated integers)
  EVAL_MULTI?: number;
  EVAL_FINAL_K?: number;
  EVAL_MULTI_M?: number;
}

export interface Repository {
  name: string;
  path?: string;
  slug?: string;
  branch?: string;
  default?: boolean;
  exclude_paths?: string[];
  keywords?: string[];
  path_boosts?: string[];
  layer_bonuses?: Record<string, Record<string, number>>;
}

export interface KeywordCatalog {
  keywords: string[];
  discriminative?: string[];
  semantic?: string[];
  llm?: string[];
  repos?: string[];
}

export interface AppConfig {
  env: EnvConfig;
  repos: Repository[];
  default_repo?: string;
}

export interface ConfigUpdate {
  env?: Partial<EnvConfig>;
  repos?: Repository[];
}

// Reranker Types (Pydantic-compliant)
export interface RerankerConfig {
  reranker_mode: 'cloud' | 'local' | 'learning' | 'none';
  reranker_cloud_provider: 'cohere' | 'voyage' | 'jina' | '';
  reranker_cloud_model: string;
  reranker_local_model: string;
}

export interface RerankerOption {
  id: string;
  label: string;
  description: string;
  reranker_mode: RerankerConfig['reranker_mode'];
  reranker_cloud_provider?: RerankerConfig['reranker_cloud_provider'];
}

export interface RerankerInfo extends RerankerConfig {
  path?: string;
  resolved_path?: string;
  device?: string;
  alpha?: number;
  topn?: number;
  batch?: number;
  maxlen?: number;
  snippet_chars?: number;
  trust_remote_code?: boolean;
}

// Error Helper Types
export interface ErrorHelperOptions {
  title?: string;
  message?: string;
  causes?: string[];
  fixes?: string[];
  links?: Array<[string, string]>;
  context?: string;
}

// RAG Pipeline Types
export interface RAGStatus {
  indexing: {
    active: boolean;
    progress: number;
    current_file?: string;
  };
  vectordb: {
    connected: boolean;
    collections: number;
    documents: number;
  };
  embeddings: {
    model: string;
    provider: string;
    status: 'ready' | 'loading' | 'error';
  };
}

export interface IndexStatus {
  total_docs: number;
  total_chunks: number;
  last_indexed: string;
  repos: Array<{
    name: string;
    docs: number;
    chunks: number;
  }>;
}

// Chat/Query Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Array<{
    file: string;
    score: number;
    chunk: string;
  }>;
}

export interface QueryResult {
  answer: string;
  sources: Array<{
    file: string;
    score: number;
    content: string;
    line_start?: number;
    line_end?: number;
  }>;
  query: string;
  duration: number;
}
