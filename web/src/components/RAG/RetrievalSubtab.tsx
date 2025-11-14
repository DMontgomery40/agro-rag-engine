// Imported from react/rag-tab-and-modules (96a86e0)
import React, { useEffect, useMemo, useState } from 'react';

type Repo = { name: string };

export function RetrievalSubtab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [repo, setRepo] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [topK, setTopK] = useState<number>(5);
  const [mode, setMode] = useState<'search' | 'answer'>('search');
  const [results, setResults] = useState<any>(null);
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/config');
        const json = await resp.json();
        setConfig(json);
        const defaultRepo = (json.env?.REPO as string) || json.default_repo || (json.repos?.[0]?.name || 'agro');
        setRepo(defaultRepo);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const repos: Repo[] = useMemo(() => config?.repos || [], [config]);

  const run = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('q', query);
      if (repo) params.set('repo', repo);
      if (mode === 'search') params.set('top_k', String(topK));
      const endpoint = mode === 'search' ? `/search?${params}` : `/answer?${params}`;
      const r = await fetch(endpoint);
      const j = await r.json();
      setResults(j);
    } catch (e) {
      setResults({ error: (e as Error).message });
    }
    setBusy(false);
  };

  return (
    <div id="tab-rag-retrieval" className="rag-subtab-content">
      <div className="settings-section">
        <h3>Retrieval</h3>
        <p className="small" style={{ color: 'var(--fg-muted)' }}>
          Run retrieval or full answers against the live API using the selected repository.
        </p>

        <div className="input-row" style={{ gap: 12 }}>
          <div className="input-group">
            <label>Repository</label>
            <select value={repo} onChange={e => setRepo(e.target.value)}>
              {repos.map(r => (<option key={r.name} value={r.name}>{r.name}</option>))}
            </select>
          </div>

          <div className="input-group" style={{ flex: 1 }}>
            <label>Query</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Describe intent (e.g., hybrid search implementation)" />
          </div>

          <div className="input-group">
            <label>Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value as any)}>
              <option value="search">Search (retrieval only)</option>
              <option value="answer">Answer (end-to-end)</option>
            </select>
          </div>

          {mode === 'search' && (
            <div className="input-group">
              <label>Top K</label>
              <input type="number" min={1} max={20} value={topK} onChange={e => setTopK(Number(e.target.value))} />
            </div>
          )}

          <div className="input-group" style={{ alignSelf: 'flex-end' }}>
            <button disabled={busy} onClick={run}>
              {busy ? 'Running…' : (mode === 'search' ? 'Search' : 'Answer')}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section" style={{ display: results ? 'block' : 'none' }}>
        <h3>Results</h3>
        <pre style={{ background: 'var(--code-bg)', border: '1px solid var(--line)', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}
