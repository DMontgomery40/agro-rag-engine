// AGRO - Index Display Panels
// EXACT copy of gui/js/index-display.js structure (lines 42-184)
// Embedding Configuration, Indexing Costs, Storage Requirements

import React, { useEffect, useState } from 'react';

interface IndexStats {
  embedding_config: {
    provider: string;
    model: string;
    dimensions: number;
    precision: string;
  };
  costs: {
    total_tokens: number;
    embedding_cost: number;
  };
  storage_breakdown: {
    chunks_json: number;
    bm25_index: number;
    cards: number;
    embeddings_raw: number;
    qdrant_overhead: number;
    reranker_cache: number;
    redis: number;
  };
  keywords_count: number;
  total_storage: number;
  current_repo: string;
  current_branch: string;
  total_chunks: number;
}

export function IndexDisplayPanels() {
  const [stats, setStats] = useState<IndexStats | null>(null);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/index/stats');
      const data = await response.json();
      setStats(data);
    } catch (e) {
      console.error('[IndexDisplay] Failed to load stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    const handleRefresh = () => loadStats();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  if (!stats) {
    return <div style={{ color: 'var(--fg-muted)', fontSize: '13px' }}>Loading...</div>;
  }

  const emb = stats.embedding_config;
  const storage = stats.storage_breakdown;
  const costs = stats.costs;

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      {/* EMBEDDING CONFIGURATION - Exact match to index-display.js lines 42-66 */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--code-bg) 100%)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--link)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--link)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          Embedding Configuration
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--bg-elev2)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              Model
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--link)',
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {emb.model || 'N/A'}
            </div>
          </div>
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--bg-elev2)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              Dimensions
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--link)',
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {emb.dimensions ? emb.dimensions.toLocaleString() : 'N/A'}
            </div>
          </div>
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--bg-elev2)',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              Precision
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--warn)',
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {emb.precision || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* INDEXING COSTS - Only if costs available */}
      {costs && costs.total_tokens > 0 && (
        <div
          style={{
            background:
              'linear-gradient(135deg, color-mix(in oklch, var(--ok) 6%, var(--bg)) 0%, var(--card-bg) 100%)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid color-mix(in oklch, var(--ok) 30%, var(--bg))',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Indexing Costs
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                background: 'var(--card-bg)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid color-mix(in oklch, var(--ok) 25%, var(--bg))',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Total Tokens
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: "'SF Mono', monospace",
                }}
              >
                {costs.total_tokens.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                background: 'var(--card-bg)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid color-mix(in oklch, var(--ok) 25%, var(--bg))',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Embedding Cost
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: "'SF Mono', monospace",
                }}
              >
                ${costs.embedding_cost.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STORAGE BREAKDOWN - Exact match to index-display.js lines 94-184 */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--code-bg) 0%, var(--card-bg) 100%)',
          padding: '18px',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--warn)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2">
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
            <line x1="2" y1="9" x2="22" y2="9"></line>
            <line x1="2" y1="15" x2="22" y2="15"></line>
          </svg>
          Storage Requirements
        </div>

        {/* 8-item grid (4x2) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Chunks JSON
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.chunks_json)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              RAM Embeddings
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.embeddings_raw)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Qdrant (w/overhead)
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.qdrant_overhead)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              BM25 Index
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.bm25_index)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Cards/Summary
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.cards)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Reranker Cache
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.reranker_cache)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Redis Cache
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {formatBytes(storage.redis)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elev1)', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '9px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
              Keywords
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', fontFamily: "'SF Mono', monospace" }}>
              {stats.keywords_count}
            </div>
          </div>
        </div>

        {/* Index Profiles Toggle */}
        <div style={{ marginBottom: '12px' }}>
          <button
            style={{
              background: 'transparent',
              border: '1px dashed color-mix(in oklch, var(--accent) 50%, transparent 50%)',
              color: 'var(--fg)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'color-mix(in oklch, var(--accent) 10%, transparent 90%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in oklch, var(--accent) 50%, transparent 50%)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ▶ INDEX PROFILES (3)
          </button>
        </div>

        {/* Total Storage - Green border box */}
        <div
          style={{
            background: 'color-mix(in oklch, var(--ok) 8%, var(--bg))',
            border: '2px solid var(--ok)',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--fg-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            TOTAL INDEX STORAGE
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--ok)',
              fontFamily: "'SF Mono', monospace",
              letterSpacing: '-0.5px',
            }}
          >
            {formatBytes(stats.total_storage)}
          </div>
        </div>
      </div>
    </>
  );
}

