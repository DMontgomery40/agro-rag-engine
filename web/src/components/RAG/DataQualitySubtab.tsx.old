// Imported from react/rag-tab-and-modules (96a86e0)
// AGRO - RAG Data Quality Subtab
// Repository configuration, Code Cards Builder, and Keyword Management

import { useState, useEffect, useRef } from 'react';

type Repo = { name: string };

declare global {
  interface Window { ReposModule?: { injectRepos?: () => void } }
}

export function DataQualitySubtab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const reposContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/config');
        const json = await resp.json();
        setConfig(json);
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (config && !selectedRepo) {
      const defaultRepo = (config.env?.REPO as string) || config.default_repo || 'agro';
      setSelectedRepo(defaultRepo);
    }
  }, [config, selectedRepo]);

  useEffect(() => {
    if (reposContainerRef.current && window.ReposModule?.injectRepos) {
      window.ReposModule.injectRepos();
    }
  }, [config]);

  const repos: Repo[] = config?.repos || [];
  const currentRepo = repos.find(r => r.name === selectedRepo);

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--fg-muted)' }}>Loading configuration...</div>;
  }

  return (
    <div id="tab-rag-data-quality" className="rag-subtab-content active">
      <div className="settings-section">
        <h3>Repository Configuration</h3>
        <div id="repos-section" ref={reposContainerRef}></div>
      </div>

      {currentRepo && (
        <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>
            <span className="accent-green">●</span> Repository Keywords
          </h3>
          {/* Keyword manager integration can be added here if needed */}
        </div>
      )}

      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>
          <span className="accent-green">●</span> Code Cards Builder & Viewer
        </h3>

        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div className="input-group">
            <label>Repository to Build Cards For</label>
            <select
              id="cards-repo-select"
              style={{ width: '100%' }}
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              {repos.map(repo => (
                <option key={repo.name} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

