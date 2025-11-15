// AGRO - IndexingSubtab Component
// Repository indexing controls and status for RAG

import { useState, useEffect } from 'react';
import { useAPI } from '../../hooks/useAPI';
import { useIndexing } from '../../hooks/useIndexing';

export function IndexingSubtab() {
  const { api } = useAPI();
  const {
    isIndexing,
    progress,
    statusMessage,
    startIndexing,
    stopIndexing,
    applyIndexProfile
  } = useIndexing();

  const [repos, setRepos] = useState<string[]>(['agro']);
  const [selectedRepo, setSelectedRepo] = useState('agro');
  const [simpleSelectedRepo, setSimpleSelectedRepo] = useState('');
  const [skipDense, setSkipDense] = useState(false);
  const [enrichChunks, setEnrichChunks] = useState(false);
  const [embeddingType, setEmbeddingType] = useState('openai');
  const [indexProfile, setIndexProfile] = useState('shared');
  const [includeDense, setIncludeDense] = useState(true);
  const [simpleOutput, setSimpleOutput] = useState('');

  // Load available repositories
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const response = await fetch(api('/repos'));
        if (response.ok) {
          const data = await response.json();
          const repoList = data.repos || ['agro'];
          setRepos(repoList);
          if (repoList.length > 0) {
            setSimpleSelectedRepo(repoList[0]);
          }
        }
      } catch (error) {
        console.error('Error loading repos:', error);
      }
    };
    loadRepos();
  }, [api]);

  const handleStartIndexing = async () => {
    try {
      await startIndexing(selectedRepo, {
        skipDense,
        enrichChunks,
        embeddingType
      });
    } catch (error) {
      console.error('Error starting indexing:', error);
    }
  };

  const handleStopIndexing = async () => {
    try {
      await stopIndexing();
    } catch (error) {
      console.error('Error stopping indexing:', error);
    }
  };

  const handleApplyProfile = async () => {
    try {
      await applyIndexProfile(indexProfile);
    } catch (error) {
      console.error('Error applying profile:', error);
    }
  };

  const handleSimpleIndexNow = async () => {
    if (!simpleSelectedRepo) {
      alert('Please select a repository');
      return;
    }

    setSimpleOutput('Starting indexing...\n');

    try {
      const params = new URLSearchParams({
        repo: simpleSelectedRepo,
        skip_dense: includeDense ? '0' : '1'
      });

      const response = await fetch(api(`/index/start?${params}`), {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to start indexing: ${response.statusText}`);
      }

      const data = await response.json();
      setSimpleOutput(prev => prev + `${data.message || 'Indexing started'}\n`);

      // Poll for progress
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(api(`/index/status/${simpleSelectedRepo}`));
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setSimpleOutput(prev => {
              const lines = prev.split('\n');
              if (lines[lines.length - 1].startsWith('Progress:')) {
                lines.pop();
              }
              return lines.join('\n') + `\nProgress: ${status.progress || 0}% - ${status.message || ''}\n`;
            });

            if (status.complete || status.progress >= 100) {
              clearInterval(interval);
              setSimpleOutput(prev => prev + '\nIndexing complete!\n');
            }
          }
        } catch (err) {
          clearInterval(interval);
        }
      }, 1000);
    } catch (error) {
      setSimpleOutput(prev => prev + `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  };

  const getProgressBarText = () => {
    if (progress === 0) return '';
    if (progress === 100) return 'Complete';
    return `${progress}%`;
  };

  return (
    <div id="tab-rag-indexing" className="rag-subtab-content">
      {/* Repo/Branch Display - matches /gui */}
      <div style={{ padding: '16px 24px', background: 'var(--panel)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: '13px', fontFamily: "'SF Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Repo:</span>
          <select 
            id="indexing-repo-selector" 
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            style={{ background: 'var(--ok)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 700, fontFamily: "'SF Mono', monospace", cursor: 'pointer' }}
          >
            {repos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
        </div>
        <div style={{ color: 'var(--fg-muted)', fontSize: '11px', fontFamily: "'SF Mono', monospace" }}>
          <span style={{ color: 'var(--fg-muted)' }}>Branch:</span> <span id="indexing-branch-display" style={{ color: 'var(--link)', fontWeight: 600 }}>development</span>
        </div>
      </div>

      {/* ONE SIMPLE INDEX BUTTON */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--ok)', padding: '32px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700 }}>
          🚀 Index Repository
        </h2>

        <div style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              Repository:
            </label>
            <select
              id="simple-repo-select"
              value={simpleSelectedRepo}
              onChange={(e) => setSimpleSelectedRepo(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid var(--line)',
                borderRadius: '8px',
                background: 'var(--input-bg)',
                color: 'var(--fg)'
              }}
            >
              {repos.length === 0 && <option value="">Loading...</option>}
              {repos.map(repo => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px' }}>
              <input
                type="checkbox"
                id="simple-dense-check"
                checked={includeDense}
                onChange={(e) => setIncludeDense(e.target.checked)}
                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600 }}>Include Dense Embeddings (Recommended)</span>
            </label>
            <p style={{ fontSize: '13px', color: 'var(--fg-muted)', margin: '8px 0 0 36px' }}>
              Enables semantic vector search via Qdrant
            </p>
          </div>

          <button
            id="simple-index-btn"
            onClick={handleSimpleIndexNow}
            disabled={isIndexing || !simpleSelectedRepo}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '20px',
              fontWeight: 700,
              background: 'var(--ok)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: isIndexing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,255,136,0.3)',
              opacity: isIndexing ? 0.6 : 1
            }}
          >
            {isIndexing ? '🔄 INDEXING...' : '🚀 INDEX NOW'}
          </button>

          {simpleOutput && (
            <pre
              id="simple-output"
              style={{
                marginTop: '24px',
                padding: '20px',
                background: 'var(--code-bg)',
                color: 'var(--code-fg)',
                border: '2px solid var(--line)',
                borderRadius: '8px',
                fontFamily: "'SF Mono', 'Consolas', monospace",
                fontSize: '12px',
                lineHeight: 1.5,
                maxHeight: '600px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
            >
              {simpleOutput}
            </pre>
          )}
        </div>
      </div>

      {/* Indexing Operations */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> Build Index
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Indexing Process</span>
              Indexing processes your codebase to enable RAG:
              <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                <li>Chunks code into semantic segments</li>
                <li>Creates BM25 sparse index</li>
                <li>Generates embeddings (OpenAI or local)</li>
                <li>Stores vectors in Qdrant</li>
              </ul>
              <br />
              Run after code changes for fresh results.
            </div>
          </span>
        </h3>

        <div className="input-row">
          <div className="input-group">
            <label>Repository to Index</label>
            <select
              id="index-repo-select"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              {repos.map(repo => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Embedding Type</label>
            <select
              value={embeddingType}
              onChange={(e) => setEmbeddingType(e.target.value)}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              <option value="openai">OpenAI (text-embedding-3-large)</option>
              <option value="local">Local (BGE-small, no API)</option>
              <option value="voyage">Voyage AI</option>
            </select>
          </div>
          <div className="input-group">
            <label>Skip Dense Index</label>
            <select
              id="index-skip-dense"
              value={skipDense ? '1' : '0'}
              onChange={(e) => setSkipDense(e.target.value === '1')}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              <option value="0">No (full index)</option>
              <option value="1">Yes (BM25 only, faster)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Enrich Code Chunks</label>
            <select
              id="index-enrich-chunks"
              value={enrichChunks ? '1' : '0'}
              onChange={(e) => setEnrichChunks(e.target.value === '1')}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              <option value="0">No (faster indexing)</option>
              <option value="1">Yes (adds summaries + keywords)</option>
            </select>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Generate AI summaries and extract keywords for each code chunk. Improves semantic search but slower.
            </p>
          </div>
        </div>

        <div className="input-row" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="small-button"
            id="btn-index-start"
            onClick={handleStartIndexing}
            disabled={isIndexing}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              padding: '12px',
              fontWeight: 600,
              opacity: isIndexing ? 0.6 : 1,
              cursor: isIndexing ? 'not-allowed' : 'pointer'
            }}
          >
            ▶ Start Indexing
          </button>
          <button
            className="small-button"
            id="btn-index-stop"
            onClick={handleStopIndexing}
            disabled={!isIndexing}
            style={{
              flex: 1,
              background: 'var(--err)',
              color: 'var(--fg)',
              padding: '12px',
              fontWeight: 600,
              opacity: !isIndexing ? 0.6 : 1,
              cursor: !isIndexing ? 'not-allowed' : 'pointer'
            }}
          >
            ■ Stop
          </button>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--accent)' }}>
            Progress
          </label>
          <div
            className="progress"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              height: '24px',
              overflow: 'hidden'
            }}
          >
            <div
              id="index-bar"
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--link))',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span
                id="index-bar-text"
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-contrast)',
                  fontWeight: 600,
                  mixBlendMode: 'difference'
                }}
              >
                {getProgressBarText()}
              </span>
            </div>
          </div>
          <div
            id="index-status"
            className="result-display"
            style={{
              minHeight: '100px',
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '12px',
              background: 'var(--card-bg)',
              color: 'var(--fg-muted)',
              padding: '12px',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '11px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}
          >
            {statusMessage || 'Ready to index'}
          </div>
        </div>
      </div>

      {/* Index Settings */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> Advanced Settings
        </h3>

        <div className="input-row">
          <div className="input-group">
            <label>Output Directory Base</label>
            <input
              type="text"
              name="OUT_DIR_BASE"
              placeholder="./out"
              defaultValue="./out"
              disabled
              style={{ background: 'var(--bg-elev1)', cursor: 'not-allowed' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Where to store index files (chunks, BM25, etc.)
            </p>
            <p className="small" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
              <strong>Note:</strong> This setting is managed in the <strong>Infrastructure</strong> tab. Value shown here is read-only.
            </p>
          </div>
          <div className="input-group">
            <label>Collection Name</label>
            <input
              type="text"
              name="COLLECTION_NAME"
              placeholder="code_chunks_{repo}"
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>
              Qdrant collection name (leave empty for auto)
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Chunk Size (tokens)</label>
            <input
              type="number"
              name="CHUNK_SIZE"
              defaultValue="1000"
              min="100"
              max="4000"
              step="100"
            />
          </div>
          <div className="input-group">
            <label>Chunk Overlap (tokens)</label>
            <input
              type="number"
              name="CHUNK_OVERLAP"
              defaultValue="200"
              min="0"
              max="1000"
              step="50"
            />
          </div>
          <div className="input-group">
            <label>Max Workers</label>
            <input
              type="number"
              name="INDEX_MAX_WORKERS"
              defaultValue="4"
              min="1"
              max="16"
            />
          </div>
        </div>

        <button
          className="small-button"
          id="btn-save-index-settings"
          style={{
            background: 'var(--link)',
            color: 'var(--accent-contrast)',
            fontWeight: 600
          }}
        >
          💾 Save Settings
        </button>
      </div>

      {/* Index Profiles */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--err)' }}>
        <h3>
          <span style={{ color: 'var(--err)' }}>●</span> Index Profiles
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Index Profiles</span>
              Different index configurations for different use cases:
              <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                <li><strong>shared:</strong> Fast BM25-only, no API calls</li>
                <li><strong>full:</strong> BM25 + dense embeddings (best quality)</li>
                <li><strong>dev:</strong> Small subset for testing</li>
              </ul>
            </div>
          </span>
        </h3>

        <div className="input-row">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Active Profile</label>
            <select
              id="index-profile-select"
              value={indexProfile}
              onChange={(e) => setIndexProfile(e.target.value)}
              style={{
                background: 'var(--bg-elev2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              <option value="shared">Shared (BM25-only, fast)</option>
              <option value="full">Full (BM25 + embeddings)</option>
              <option value="dev">Development (small subset)</option>
            </select>
          </div>
          <div className="input-group">
            <label>&nbsp;</label>
            <button
              className="small-button"
              id="btn-apply-profile"
              onClick={handleApplyProfile}
              style={{
                background: 'var(--err)',
                color: 'var(--fg)',
                fontWeight: 600,
                width: '100%'
              }}
            >
              Apply Profile
            </button>
          </div>
        </div>

        <div
          id="profile-description"
          style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--bg-elev2)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--fg-muted)'
          }}
        >
          {indexProfile === 'shared' && 'Fast BM25-only indexing with no API calls. Good for quick testing.'}
          {indexProfile === 'full' && 'Complete indexing with BM25 + dense embeddings. Best quality results.'}
          {indexProfile === 'dev' && 'Small subset of files for rapid development and testing.'}
        </div>
      </div>
    </div>
  );
}
