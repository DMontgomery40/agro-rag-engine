// AGRO - RAG Data Quality Subtab
// Repository configuration, Code Cards Builder, and Keyword Management

import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '@/stores';
import { KeywordManager } from '@/components/KeywordManager';
import type { Repository } from '@/types';

export function DataQualitySubtab() {
  const { config, loading } = useConfigStore();
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const reposContainerRef = useRef<HTMLDivElement>(null);

  // Initialize selected repo from config
  useEffect(() => {
    if (config && !selectedRepo) {
      const defaultRepo = config.env.REPO as string || config.default_repo || 'agro';
      setSelectedRepo(defaultRepo);
    }
  }, [config, selectedRepo]);

  // Inject repos section (legacy module integration)
  useEffect(() => {
    if (reposContainerRef.current && (window as any).ReposModule?.injectRepos) {
      (window as any).ReposModule.injectRepos();
    }
  }, [config]);

  // Get current repo object for KeywordManager
  const currentRepo = config?.repos.find(r => r.name === selectedRepo);

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--fg-muted)' }}>Loading configuration...</div>;
  }

  return (
    <div id="tab-rag-data-quality" className="rag-subtab-content active">
      {/* Repository Configuration */}
      <div className="settings-section">
        <h3>Repository Configuration</h3>
        <div id="repos-section" ref={reposContainerRef}></div>
      </div>

      {/* Keyword Manager - Integrated with selected repo */}
      {currentRepo && (
        <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>
            <span className="accent-green">●</span> Repository Keywords
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Keyword Management</span>
                Manage discriminative and semantic keywords for this repository. Keywords improve search precision by filtering and boosting relevant results.
              </div>
            </span>
          </h3>
          <KeywordManager repo={currentRepo} />
        </div>
      )}

      {/* Cards Builder & Viewer */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>
          <span className="accent-green">●</span> Code Cards Builder & Viewer
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Code Cards</span>
              High-level semantic summaries of code chunks for faster retrieval with AI-powered enrichment and filtering.
            </div>
          </span>
        </h3>

        {/* Repository Selection */}
        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div className="input-group">
            <label>Repository to Build Cards For</label>
            <select
              id="cards-repo-select"
              style={{ width: '100%' }}
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              {config?.repos.map(repo => (
                <option key={repo.name} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div className="input-group">
            <label>Exclude Directories (comma-separated)</label>
            <input
              type="text"
              id="cards-exclude-dirs"
              placeholder="e.g., node_modules, vendor, dist"
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Directories to skip when building cards
            </p>
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div className="input-group">
            <label>Exclude Patterns (comma-separated)</label>
            <input
              type="text"
              id="cards-exclude-patterns"
              placeholder="e.g., .test.js, .spec.ts, .min.js"
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              File patterns to skip
            </p>
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '16px' }}>
          <div className="input-group">
            <label>Exclude Keywords (comma-separated)</label>
            <input
              type="text"
              id="cards-exclude-keywords"
              placeholder="e.g., deprecated, legacy, TODO"
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Skip chunks containing these keywords
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="input-row" style={{ marginBottom: '16px', alignItems: 'flex-end' }}>
          <div className="input-group">
            <label>Cards Max</label>
            <input
              type="number"
              id="cards-max"
              name="CARDS_MAX"
              defaultValue="0"
              min="0"
              step="10"
              style={{ maxWidth: '160px' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Limit chunks (0 = all)
            </p>
          </div>
          <div className="input-group">
            <label>
              <input type="checkbox" id="cards-enrich-gui" defaultChecked /> Enrich with AI
            </label>
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Use LLM for rich semantic cards
            </p>
          </div>
        </div>

        {/* PERMANENT VISIBLE PROGRESS DISPLAY */}
        <div
          id="cards-progress-container"
          style={{
            display: 'none',
            background: 'var(--card-bg)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--fg)' }}>
              ⚡ Building Cards...
            </div>
            <div
              id="cards-progress-repo"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}
            ></div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              id="cards-progress-stage-scan"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              scan
            </div>
            <div
              id="cards-progress-stage-chunk"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              chunk
            </div>
            <div
              id="cards-progress-stage-summarize"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              summarize
            </div>
            <div
              id="cards-progress-stage-sparse"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              sparse
            </div>
            <div
              id="cards-progress-stage-write"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              write
            </div>
            <div
              id="cards-progress-stage-finalize"
              className="cards-stage-pill"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                background: 'transparent',
              }}
            >
              finalize
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-elev1)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              height: '24px',
              overflow: 'hidden',
              marginBottom: '8px',
              position: 'relative',
            }}
          >
            <div
              id="cards-progress-bar"
              style={{
                height: '100%',
                width: '0%',
                background: 'linear-gradient(90deg, var(--ok) 0%, var(--accent) 100%)',
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontFamily: "'SF Mono', monospace",
              color: 'var(--fg)',
              marginBottom: '12px',
            }}
          >
            <div id="cards-progress-stats" style={{ fontWeight: 600 }}>
              0 / 0 (0%)
            </div>
            <div id="cards-progress-throughput" style={{ color: 'var(--link)' }}>
              --
            </div>
            <div id="cards-progress-eta" style={{ color: 'var(--warn)' }}>
              ETA: --
            </div>
          </div>

          <div
            id="cards-progress-tip"
            style={{
              fontSize: '12px',
              color: 'var(--link)',
              marginBottom: '12px',
              fontStyle: 'italic',
              padding: '8px',
              background: 'var(--bg-elev2)',
              borderRadius: '4px',
            }}
          >
            💡 Starting...
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="cards-progress-cancel"
              className="small-button"
              style={{
                flex: 1,
                background: 'var(--err)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              ■ Cancel Build
            </button>
            <button
              id="cards-progress-logs"
              className="small-button"
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--link)',
                border: '1px solid var(--link)',
              }}
            >
              📄 View Logs
            </button>
            <button
              id="cards-progress-clear"
              className="small-button"
              style={{
                flex: 1,
                background: 'var(--bg-elev2)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--line)',
              }}
            >
              ✕ Clear
            </button>
          </div>
        </div>

        {/* Build Button */}
        <div
          className="action-buttons"
          style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}
        >
          <button
            id="btn-cards-build"
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--fg)',
              fontWeight: 600,
              padding: '12px',
            }}
          >
            <span style={{ marginRight: '4px' }}>⚡</span> Build Cards
          </button>
          <button
            id="btn-cards-refresh"
            style={{
              flex: 1,
              background: 'var(--bg-elev2)',
              color: 'var(--ok)',
              border: '1px solid var(--ok)',
            }}
          >
            <span style={{ marginRight: '4px' }}>↻</span> Refresh
          </button>
          <button
            id="btn-cards-view-all"
            style={{
              flex: 1,
              background: 'var(--bg-elev2)',
              color: 'var(--link)',
              border: '1px solid var(--link)',
            }}
          >
            <span style={{ marginRight: '4px' }}>📋</span> View All
          </button>
        </div>

        {/* Cards Viewer */}
        <div
          id="cards-viewer-container"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px',
            minHeight: '300px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <div
            id="cards-last-build"
            className="mono"
            style={{
              fontSize: '11px',
              color: 'var(--fg-muted)',
              marginBottom: '8px',
              display: 'none',
            }}
          ></div>
          <div
            id="cards-viewer"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              width: '100%',
            }}
          ></div>
        </div>
        <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '8px' }}>
          Click a card to navigate to its source location.
        </p>
      </div>

      {/* Semantic Synonyms Note */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> Semantic Synonyms
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Synonym Expansion</span>
              Expands queries with semantic synonyms to improve retrieval. Example: "auth" → "auth
              authentication oauth jwt bearer". Configured via data/semantic_synonyms.json
            </div>
          </span>
        </h3>
        <p>
          Semantic synonyms are configured in <code>data/semantic_synonyms.json</code>.
          Enable/disable via the Retrieval tab settings (USE_SEMANTIC_SYNONYMS).
        </p>
      </div>
    </div>
  );
}
