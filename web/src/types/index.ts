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
  name: string;
  image: string;
  state: 'running' | 'paused' | 'exited' | 'created';
  status: string;
  ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  created: string;
}

// Config Types
export interface EnvConfig {
  [key: string]: string | number | boolean;
  REPO?: string;
  THEME_MODE?: 'auto' | 'dark' | 'light';
  API_BASE_URL?: string;
}

export interface Repository {
  name: string;
  path: string;
  default?: boolean;
  keywords?: string[];
  path_boosts?: string[];
  layer_bonuses?: Record<string, number>;
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
