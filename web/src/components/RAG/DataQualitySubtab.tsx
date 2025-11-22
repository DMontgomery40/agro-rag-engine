// AGRO - RAG Data Quality Subtab
// Complete 1:1 port from /gui/index.html (tab-rag-data-quality)
// Repository configuration and Code Cards Builder with 37 element IDs
// Fully wired to repos.json for all repository configuration

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAPI } from '@/hooks';
import { RepositoryConfig } from './RepositoryConfig';
import { LiveTerminal } from '../LiveTerminal/LiveTerminal';
import { TerminalService } from '@/services/TerminalService';

interface RepoData {
  name: string;
  slug?: string;
  path?: string;
  exclude_paths?: string[];
  keywords?: string[];
  path_boosts?: string[];
  layer_bonuses?: Record<string, Record<string, number>>;
}

export function DataQualitySubtab() {
  const { api } = useAPI();
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [excludeDirs, setExcludeDirs] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [cardsMax, setCardsMax] = useState(0);
  const [enrichEnabled, setEnrichEnabled] = useState(true);
  const [buildInProgress, setBuildInProgress] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [progressRepo, setProgressRepo] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef<any>(null);

  // Keywords Manager state
  const [keywordsMaxPerRepo, setKeywordsMaxPerRepo] = useState<number>(50);
  const [keywordsMinFreq, setKeywordsMinFreq] = useState<number>(3);
  const [keywordsBoost, setKeywordsBoost] = useState<number>(1.3);
  const [keywordsAutoGenerate, setKeywordsAutoGenerate] = useState<number>(1);
  const [keywordsRefreshHours, setKeywordsRefreshHours] = useState<number>(24);
  const [error, setError] = useState<string>('');

  // Load repos list
  useEffect(() => {
    const loadRepos = async () => {
      try {
        console.log('[DataQualitySubtab] Fetching repos from', api('repos'));
        const response = await fetch(api('repos'));
        const data = await response.json();
        console.log('[DataQualitySubtab] Got repos data:', data);
        if (data.repos && Array.isArray(data.repos)) {
          const repoList = data.repos.map((r: any) => r.name);
          console.log('[DataQualitySubtab] Repo list:', repoList);
          setRepos(repoList);
          if (repoList.length > 0 && !selectedRepo) {
            console.log('[DataQualitySubtab] Setting selectedRepo to:', repoList[0]);
            setSelectedRepo(repoList[0]);
          } else {
            console.log('[DataQualitySubtab] Not setting selectedRepo. Current value:', selectedRepo);
          }
        }
      } catch (e) {
        console.error('[DataQualitySubtab] Failed to load repos:', e);
      }
    };
    loadRepos();
  }, [api]);

  // Load selected repo's data from repos.json
  useEffect(() => {
    if (!selectedRepo) return;

    const loadRepoData = async () => {
      try {
        const response = await fetch(api(`repos/${selectedRepo}`));
        const data = await response.json();
        if (data.ok && data.repo) {
          setRepoData(data.repo);
          // Pre-fill exclude_paths from repos.json into Cards Builder field
          const excludePaths = data.repo.exclude_paths || [];
          setExcludeDirs(excludePaths.join(', '));
        }
      } catch (e) {
        console.error('Failed to load repo data:', e);
      }
    };
    loadRepoData();
  }, [selectedRepo, api]);

  // Sync excludeDirs changes back to repos.json (debounced)
  // This keeps Cards Builder exclude directories in sync with repos.json
  useEffect(() => {
    if (!selectedRepo || !repoData) return;

    const timeoutId = setTimeout(async () => {
      try {
        const excludePaths = excludeDirs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        // Only save if changed
        const currentPaths = (repoData.exclude_paths || []).sort().join(',');
        const newPaths = excludePaths.sort().join(',');
        if (currentPaths === newPaths) return;

        const response = await fetch(api(`repos/${selectedRepo}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exclude_paths: excludePaths })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            console.log('[DataQuality] Updated exclude_paths in repos.json from Cards Builder');
            // Update local repoData
            setRepoData((prev: RepoData | null) => ({
              ...prev!,
              exclude_paths: excludePaths
            }));
          }
        }
      } catch (e) {
        console.error('Failed to update repos.json:', e);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [excludeDirs, selectedRepo, api, repoData]);

  // Load exclude keywords (separate from repos.json)
  useEffect(() => {
    const loadExcludeKeywords = async () => {
      try {
        const response = await fetch(api('data-quality/exclude-keywords'));
        const data = await response.json();
        if (data.keywords) {
          setExcludeKeywords(data.keywords);
        }
      } catch (e) {
        console.error('Failed to load exclude keywords:', e);
      }
    };
    loadExcludeKeywords();
  }, [api]);

  // Load keywords config on mount
  useEffect(() => {
    const loadKeywordsConfig = async () => {
      try {
        const response = await fetch(api('config'));
        if (!response.ok) {
          console.warn('[DataQualitySubtab] Config fetch returned', response.status, '- using defaults');
          return;
        }
        const data = await response.json();
        const env = data.env || {};

        setKeywordsMaxPerRepo(parseInt(env.KEYWORDS_MAX_PER_REPO || '50', 10));
        setKeywordsMinFreq(parseInt(env.KEYWORDS_MIN_FREQ || '3', 10));
        setKeywordsBoost(parseFloat(env.KEYWORDS_BOOST || '1.3'));
        setKeywordsAutoGenerate(parseInt(env.KEYWORDS_AUTO_GENERATE || '1', 10));
        setKeywordsRefreshHours(parseInt(env.KEYWORDS_REFRESH_HOURS || '24', 10));
      } catch (err) {
        // Don't show error banner for config load failures - just use defaults
        console.warn('[DataQualitySubtab] Could not load keywords config, using defaults:', err);
      }
    };
    loadKeywordsConfig();
  }, [api]);

  const updateConfig = async (key: string, value: any) => {
    try {
      setError('');

      const response = await fetch(api('config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: { [key]: value } })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save ${key}: ${response.status}`);
      }

      // Reload config to ensure backend picks up changes
      await fetch(api('env/reload'), { method: 'POST' });

      console.log(`[DataQualitySubtab] Successfully saved ${key} = ${value}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to save ${key}`;
      console.error(`[DataQualitySubtab] Error saving ${key}:`, err);
      setError(errorMsg);
    }
  };


  const handleBuildCards = async () => {
    setBuildInProgress(true);
    setProgressRepo(selectedRepo);
    setShowTerminal(true);

    try {
      // Show terminal and connect to SSE stream
      const terminal = (window as any).terminal_cards_terminal;
      if (terminal) {
        terminal.show();
        terminal.clear();
        terminal.setTitle(`Building Cards: ${selectedRepo}`);
      }

      // Start the build
      const response = await fetch(api('cards/build'), {
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
        // Connect to SSE stream for real logs
        TerminalService.streamBuildLogs('cards_terminal', 'cards', selectedRepo);
      } else {
        throw new Error(`Build failed: ${response.statusText}`);
      }
    } catch (e) {
      console.error('Failed to start cards build:', e);
      const terminal = (window as any).terminal_cards_terminal;
      if (terminal) {
        terminal.appendLine(`\x1b[31mError: ${e}\x1b[0m`);
      }
      setBuildInProgress(false);
    }
  };

  return (
    <div id="tab-rag-data-quality" className="rag-subtab-content active">
      {/* Error Display */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(255, 80, 80, 0.1)',
            border: '1px solid var(--err)',
            borderRadius: '6px',
            color: 'var(--err)',
            fontSize: '12px'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

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
        <RepositoryConfig
          repos={repos}
          selectedRepo={selectedRepo}
          onRepoChange={setSelectedRepo}
          onExcludePathsChange={(paths) => {
            // Sync exclude_paths changes from RepositoryConfig to Cards Builder field
            setExcludeDirs(paths.join(', '));
          }}
        />
      </div>

      {/* Keywords Manager */}
      <div className="settings-section">
        <h3>
          <span className="accent-purple">●</span> Keywords Manager
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
          Discriminative keywords extraction and boosting configuration. Keywords are automatically extracted from your codebase to improve search relevance.
        </p>

        <div className="input-row">
          <div className="input-group">
            <label>
              Max Keywords Per Repo
              <span className="help-icon" data-tooltip="KEYWORDS_MAX_PER_REPO">?</span>
            </label>
            <input
              type="number"
              id="KEYWORDS_MAX_PER_REPO"
              name="KEYWORDS_MAX_PER_REPO"
              value={keywordsMaxPerRepo}
              min="10"
              max="500"
              step="10"
              onChange={(e) => setKeywordsMaxPerRepo(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('KEYWORDS_MAX_PER_REPO', keywordsMaxPerRepo)}
            />
          </div>
          <div className="input-group">
            <label>
              Min Frequency
              <span className="help-icon" data-tooltip="KEYWORDS_MIN_FREQ">?</span>
            </label>
            <input
              type="number"
              id="KEYWORDS_MIN_FREQ"
              name="KEYWORDS_MIN_FREQ"
              value={keywordsMinFreq}
              min="1"
              max="10"
              step="1"
              onChange={(e) => setKeywordsMinFreq(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('KEYWORDS_MIN_FREQ', keywordsMinFreq)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Keywords Boost
              <span className="help-icon" data-tooltip="KEYWORDS_BOOST">?</span>
            </label>
            <input
              type="number"
              id="KEYWORDS_BOOST"
              name="KEYWORDS_BOOST"
              value={keywordsBoost}
              min="1.0"
              max="3.0"
              step="0.1"
              onChange={(e) => setKeywordsBoost(parseFloat(e.target.value))}
              onBlur={() => updateConfig('KEYWORDS_BOOST', keywordsBoost)}
            />
          </div>
          <div className="input-group">
            <label>
              Auto-Generate Keywords
              <span className="help-icon" data-tooltip="KEYWORDS_AUTO_GENERATE">?</span>
            </label>
            <select
              id="KEYWORDS_AUTO_GENERATE"
              name="KEYWORDS_AUTO_GENERATE"
              value={keywordsAutoGenerate}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setKeywordsAutoGenerate(value);
                updateConfig('KEYWORDS_AUTO_GENERATE', value);
              }}
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Refresh Hours
              <span className="help-icon" data-tooltip="KEYWORDS_REFRESH_HOURS">?</span>
            </label>
            <input
              type="number"
              id="KEYWORDS_REFRESH_HOURS"
              name="KEYWORDS_REFRESH_HOURS"
              value={keywordsRefreshHours}
              min="1"
              max="168"
              step="1"
              onChange={(e) => setKeywordsRefreshHours(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('KEYWORDS_REFRESH_HOURS', keywordsRefreshHours)}
            />
          </div>
        </div>
      </div>

      {/* Code Cards Builder & Viewer */}
      <div className="settings-section">
        <h3>
          <span className="accent-green">●</span> Code Cards Builder & Viewer
          <span className="help-icon" data-tooltip="CODE_CARDS">?</span>
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
            <label>
              Exclude Directories (comma-separated)
              <span className="help-icon" data-tooltip="EXCLUDE_PATHS">?</span>
            </label>
            <input
              type="text"
              id="cards-exclude-dirs"
              name="CARDS_EXCLUDE_DIRS"
              placeholder="e.g., node_modules, vendor, dist"
              value={excludeDirs}
              onChange={(e) => setExcludeDirs(e.target.value)}
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Directories to skip when building cards. Synced with repos.json exclude_paths.
            </p>
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div className="input-group">
            <label>Exclude Patterns (comma-separated)</label>
            <input
              type="text"
              id="cards-exclude-patterns"
              name="CARDS_EXCLUDE_PATTERNS"
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
              name="CARDS_EXCLUDE_KEYWORDS"
              placeholder="e.g., deprecated, legacy, TODO"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Skip chunks containing these keywords. These are saved and will be used by the Apply All Changes button.
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
                name="CARDS_ENRICH"
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
            <button
              id="cards-progress-logs"
              className="small-button"
              onClick={() => {
                setShowTerminal(true);
                // Simulate some logs for testing
                setTimeout(() => {
                  const terminal = (window as any).terminal_cards_terminal;
                  if (terminal) {
                    terminal.appendLine('\x1b[32m✓\x1b[0m Connected to build server');
                    terminal.appendLine('Scanning repository files...');
                    terminal.updateProgress(10, 'Scanning files...');

                    setTimeout(() => {
                      terminal.appendLine('Found 247 files to process');
                      terminal.appendLine('\x1b[33mWarning:\x1b[0m Skipping node_modules');
                      terminal.updateProgress(30, 'Chunking code...');
                    }, 500);

                    setTimeout(() => {
                      terminal.appendLine('Creating code chunks...');
                      terminal.appendLine('\x1b[34mInfo:\x1b[0m Average chunk size: 150 lines');
                      terminal.updateProgress(50, 'Generating summaries...');
                    }, 1000);

                    setTimeout(() => {
                      terminal.appendLine('\x1b[31mError:\x1b[0m Failed to summarize chunk 42');
                      terminal.appendLine('Retrying...');
                      terminal.updateProgress(70, 'Creating embeddings...');
                    }, 1500);

                    setTimeout(() => {
                      terminal.appendLine('\x1b[32m✓\x1b[0m Successfully built cards!');
                      terminal.updateProgress(100, 'Complete!');
                    }, 2000);
                  }
                }, 100);
              }}
            >
              View Logs (Test)
            </button>
            <button id="cards-progress-clear" className="small-button">
              Clear
            </button>
          </div>
        </div>

        {/* Cards Terminal - Real SSE Streaming */}
        {showTerminal && (
          <LiveTerminal
            ref={terminalRef}
            id="cards_terminal"
            title={`Building Cards: ${selectedRepo}`}
            initialContent={[
              '\x1b[32m✓\x1b[0m Starting cards build...',
              `\x1b[34mRepository:\x1b[0m ${selectedRepo}`,
              `\x1b[34mExclude Dirs:\x1b[0m ${excludeDirs || 'none'}`,
              'Waiting for server connection...'
            ]}
            onClose={() => {
              setShowTerminal(false);
              TerminalService.disconnect('cards_terminal');
            }}
          />
        )}

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
