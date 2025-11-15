// AGRO - RAG Data Quality Subtab
// Complete 1:1 port from /gui/index.html (tab-rag-data-quality)
// Repository configuration and Code Cards Builder with 37 element IDs

import { useState, useEffect } from 'react';

export function DataQualitySubtab() {
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [excludeDirs, setExcludeDirs] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [cardsMax, setCardsMax] = useState(0);
  const [enrichEnabled, setEnrichEnabled] = useState(true);
  const [buildInProgress, setBuildInProgress] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [progressRepo, setProgressRepo] = useState('');
  const [cardsTerminal, setCardsTerminal] = useState<any>(null);

  // Load repos
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (data.repos) {
          const repoList = data.repos.map((r: any) => r.name);
          setRepos(repoList);
          if (repoList.length > 0 && !selectedRepo) {
            setSelectedRepo(repoList[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load repos:', e);
      }
    };
    loadRepos();
  }, [selectedRepo]);

  // Initialize cards terminal
  useEffect(() => {
    const initTerminal = () => {
      const w = window as any;
      if (w.LiveTerminal && !cardsTerminal) {
        try {
          const terminal = new w.LiveTerminal('cards-terminal-container');
          setCardsTerminal(terminal);
          console.log('[DataQuality] Cards terminal initialized');
        } catch (e) {
          console.warn('[DataQuality] Failed to init terminal:', e);
        }
      }
    };

    initTerminal();
    const timeout = setTimeout(initTerminal, 1000);
    return () => clearTimeout(timeout);
  }, [cardsTerminal]);

  const handleBuildCards = async () => {
    setBuildInProgress(true);
    setProgressRepo(selectedRepo);
    
    try {
      // Show progress container
      const progressContainer = document.getElementById('cards-progress-container');
      if (progressContainer) {
        progressContainer.style.display = 'block';
      }

      const response = await fetch('/api/cards/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: selectedRepo,
          exclude_dirs: excludeDirs.split(',').map(s => s.trim()).filter(Boolean),
          exclude_patterns: excludePatterns.split(',').map(s => s.trim()).filter(Boolean),
          exclude_keywords: excludeKeywords.split(',').map(s => s.trim()).filter(Boolean),
          max: cardsMax,
          enrich: enrichEnabled
        })
      });

      if (response.ok) {
        console.log('Cards build started');
      }
    } catch (e) {
      console.error('Failed to start cards build:', e);
    } finally {
      setBuildInProgress(false);
    }
  };

  return (
    <div id="tab-rag-data-quality" className="rag-subtab-content active">
      {/* Loading Panel */}
      <div
        id="data-quality-loading"
        className="loading-panel"
        role="status"
        aria-live="polite"
        style={{
          display: 'none',
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span id="data-quality-loading-label" style={{ fontWeight: 600, color: 'var(--fg)' }}>
            Preparing Data Quality…
          </span>
          <span id="data-quality-loading-percent" className="mono" style={{ color: 'var(--accent)' }}>
            0%
          </span>
        </div>
        <div style={{ background: 'var(--bg-elev1)', height: '6px', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            id="data-quality-loading-bar"
            style={{
              width: '0%',
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--link) 100%)',
              transition: 'width 0.3s ease',
            }}
          ></div>
        </div>
        <div id="data-quality-loading-step" className="small" style={{ marginTop: '8px', color: 'var(--fg-muted)' }}>
          Initializing…
        </div>
      </div>

      {/* Repository Configuration */}
      <div className="settings-section">
        <h3>Repository Configuration</h3>
        <div id="repos-section"></div>
      </div>

      {/* Code Cards Builder & Viewer */}
      <div className="settings-section">
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
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{ width: '100%' }}
            >
              {repos.length === 0 && <option value="">Loading...</option>}
              {repos.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
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
              value={excludeDirs}
              onChange={(e) => setExcludeDirs(e.target.value)}
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
              value={excludePatterns}
              onChange={(e) => setExcludePatterns(e.target.value)}
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
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
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
              value={cardsMax}
              onChange={(e) => setCardsMax(Number(e.target.value))}
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
              <input
                type="checkbox"
                id="cards-enrich-gui"
                checked={enrichEnabled}
                onChange={(e) => setEnrichEnabled(e.target.checked)}
              />{' '}
              Enrich with AI
            </label>
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Use LLM for rich semantic cards
            </p>
          </div>
        </div>

        {/* Progress Container */}
        <div
          id="cards-progress-container"
          style={{
            display: buildInProgress ? 'block' : 'none',
            background: 'var(--card-bg)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--fg)' }}>⚡ Building Cards...</div>
            <div id="cards-progress-repo" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
              {progressRepo}
            </div>
          </div>

          <div
            id="cards-progress-models"
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: '11px',
              color: 'var(--fg-muted)',
              marginBottom: '8px',
              display: 'none',
            }}
          >
            Models — embed: <span data-model="embed">—</span> • enrich: <span data-model="enrich">—</span> • rerank:{' '}
            <span data-model="rerank">—</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div id="cards-progress-stage-scan" className="cards-stage-pill">scan</div>
            <div id="cards-progress-stage-chunk" className="cards-stage-pill">chunk</div>
            <div id="cards-progress-stage-summarize" className="cards-stage-pill">summarize</div>
            <div id="cards-progress-stage-sparse" className="cards-stage-pill">sparse</div>
            <div id="cards-progress-stage-write" className="cards-stage-pill">write</div>
            <div id="cards-progress-stage-finalize" className="cards-stage-pill">finalize</div>
          </div>

          <div
            style={{
              background: 'var(--bg-elev1)',
              height: '8px',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <div
              id="cards-progress-bar"
              style={{
                width: '0%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent) 0%, var(--link) 100%)',
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>

          <div id="cards-progress-stats" className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
            —
          </div>
          <div id="cards-progress-throughput" className="mono" style={{ fontSize: '10px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
            —
          </div>
          <div id="cards-progress-eta" className="mono" style={{ fontSize: '10px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
            —
          </div>
          <div id="cards-progress-tip" className="small" style={{ color: 'var(--link)', marginBottom: '8px' }}>
            💡 Tip: —
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button id="cards-progress-cancel" className="small-button" style={{ background: 'var(--err)', color: 'var(--on-err)' }}>
              Cancel Build
            </button>
            <button id="cards-progress-logs" className="small-button">
              View Logs
            </button>
            <button id="cards-progress-clear" className="small-button">
              Clear
            </button>
          </div>
        </div>

        {/* Cards Terminal */}
        <div id="cards-terminal-container" style={{ marginBottom: '16px' }}></div>

        {/* Action Buttons */}
        <div className="input-row" style={{ marginBottom: '16px' }}>
          <div className="input-group">
            <button
              id="btn-cards-build"
              onClick={handleBuildCards}
              disabled={buildInProgress}
              style={{
                width: '100%',
                background: buildInProgress ? 'var(--fg-muted)' : 'var(--accent)',
                color: buildInProgress ? 'var(--bg)' : 'var(--accent-contrast)',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: buildInProgress ? 'not-allowed' : 'pointer',
              }}
            >
              {buildInProgress ? 'Building...' : '⚡ Build Cards'}
            </button>
          </div>
          <div className="input-group">
            <button id="btn-cards-refresh" className="small-button" style={{ width: '100%' }}>
              🔄 Refresh
            </button>
          </div>
          <div className="input-group">
            <button id="btn-cards-view-all" className="small-button" style={{ width: '100%' }}>
              👁️ View All Cards
            </button>
          </div>
        </div>

        {/* Cards Viewer */}
        <div
          id="cards-viewer-container"
          style={{
            display: 'none',
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Code Cards</h4>
            <div id="cards-last-build" className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
              Last build: —
            </div>
          </div>
          <div
            id="cards-viewer"
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: "'SF Mono', monospace",
              fontSize: '12px',
            }}
          >
            Click "View All Cards" to display cards
          </div>
        </div>
      </div>
    </div>
  );
}

