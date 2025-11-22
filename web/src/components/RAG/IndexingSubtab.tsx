import { useState, useEffect } from 'react';

interface IndexStats {
  chunks?: number;
  vectors?: number;
  collections?: string[];
  lastIndexed?: string;
}

interface RepoInfo {
  name: string;
  path: string;
  branch?: string;
}

export function IndexingSubtab() {
  // Simple indexing state
  const [simpleRepo, setSimpleRepo] = useState<string>('');
  const [simpleDense, setSimpleDense] = useState<boolean>(true);
  const [simpleOutput, setSimpleOutput] = useState<string>('');
  const [simpleRunning, setSimpleRunning] = useState<boolean>(false);

  // Advanced indexing state
  const [indexRepo, setIndexRepo] = useState<string>('');
  const [embeddingType, setEmbeddingType] = useState<string>('openai');
  const [skipDense, setSkipDense] = useState<string>('0');
  const [enrichChunks, setEnrichChunks] = useState<string>('0');
  const [indexStatus, setIndexStatus] = useState<string>('');
  const [indexProgress, setIndexProgress] = useState<number>(0);
  const [indexRunning, setIndexRunning] = useState<boolean>(false);

  // Index status display
  const [indexStats, setIndexStats] = useState<IndexStats | null>(null);

  // Index profiles
  const [activeProfile, setActiveProfile] = useState<string>('shared');

  // Advanced settings state
  const [outDirBase, setOutDirBase] = useState<string>('./out');
  const [collectionName, setCollectionName] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [chunkOverlap, setChunkOverlap] = useState<number>(200);
  const [maxWorkers, setMaxWorkers] = useState<number>(4);
  const [astOverlapLines, setAstOverlapLines] = useState<number>(20);
  const [maxChunkSize, setMaxChunkSize] = useState<number>(2000000);
  const [minChunkChars, setMinChunkChars] = useState<number>(50);
  const [greedyFallbackTarget, setGreedyFallbackTarget] = useState<number>(800);
  const [chunkingStrategy, setChunkingStrategy] = useState<string>('ast');
  const [preserveImports, setPreserveImports] = useState<string>('1');
  const [indexingBatchSize, setIndexingBatchSize] = useState<number>(100);
  const [indexingWorkers, setIndexingWorkers] = useState<number>(4);
  const [bm25Tokenizer, setBm25Tokenizer] = useState<string>('stemmer');
  const [bm25StemmerLang, setBm25StemmerLang] = useState<string>('english');
  const [indexExcludedExts, setIndexExcludedExts] = useState<string>('.png,.jpg,.gif,.ico,.svg,.woff,.ttf');
  const [indexMaxFileSizeMb, setIndexMaxFileSizeMb] = useState<number>(10);

  // Embedding model picker state (NEW - REQUIRED)
  const [embeddingModel, setEmbeddingModel] = useState<string>('text-embedding-3-large');
  const [embeddingDim, setEmbeddingDim] = useState<number>(3072);
  const [voyageModel, setVoyageModel] = useState<string>('voyage-code-3');
  const [embeddingModelLocal, setEmbeddingModelLocal] = useState<string>('all-MiniLM-L6-v2');
  const [embeddingBatchSize, setEmbeddingBatchSize] = useState<number>(64);
  const [embeddingMaxTokens, setEmbeddingMaxTokens] = useState<number>(8000);
  const [embeddingCacheEnabled, setEmbeddingCacheEnabled] = useState<string>('1');
  const [embeddingTimeout, setEmbeddingTimeout] = useState<number>(30);
  const [embeddingRetryMax, setEmbeddingRetryMax] = useState<number>(3);

  // Repository list
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [currentRepo, setCurrentRepo] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadRepos();
    loadIndexStats();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      const env = data.env || {};

      // Load embedding settings
      setEmbeddingType(env.EMBEDDING_TYPE || 'openai');
      setEmbeddingModel(env.EMBEDDING_MODEL || 'text-embedding-3-large');
      setEmbeddingDim(parseInt(env.EMBEDDING_DIM || '3072', 10));
      setVoyageModel(env.VOYAGE_MODEL || 'voyage-code-3');
      setEmbeddingModelLocal(env.EMBEDDING_MODEL_LOCAL || 'all-MiniLM-L6-v2');
      setEmbeddingBatchSize(parseInt(env.EMBEDDING_BATCH_SIZE || '64', 10));
      setEmbeddingMaxTokens(parseInt(env.EMBEDDING_MAX_TOKENS || '8000', 10));
      setEmbeddingCacheEnabled(env.EMBEDDING_CACHE_ENABLED || '1');
      setEmbeddingTimeout(parseInt(env.EMBEDDING_TIMEOUT || '30', 10));
      setEmbeddingRetryMax(parseInt(env.EMBEDDING_RETRY_MAX || '3', 10));

      // Load chunking settings
      setChunkSize(parseInt(env.CHUNK_SIZE || '1000', 10));
      setChunkOverlap(parseInt(env.CHUNK_OVERLAP || '200', 10));
      setAstOverlapLines(parseInt(env.AST_OVERLAP_LINES || '20', 10));
      setMaxChunkSize(parseInt(env.MAX_CHUNK_SIZE || '2000000', 10));
      setMinChunkChars(parseInt(env.MIN_CHUNK_CHARS || '50', 10));
      setGreedyFallbackTarget(parseInt(env.GREEDY_FALLBACK_TARGET || '800', 10));
      setChunkingStrategy(env.CHUNKING_STRATEGY || 'ast');
      setPreserveImports(env.PRESERVE_IMPORTS || '1');

      // Load indexing settings
      setOutDirBase(env.OUT_DIR_BASE || './out');
      setCollectionName(env.COLLECTION_NAME || '');
      setIndexingBatchSize(parseInt(env.INDEXING_BATCH_SIZE || '100', 10));
      setIndexingWorkers(parseInt(env.INDEXING_WORKERS || '4', 10));
      setMaxWorkers(parseInt(env.INDEX_MAX_WORKERS || '4', 10));
      setBm25Tokenizer(env.BM25_TOKENIZER || 'stemmer');
      setBm25StemmerLang(env.BM25_STEMMER_LANG || 'english');
      setIndexExcludedExts(env.INDEX_EXCLUDED_EXTS || '.png,.jpg,.gif,.ico,.svg,.woff,.ttf');
      setIndexMaxFileSizeMb(parseInt(env.INDEX_MAX_FILE_SIZE_MB || '10', 10));
      setSkipDense(env.SKIP_DENSE || '0');
      setEnrichChunks(env.ENRICH_CODE_CHUNKS || '0');
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadRepos = async () => {
    try {
      const response = await fetch('/api/repos');
      const data = await response.json();
      if (data.repos && Array.isArray(data.repos)) {
        setRepos(data.repos);
        if (data.repos.length > 0) {
          setSimpleRepo(data.repos[0].name);
          setIndexRepo(data.repos[0].name);
          setCurrentRepo(data.repos[0].name);
          setCurrentBranch(data.repos[0].branch || '—');
        }
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  };

  const loadIndexStats = async () => {
    try {
      const response = await fetch('/api/index/stats');
      const data = await response.json();
      setIndexStats(data);
    } catch (error) {
      console.error('Failed to load index stats:', error);
    }
  };

  const handleSimpleIndex = async () => {
    if (!simpleRepo) {
      alert('Please select a repository');
      return;
    }

    setSimpleRunning(true);
    setSimpleOutput('Starting indexing...\n');

    try {
      const response = await fetch(`/api/index/run?repo=${encodeURIComponent(simpleRepo)}&dense=${simpleDense}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.error) {
        setSimpleOutput(prev => prev + `\nError: ${data.error}\n`);
      } else {
        setSimpleOutput(prev => prev + `\nSuccess! Indexed ${data.chunks || 0} chunks.\n`);
        await loadIndexStats();
      }
    } catch (error) {
      setSimpleOutput(prev => prev + `\nFailed: ${error}\n`);
    } finally {
      setSimpleRunning(false);
    }
  };

  const handleStartIndexing = async () => {
    if (!indexRepo) {
      alert('Please select a repository');
      return;
    }

    setIndexRunning(true);
    setIndexStatus('Starting indexing...\n');
    setIndexProgress(0);

    try {
      const payload = {
        repo: indexRepo,
        skip_dense: parseInt(skipDense, 10),
        enrich: parseInt(enrichChunks, 10),
        embedding_type: embeddingType
      };

      const response = await fetch('/api/index/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        setIndexStatus(prev => prev + `\nError: ${data.error}\n`);
      } else {
        setIndexStatus(prev => prev + `\nIndexing started successfully.\n`);
        pollIndexStatus();
      }
    } catch (error) {
      setIndexStatus(prev => prev + `\nFailed: ${error}\n`);
      setIndexRunning(false);
    }
  };

  const pollIndexStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/index/status');
        const data = await response.json();

        if (data.status) {
          setIndexStatus(data.status);
        }

        if (data.progress !== undefined) {
          setIndexProgress(data.progress);
        }

        if (data.completed || data.error) {
          clearInterval(interval);
          setIndexRunning(false);
          await loadIndexStats();
        }
      } catch (error) {
        console.error('Failed to poll index status:', error);
        clearInterval(interval);
        setIndexRunning(false);
      }
    }, 1000);
  };

  const handleStopIndexing = async () => {
    try {
      await fetch('/api/index/stop', { method: 'POST' });
      setIndexRunning(false);
      setIndexStatus(prev => prev + '\nIndexing stopped by user.\n');
    } catch (error) {
      console.error('Failed to stop indexing:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const config = {
        env: {
          // Embedding settings
          EMBEDDING_TYPE: embeddingType,
          EMBEDDING_MODEL: embeddingModel,
          EMBEDDING_DIM: embeddingDim,
          VOYAGE_MODEL: voyageModel,
          EMBEDDING_MODEL_LOCAL: embeddingModelLocal,
          EMBEDDING_BATCH_SIZE: embeddingBatchSize,
          EMBEDDING_MAX_TOKENS: embeddingMaxTokens,
          EMBEDDING_CACHE_ENABLED: embeddingCacheEnabled,
          EMBEDDING_TIMEOUT: embeddingTimeout,
          EMBEDDING_RETRY_MAX: embeddingRetryMax,
          // Chunking settings
          CHUNK_SIZE: chunkSize,
          CHUNK_OVERLAP: chunkOverlap,
          AST_OVERLAP_LINES: astOverlapLines,
          MAX_CHUNK_SIZE: maxChunkSize,
          MIN_CHUNK_CHARS: minChunkChars,
          GREEDY_FALLBACK_TARGET: greedyFallbackTarget,
          CHUNKING_STRATEGY: chunkingStrategy,
          PRESERVE_IMPORTS: preserveImports,
          // Indexing settings
          COLLECTION_NAME: collectionName,
          INDEXING_BATCH_SIZE: indexingBatchSize,
          INDEXING_WORKERS: indexingWorkers,
          INDEX_MAX_WORKERS: maxWorkers,
          BM25_TOKENIZER: bm25Tokenizer,
          BM25_STEMMER_LANG: bm25StemmerLang,
          INDEX_EXCLUDED_EXTS: indexExcludedExts,
          INDEX_MAX_FILE_SIZE_MB: indexMaxFileSizeMb
        }
      };

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        const error = await response.text();
        alert(`Failed to save settings: ${error}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleApplyProfile = async () => {
    const profiles: Record<string, any> = {
      shared: {
        SKIP_DENSE: '1',
        ENRICH_CODE_CHUNKS: '0',
        BM25_TOKENIZER: 'stemmer'
      },
      full: {
        SKIP_DENSE: '0',
        ENRICH_CODE_CHUNKS: '1',
        BM25_TOKENIZER: 'stemmer'
      },
      dev: {
        SKIP_DENSE: '0',
        ENRICH_CODE_CHUNKS: '0',
        CHUNK_SIZE: 500
      }
    };

    const profile = profiles[activeProfile];
    if (!profile) return;

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: profile })
      });

      if (response.ok) {
        alert(`Applied ${activeProfile} profile`);
        await loadConfig();
      }
    } catch (error) {
      console.error('Failed to apply profile:', error);
    }
  };

  const handleRefreshStats = async () => {
    await loadIndexStats();
  };

  return (
    <>
      {/* Current Repo Display */}
      <div style={{ background: 'var(--bg-elev1)', border: '2px solid var(--ok)', borderRadius: '8px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: '13px', fontFamily: "'SF Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Repo:</span>
          <select
            id="indexing-repo-selector"
            value={currentRepo}
            onChange={(e) => {
              setCurrentRepo(e.target.value);
              const repo = repos.find(r => r.name === e.target.value);
              setCurrentBranch(repo?.branch || '—');
            }}
            style={{ background: 'var(--ok)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: '700', fontFamily: "'SF Mono', monospace", cursor: 'pointer' }}
          >
            {repos.length === 0 ? (
              <option value="">Loading...</option>
            ) : (
              repos.map(repo => (
                <option key={repo.name} value={repo.name}>{repo.name}</option>
              ))
            )}
          </select>
        </div>
        <div style={{ color: 'var(--fg-muted)', fontSize: '11px', fontFamily: "'SF Mono', monospace" }}>
          <span style={{ color: 'var(--fg-muted)' }}>Branch:</span> <span id="indexing-branch-display" style={{ color: 'var(--link)', fontWeight: '600' }}>{currentBranch}</span>
        </div>
      </div>

      {/* ONE SIMPLE INDEX BUTTON */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--ok)', padding: '32px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700' }}>
          Index Repository
        </h2>

        <div style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Repository:</label>
            <select
              id="simple-repo-select"
              value={simpleRepo}
              onChange={(e) => setSimpleRepo(e.target.value)}
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--line)', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--fg)' }}
            >
              {repos.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                repos.map(repo => (
                  <option key={repo.name} value={repo.name}>{repo.name}</option>
                ))
              )}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px' }}>
              <input
                type="checkbox"
                id="simple-dense-check"
                checked={simpleDense}
                onChange={(e) => setSimpleDense(e.target.checked)}
                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600' }}>Include Dense Embeddings (Recommended)</span>
            </label>
            <p style={{ fontSize: '13px', color: 'var(--fg-muted)', margin: '8px 0 0 36px' }}>Enables semantic vector search via Qdrant</p>
          </div>

          <button
            id="simple-index-btn"
            onClick={handleSimpleIndex}
            disabled={simpleRunning}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '20px',
              fontWeight: '700',
              background: simpleRunning ? 'var(--fg-muted)' : 'var(--ok)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: simpleRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,255,136,0.3)'
            }}
          >
            {simpleRunning ? 'INDEXING...' : 'INDEX NOW'}
          </button>

          <pre
            id="simple-output"
            style={{
              display: simpleOutput ? 'block' : 'none',
              marginTop: '24px',
              padding: '20px',
              background: 'var(--code-bg)',
              color: 'var(--code-fg)',
              border: '2px solid var(--line)',
              borderRadius: '8px',
              fontFamily: "'SF Mono', 'Consolas', monospace",
              fontSize: '12px',
              lineHeight: '1.5',
              maxHeight: '600px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          >{simpleOutput}</pre>
        </div>
      </div>

      {/* Indexing Operations */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> Build Index
          <span className="help-icon" data-tooltip="INDEXING_PROCESS">?</span>
        </h3>

        <div className="input-row">
          <div className="input-group">
            <label>Repository to Index</label>
            <select
              id="index-repo-select"
              value={indexRepo}
              onChange={(e) => setIndexRepo(e.target.value)}
              style={{ background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
            >
              {repos.map(repo => (
                <option key={repo.name} value={repo.name}>{repo.name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>
              Embedding Type
              <span className="help-icon" data-tooltip="EMBEDDING_TYPE">?</span>
            </label>
            <select
              name="EMBEDDING_TYPE"
              value={embeddingType}
              onChange={(e) => setEmbeddingType(e.target.value)}
              style={{ background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
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
              value={skipDense}
              onChange={(e) => setSkipDense(e.target.value)}
              style={{ background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
            >
              <option value="0">No (full index)</option>
              <option value="1">Yes (BM25 only, faster)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Enrich Code Chunks</label>
            <select
              id="index-enrich-chunks"
              value={enrichChunks}
              onChange={(e) => setEnrichChunks(e.target.value)}
              style={{ background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
            >
              <option value="0">No (faster indexing)</option>
              <option value="1">Yes (adds summaries + keywords)</option>
            </select>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>Generate AI summaries and extract keywords for each code chunk. Improves semantic search but slower.</p>
          </div>
        </div>

        {/* Index Status */}
        <div className="settings-section" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Index Status</h3>
            <button
              id="btn-refresh-index-stats"
              onClick={handleRefreshStats}
              className="small-button"
              style={{ background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)' }}
            >
              Refresh
            </button>
          </div>
          <div id="index-status-display" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', minHeight: '80px' }}>
            {indexStats ? (
              <>
                <div>Chunks: {indexStats.chunks || 0}</div>
                <div>Vectors: {indexStats.vectors || 0}</div>
                {indexStats.collections && indexStats.collections.length > 0 && (
                  <div>Collections: {indexStats.collections.join(', ')}</div>
                )}
                {indexStats.lastIndexed && (
                  <div>Last Indexed: {indexStats.lastIndexed}</div>
                )}
              </>
            ) : (
              <div>No index data available</div>
            )}
          </div>
        </div>

        <div className="input-row" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="small-button"
            id="btn-index-start"
            onClick={handleStartIndexing}
            disabled={indexRunning}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              padding: '12px',
              fontWeight: '600',
              cursor: indexRunning ? 'not-allowed' : 'pointer',
              opacity: indexRunning ? 0.6 : 1
            }}
          >
            {indexRunning ? 'RUNNING...' : '▶ Start Indexing'}
          </button>
          <button
            className="small-button"
            id="btn-index-stop"
            onClick={handleStopIndexing}
            disabled={!indexRunning}
            style={{
              flex: 1,
              background: 'var(--err)',
              color: 'var(--fg)',
              padding: '12px',
              fontWeight: '600',
              cursor: !indexRunning ? 'not-allowed' : 'pointer',
              opacity: !indexRunning ? 0.6 : 1
            }}
          >
            ■ Stop
          </button>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--accent)' }}>Progress</label>
          <div className="progress" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', height: '24px', overflow: 'hidden' }}>
            <div
              id="index-bar"
              style={{
                height: '100%',
                width: `${indexProgress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--link))',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span id="index-bar-text" style={{ fontSize: '11px', color: 'var(--accent-contrast)', fontWeight: '600', mixBlendMode: 'difference' }}>
                {indexProgress > 0 ? `${indexProgress}%` : ''}
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
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}
          >
            {indexStatus || 'Ready to index...'}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
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
              value={outDirBase}
              disabled
              style={{ background: 'var(--bg-elev1)', cursor: 'not-allowed' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>Where to store index files (chunks, BM25, etc.)</p>
            <p className="small" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
              <strong>Note:</strong> This setting is managed in the <strong>Infrastructure</strong> tab. Value shown here is read-only.
            </p>
          </div>
          <div className="input-group">
            <label>
              Collection Name
              <span className="help-icon" data-tooltip="COLLECTION_NAME">?</span>
            </label>
            <input
              type="text"
              name="COLLECTION_NAME"
              placeholder="code_chunks_{'{repo}'}"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
            <p className="small" style={{ color: 'var(--fg-muted)' }}>Qdrant collection name (leave empty for auto)</p>
          </div>
        </div>

        {/* Embedding Model Picker (NEW - REQUIRED) */}
        <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}>Embedding Models</h4>
        <div className="input-row">
          <div className="input-group">
            <label>
              Embedding Model
              <span className="help-icon" data-tooltip="EMBEDDING_MODEL">?</span>
            </label>
            <input
              type="text"
              id="EMBEDDING_MODEL"
              name="EMBEDDING_MODEL"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>
              Embedding Dimensions
              <span className="help-icon" data-tooltip="EMBEDDING_DIM">?</span>
            </label>
            <input
              type="number"
              id="EMBEDDING_DIM"
              name="EMBEDDING_DIM"
              value={embeddingDim}
              onChange={(e) => setEmbeddingDim(parseInt(e.target.value, 10))}
              min={512}
              max={3072}
              step={256}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Voyage Model
              <span className="help-icon" data-tooltip="VOYAGE_MODEL">?</span>
            </label>
            <input
              type="text"
              id="VOYAGE_MODEL"
              name="VOYAGE_MODEL"
              value={voyageModel}
              onChange={(e) => setVoyageModel(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>
              Local Embedding Model
              <span className="help-icon" data-tooltip="EMBEDDING_MODEL_LOCAL">?</span>
            </label>
            <input
              type="text"
              id="EMBEDDING_MODEL_LOCAL"
              name="EMBEDDING_MODEL_LOCAL"
              value={embeddingModelLocal}
              onChange={(e) => setEmbeddingModelLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Embedding Batch Size
              <span className="help-icon" data-tooltip="EMBEDDING_BATCH_SIZE">?</span>
            </label>
            <input
              type="number"
              id="EMBEDDING_BATCH_SIZE"
              name="EMBEDDING_BATCH_SIZE"
              value={embeddingBatchSize}
              onChange={(e) => setEmbeddingBatchSize(parseInt(e.target.value, 10))}
              min={1}
              max={256}
              step={8}
            />
          </div>
          <div className="input-group">
            <label>
              Embedding Max Tokens
              <span className="help-icon" data-tooltip="EMBEDDING_MAX_TOKENS">?</span>
            </label>
            <input
              type="number"
              id="EMBEDDING_MAX_TOKENS"
              name="EMBEDDING_MAX_TOKENS"
              value={embeddingMaxTokens}
              onChange={(e) => setEmbeddingMaxTokens(parseInt(e.target.value, 10))}
              min={512}
              max={8192}
              step={512}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Embedding Cache Enabled
              <span className="help-icon" data-tooltip="EMBEDDING_CACHE_ENABLED">?</span>
            </label>
            <select
              id="EMBEDDING_CACHE_ENABLED"
              name="EMBEDDING_CACHE_ENABLED"
              value={embeddingCacheEnabled}
              onChange={(e) => setEmbeddingCacheEnabled(e.target.value)}
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Embedding Timeout (seconds)
              <span className="help-icon" data-tooltip="EMBEDDING_TIMEOUT">?</span>
            </label>
            <input
              type="number"
              id="EMBEDDING_TIMEOUT"
              name="EMBEDDING_TIMEOUT"
              value={embeddingTimeout}
              onChange={(e) => setEmbeddingTimeout(parseInt(e.target.value, 10))}
              min={5}
              max={120}
              step={5}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Embedding Retry Max
              <span className="help-icon" data-tooltip="EMBEDDING_RETRY_MAX">?</span>
            </label>
            <input
              type="number"
              id="EMBEDDING_RETRY_MAX"
              name="EMBEDDING_RETRY_MAX"
              value={embeddingRetryMax}
              onChange={(e) => setEmbeddingRetryMax(parseInt(e.target.value, 10))}
              min={1}
              max={5}
              step={1}
            />
          </div>
        </div>

        {/* Chunking Settings */}
        <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}>Chunking Configuration</h4>
        <div className="input-row">
          <div className="input-group">
            <label>
              Chunk Size (tokens)
              <span className="help-icon" data-tooltip="CHUNK_SIZE">?</span>
            </label>
            <input
              type="number"
              name="CHUNK_SIZE"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
              min={100}
              max={4000}
              step={100}
            />
          </div>
          <div className="input-group">
            <label>
              Chunk Overlap (tokens)
              <span className="help-icon" data-tooltip="CHUNK_OVERLAP">?</span>
            </label>
            <input
              type="number"
              name="CHUNK_OVERLAP"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value, 10))}
              min={0}
              max={1000}
              step={50}
            />
          </div>
          <div className="input-group">
            <label>
              Max Workers
              <span className="help-icon" data-tooltip="INDEX_MAX_WORKERS">?</span>
            </label>
            <input
              type="number"
              name="INDEX_MAX_WORKERS"
              value={maxWorkers}
              onChange={(e) => setMaxWorkers(parseInt(e.target.value, 10))}
              min={1}
              max={16}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              AST Overlap Lines
              <span className="help-icon" data-tooltip="AST_OVERLAP_LINES">?</span>
            </label>
            <input
              type="number"
              id="AST_OVERLAP_LINES"
              name="AST_OVERLAP_LINES"
              value={astOverlapLines}
              onChange={(e) => setAstOverlapLines(parseInt(e.target.value, 10))}
              min={0}
              max={100}
              step={5}
            />
          </div>
          <div className="input-group">
            <label>
              Max Chunk Size (bytes)
              <span className="help-icon" data-tooltip="MAX_CHUNK_SIZE">?</span>
            </label>
            <input
              type="number"
              id="MAX_CHUNK_SIZE"
              name="MAX_CHUNK_SIZE"
              value={maxChunkSize}
              onChange={(e) => setMaxChunkSize(parseInt(e.target.value, 10))}
              min={10000}
              max={10000000}
              step={100000}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Min Chunk Chars
              <span className="help-icon" data-tooltip="MIN_CHUNK_CHARS">?</span>
            </label>
            <input
              type="number"
              id="MIN_CHUNK_CHARS"
              name="MIN_CHUNK_CHARS"
              value={minChunkChars}
              onChange={(e) => setMinChunkChars(parseInt(e.target.value, 10))}
              min={10}
              max={500}
              step={10}
            />
          </div>
          <div className="input-group">
            <label>
              Greedy Fallback Target
              <span className="help-icon" data-tooltip="GREEDY_FALLBACK_TARGET">?</span>
            </label>
            <input
              type="number"
              id="GREEDY_FALLBACK_TARGET"
              name="GREEDY_FALLBACK_TARGET"
              value={greedyFallbackTarget}
              onChange={(e) => setGreedyFallbackTarget(parseInt(e.target.value, 10))}
              min={200}
              max={2000}
              step={100}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Chunking Strategy
              <span className="help-icon" data-tooltip="CHUNKING_STRATEGY">?</span>
            </label>
            <select
              id="CHUNKING_STRATEGY"
              name="CHUNKING_STRATEGY"
              value={chunkingStrategy}
              onChange={(e) => setChunkingStrategy(e.target.value)}
            >
              <option value="ast">AST-based</option>
              <option value="greedy">Greedy</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Preserve Imports
              <span className="help-icon" data-tooltip="PRESERVE_IMPORTS">?</span>
            </label>
            <select
              id="PRESERVE_IMPORTS"
              name="PRESERVE_IMPORTS"
              value={preserveImports}
              onChange={(e) => setPreserveImports(e.target.value)}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
        </div>

        {/* Indexing Parameters */}
        <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}>Indexing Parameters</h4>
        <div className="input-row">
          <div className="input-group">
            <label>
              Indexing Batch Size
              <span className="help-icon" data-tooltip="INDEXING_BATCH_SIZE">?</span>
            </label>
            <input
              type="number"
              id="INDEXING_BATCH_SIZE"
              name="INDEXING_BATCH_SIZE"
              value={indexingBatchSize}
              onChange={(e) => setIndexingBatchSize(parseInt(e.target.value, 10))}
              min={10}
              max={1000}
              step={10}
            />
          </div>
          <div className="input-group">
            <label>
              Indexing Workers
              <span className="help-icon" data-tooltip="INDEXING_WORKERS">?</span>
            </label>
            <input
              type="number"
              id="INDEXING_WORKERS"
              name="INDEXING_WORKERS"
              value={indexingWorkers}
              onChange={(e) => setIndexingWorkers(parseInt(e.target.value, 10))}
              min={1}
              max={16}
              step={1}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              BM25 Tokenizer
              <span className="help-icon" data-tooltip="BM25_TOKENIZER">?</span>
            </label>
            <select
              id="BM25_TOKENIZER"
              name="BM25_TOKENIZER"
              value={bm25Tokenizer}
              onChange={(e) => setBm25Tokenizer(e.target.value)}
            >
              <option value="stemmer">Stemmer</option>
              <option value="lowercase">Lowercase</option>
              <option value="whitespace">Whitespace</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              BM25 Stemmer Language
              <span className="help-icon" data-tooltip="BM25_STEMMER_LANG">?</span>
            </label>
            <input
              type="text"
              id="BM25_STEMMER_LANG"
              name="BM25_STEMMER_LANG"
              value={bm25StemmerLang}
              onChange={(e) => setBm25StemmerLang(e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Index Excluded Extensions
              <span className="help-icon" data-tooltip="INDEX_EXCLUDED_EXTS">?</span>
            </label>
            <input
              type="text"
              id="INDEX_EXCLUDED_EXTS"
              name="INDEX_EXCLUDED_EXTS"
              value={indexExcludedExts}
              onChange={(e) => setIndexExcludedExts(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>
              Max File Size (MB)
              <span className="help-icon" data-tooltip="INDEX_MAX_FILE_SIZE_MB">?</span>
            </label>
            <input
              type="number"
              id="INDEX_MAX_FILE_SIZE_MB"
              name="INDEX_MAX_FILE_SIZE_MB"
              value={indexMaxFileSizeMb}
              onChange={(e) => setIndexMaxFileSizeMb(parseInt(e.target.value, 10))}
              min={1}
              max={100}
              step={1}
            />
          </div>
        </div>

        <button
          className="small-button"
          id="btn-save-index-settings"
          onClick={handleSaveSettings}
          style={{ background: 'var(--link)', color: 'var(--accent-contrast)', fontWeight: '600', marginTop: '16px' }}
        >
          Save Settings
        </button>
      </div>

      {/* Index Profiles */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--err)' }}>
        <h3>
          <span style={{ color: 'var(--err)' }}>●</span> Index Profiles
          <span className="help-icon" data-tooltip="INDEX_PROFILES">?</span>
        </h3>

        <div className="input-row">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Active Profile</label>
            <select
              id="index-profile-select"
              value={activeProfile}
              onChange={(e) => setActiveProfile(e.target.value)}
              style={{ background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
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
              style={{ background: 'var(--err)', color: 'var(--fg)', fontWeight: '600', width: '100%' }}
            >
              Apply Profile
            </button>
          </div>
        </div>

        <div id="profile-description" style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '12px', color: 'var(--fg-muted)' }}>
          {activeProfile === 'shared' && 'Fast BM25-only indexing without dense embeddings. No API calls required.'}
          {activeProfile === 'full' && 'Full indexing with BM25 + dense embeddings. Best quality but requires API calls.'}
          {activeProfile === 'dev' && 'Lightweight development profile for testing.'}
        </div>
      </div>
    </>
  );
}
