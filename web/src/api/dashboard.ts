// AGRO - Dashboard API Client
// Centralized API calls for all Dashboard operations

import { api } from './client';

// ============================================================================
// System Status APIs
// ============================================================================

export interface HealthStatus {
  status: string;
  ok: boolean;
  graph_loaded?: boolean;
  ts?: string;
}

export interface ConfigData {
  env?: Record<string, any>;
  default_repo?: string;
  repos?: Array<{
    name: string;
    profile?: string;
    [key: string]: any;
  }>;
  MCP_SERVER_URL?: string;
  AUTOTUNE_ENABLED?: string;
  [key: string]: any;
}

export interface CardsData {
  count: number;
  cards?: any[];
}

export interface MCPStatus {
  python_http?: {
    host: string;
    port: number;
    path: string;
    running: boolean;
  };
  node_http?: {
    host: string;
    port: number;
    path?: string;
    running: boolean;
  };
  python_stdio_available?: boolean;
}

export interface AutotuneStatus {
  enabled: boolean;
  current_mode?: string;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(api('/health'));
  if (!response.ok) throw new Error('Failed to fetch health');
  return response.json();
}

export async function getConfig(): Promise<ConfigData> {
  const response = await fetch(api('/api/config'));
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
}

export async function getCards(): Promise<CardsData> {
  const response = await fetch(api('/api/cards'));
  if (!response.ok) throw new Error('Failed to fetch cards');
  return response.json();
}

export async function getMCPStatus(): Promise<MCPStatus> {
  const response = await fetch(api('/api/mcp/status'));
  if (!response.ok) throw new Error('Failed to fetch MCP status');
  return response.json();
}

export async function getAutotuneStatus(): Promise<AutotuneStatus> {
  const response = await fetch(api('/api/autotune/status'));
  if (!response.ok) throw new Error('Failed to fetch autotune status');
  return response.json();
}

// ============================================================================
// Monitoring & Alerts APIs
// ============================================================================

export interface Alert {
  labels?: {
    alertname?: string;
    [key: string]: any;
  };
  startsAt: string;
  endsAt?: string;
  annotations?: Record<string, any>;
}

export interface AlertStatus {
  recent_alerts?: Alert[];
  total_count?: number;
}

export async function getAlertStatus(): Promise<AlertStatus> {
  const response = await fetch(api('/webhooks/alertmanager/status'));
  if (!response.ok) throw new Error('Failed to fetch alert status');
  return response.json();
}

export interface Trace {
  timestamp: string;
  query: string;
  repo?: string;
  duration_ms?: number;
  [key: string]: any;
}

export async function getTraces(limit: number = 50): Promise<Trace[]> {
  const response = await fetch(api(`/api/traces?limit=${limit}`));
  if (!response.ok) throw new Error('Failed to fetch traces');
  return response.json();
}

export async function getLatestTrace(): Promise<Trace | null> {
  const response = await fetch(api('/api/traces/latest'));
  if (!response.ok) return null;
  return response.json();
}

export interface LokiStatus {
  url?: string;
  available: boolean;
  error?: string;
}

export async function getLokiStatus(): Promise<LokiStatus> {
  const response = await fetch(api('/api/loki/status'));
  if (!response.ok) return { available: false, error: 'Failed to connect' };
  return response.json();
}

// ============================================================================
// Storage & Index APIs
// ============================================================================

export interface IndexStats {
  chunks_json_size?: number;
  ram_embeddings_size?: number;
  qdrant_size?: number;
  bm25_index_size?: number;
  cards_size?: number;
  reranker_cache_size?: number;
  redis_cache_size?: number;
  keyword_count?: number;
  total_storage?: number;
  profile_count?: number;
}

export async function getIndexStats(): Promise<IndexStats> {
  const response = await fetch(api('/api/index/stats'));
  if (!response.ok) throw new Error('Failed to fetch index stats');
  return response.json();
}

export interface IndexStatusMetadata {
  current_repo: string;
  current_branch: string;
  timestamp: string;
  embedding_model: string;
  keywords_count: number;
  total_storage: number;
  repos: {
    name: string;
    profile: string;
    chunk_count: number;
    has_cards: boolean;
    sizes: {
      chunks?: number;
      bm25?: number;
      cards?: number;
    };
  }[];
}

export interface IndexStatus {
  lines: string[];
  metadata: IndexStatusMetadata | null;
  running: boolean;
  progress?: number;
  current_file?: string;
  active?: boolean;
}

export async function getIndexStatus(): Promise<IndexStatus> {
  const response = await fetch(api('/api/index/status'));
  if (!response.ok) throw new Error('Failed to fetch index status');
  return response.json();
}

// ============================================================================
// Quick Actions APIs
// ============================================================================

export async function startIndexer(repo?: string): Promise<Response> {
  return fetch(api('/api/index/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: repo ? JSON.stringify({ repo }) : undefined
  });
}

export async function generateKeywords(repo?: string): Promise<Response> {
  return fetch(api('/api/keywords/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: repo ? JSON.stringify({ repo }) : undefined
  });
}

export async function reloadConfig(): Promise<{ status: string }> {
  const response = await fetch(api('/api/config/reload'), {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to reload config');
  return response.json();
}

export async function reloadEnv(): Promise<{ status: string }> {
  const response = await fetch(api('/api/env/reload'), {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to reload env');
  return response.json();
}

export interface RerankerOption {
  id: string;
  backend: string;
  label: string;
  description: string;
}

export async function getRerankerOptions(): Promise<RerankerOption[]> {
  const response = await fetch(api('/api/reranker/available'));
  if (!response.ok) return [];
  const data = await response.json();
  return data.options || [];
}

export async function runEval(backend: string, repo?: string): Promise<Response> {
  return fetch(api('/api/eval/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backend, repo })
  });
}

export interface EvalStatus {
  running: boolean;
  progress?: number;
  current_step?: string;
}

export async function getEvalStatus(): Promise<EvalStatus> {
  const response = await fetch(api('/api/eval/status'));
  if (!response.ok) return { running: false };
  return response.json();
}

// ============================================================================
// Docker & Infrastructure APIs
// ============================================================================

export interface DockerStatus {
  available: boolean;
  containers?: Array<{
    id: string;
    name: string;
    status: string;
    state: string;
  }>;
}

export async function getDockerStatus(): Promise<DockerStatus> {
  const response = await fetch(api('/api/docker/status'));
  if (!response.ok) return { available: false };
  return response.json();
}

export async function getDockerContainers(): Promise<any[]> {
  const response = await fetch(api('/api/docker/containers'));
  if (!response.ok) return [];
  return response.json();
}

// ============================================================================
// Git & Repository APIs
// ============================================================================

export interface GitHookStatus {
  installed: boolean;
  hooks?: string[];
}

export async function getGitHookStatus(): Promise<GitHookStatus> {
  const response = await fetch(api('/api/git/hooks/status'));
  if (!response.ok) return { installed: false };
  return response.json();
}

export interface RepoInfo {
  name: string;
  profile?: string;
  path?: string;
  branch?: string;
  [key: string]: any;
}

export async function getRepos(): Promise<RepoInfo[]> {
  const response = await fetch(api('/api/repos'));
  if (!response.ok) return [];
  return response.json();
}

// ============================================================================
// Top Folders / Analytics
// ============================================================================

export interface FolderMetrics {
  folder: string;
  access_count: number;
  last_access?: string;
}

export async function getTopFolders(days: number = 5): Promise<FolderMetrics[]> {
  // This endpoint might not exist yet - return mock data for now
  // TODO: Wire to real analytics endpoint when available
  return [];
}
